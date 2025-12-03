using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Models.ML;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Services;

/// <summary>
/// Serviço de chat com LLM (OpenAI) para análise clínica
/// </summary>
public class ChatService
{
    private readonly HttpClient _openAIClient;
    private readonly MLService _mlService;
    private readonly CrescerSaudavelDbContext _context;
    private readonly ILogger<ChatService> _logger;
    private readonly IConfiguration _config;

    // Cache de conversas em memória (produção deveria usar Redis ou similar)
    private static readonly Dictionary<Guid, Conversation> _conversations = new();

    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public ChatService(
        IHttpClientFactory httpClientFactory,
        MLService mlService,
        CrescerSaudavelDbContext context,
        ILogger<ChatService> logger,
        IConfiguration config)
    {
        _openAIClient = httpClientFactory.CreateClient("OpenAI");
        _mlService = mlService;
        _context = context;
        _logger = logger;
        _config = config;

        // Configurar OpenAI client
        var apiKey = _config["OpenAI:ApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _openAIClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        }
    }

    /// <summary>
    /// Processa query do usuário e retorna resposta do LLM
    /// </summary>
    public async Task<ChatResponse> ProcessQueryAsync(
        string userMessage,
        Guid? criancaId = null,
        Guid? conversationId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Obter ou criar conversa
            var conversation = GetOrCreateConversation(conversationId, criancaId);

            // Adicionar mensagem do usuário
            conversation.Messages.Add(new ChatMessage
            {
                Role = "user",
                Content = userMessage,
                Timestamp = DateTime.UtcNow
            });

            // Preparar mensagens para OpenAI
            var messages = BuildMessagesForOpenAI(conversation, criancaId);

            // Definir funções disponíveis
            var functions = GetAvailableFunctions();

            // Chamar OpenAI (novo formato com tools)
            var model = _config["OpenAI:Model"] ?? "gpt-4";

            // Converter functions para tools (novo formato OpenAI)
            var tools = functions.Select(f => new
            {
                type = "function",
                function = f
            }).ToList();

            var requestBody = new
            {
                model,
                messages,
                tools,
                tool_choice = "auto",
                temperature = 0.7,
                max_tokens = _config.GetValue<int>("OpenAI:MaxTokens", 1000)
            };

            var json = JsonSerializer.Serialize(requestBody, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _openAIClient.PostAsync(
                "https://api.openai.com/v1/chat/completions",
                content,
                cancellationToken);

            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<OpenAIResponse>(responseJson, _jsonOptions);

            if (result?.Choices == null || result.Choices.Count == 0)
                throw new Exception("Resposta inválida da OpenAI");

            var choice = result.Choices[0];
            var assistantMessage = choice.Message;

            // Processar tool_calls (novo formato) ou function_call (formato antigo)
            var toolCall = assistantMessage.ToolCalls?.FirstOrDefault() ??
                          (assistantMessage.FunctionCall != null
                              ? new OpenAIToolCall { Function = assistantMessage.FunctionCall }
                              : null);

            if (toolCall != null)
            {
                // Executar função
                var functionResult = await ExecuteFunctionAsync(
                    toolCall.Function.Name,
                    toolCall.Function.Arguments,
                    criancaId,
                    cancellationToken);

                // Gerar tool_call_id
                var toolCallId = toolCall.Id ?? $"call_{Guid.NewGuid().ToString().Substring(0, 8)}";

                // Adicionar chamada do assistente (tool_call)
                conversation.Messages.Add(new ChatMessage
                {
                    Role = "assistant",
                    Content = assistantMessage.Content ?? "",
                    Timestamp = DateTime.UtcNow,
                    ToolCallId = toolCallId,
                    FunctionCalls = new List<FunctionCall>
                    {
                        new()
                        {
                            Name = toolCall.Function.Name,
                            Arguments = toolCall.Function.Arguments,
                            Result = functionResult
                        }
                    }
                });

                // Adicionar resultado da função (tool response)
                conversation.Messages.Add(new ChatMessage
                {
                    Role = "tool",
                    Content = functionResult,
                    Timestamp = DateTime.UtcNow,
                    ToolCallId = toolCallId
                });

                // Chamar OpenAI novamente com o resultado da função
                return await ProcessQueryAsync("", criancaId, conversation.Id, cancellationToken);
            }

            // Adicionar resposta do assistente
            var finalMessage = new ChatMessage
            {
                Role = "assistant",
                Content = assistantMessage.Content ?? string.Empty,
                Timestamp = DateTime.UtcNow
            };

            conversation.Messages.Add(finalMessage);
            conversation.UpdatedAt = DateTime.UtcNow;

            return new ChatResponse(
                finalMessage,
                conversation.Id,
                model
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao processar query do chat");
            throw;
        }
    }

    private Conversation GetOrCreateConversation(Guid? conversationId, Guid? criancaId)
    {
        if (conversationId.HasValue && _conversations.ContainsKey(conversationId.Value))
        {
            return _conversations[conversationId.Value];
        }

        var conversation = new Conversation
        {
            Id = conversationId ?? Guid.NewGuid(),
            CriancaId = criancaId
        };

        _conversations[conversation.Id] = conversation;
        return conversation;
    }

    private List<object> BuildMessagesForOpenAI(Conversation conversation, Guid? criancaId)
    {
        var messages = new List<object>();

        // Mensagem do sistema com contexto
        var systemMessage = @"Você é um assistente especializado em nutrição neonatal e pediátrica.
Seu papel é ajudar profissionais de saúde a analisar dados de crescimento de recém-nascidos e crianças,
e sugerir estratégias de dietoterapia baseadas em dados históricos.

IMPORTANTE:
- Suas sugestões são baseadas em análise de dados, NÃO substituem julgamento clínico
- Sempre inclua avisos sobre consultar a equipe médica
- Use linguagem técnica apropriada para profissionais de saúde
- Seja claro sobre limitações dos modelos preditivos

Você tem acesso às seguintes funções para consultar dados:
- get_patient_data: Busca dados completos de um paciente
- get_growth_prediction: Faz predição de crescimento para um cenário
- get_similar_cases: Busca casos similares com bons resultados
- query_statistics: Consulta estatísticas gerais do sistema";

        messages.Add(new { role = "system", content = systemMessage });

        // Adicionar mensagens da conversa
        foreach (var msg in conversation.Messages)
        {
            if (msg.Role == "tool")
            {
                // Mensagem de resposta de função (formato tools)
                messages.Add(new
                {
                    role = "tool",
                    content = msg.Content,
                    tool_call_id = msg.ToolCallId ?? "call_temp"
                });
            }
            else if (msg.Role == "assistant" && msg.FunctionCalls != null && msg.FunctionCalls.Count > 0)
            {
                // Mensagem do assistente com chamada de função
                var toolCalls = msg.FunctionCalls.Select(fc => new
                {
                    id = msg.ToolCallId ?? $"call_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    type = "function",
                    function = new
                    {
                        name = fc.Name,
                        arguments = fc.Arguments
                    }
                }).ToList();

                messages.Add(new
                {
                    role = "assistant",
                    content = msg.Content,
                    tool_calls = toolCalls
                });
            }
            else
            {
                // Mensagem normal
                messages.Add(new { role = msg.Role, content = msg.Content });
            }
        }

        return messages;
    }

    private List<object> GetAvailableFunctions()
    {
        return new List<object>
        {
            new
            {
                name = "get_patient_data",
                description = "Obtém dados completos de um paciente (dados demográficos, antropométricos, histórico)",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        crianca_id = new
                        {
                            type = "string",
                            description = "ID do paciente (GUID)"
                        }
                    },
                    required = new[] { "crianca_id" }
                }
            },
            new
            {
                name = "get_growth_prediction",
                description = "Faz predição de crescimento (Δ z-score) para um cenário de dieta",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        crianca_id = new { type = "string" },
                        taxa_energia = new { type = "number", description = "Taxa energética (kcal/kg/dia)" },
                        meta_proteina = new { type = "number", description = "Meta proteica (g/kg/dia)" }
                    },
                    required = new[] { "crianca_id", "taxa_energia", "meta_proteina" }
                }
            },
            new
            {
                name = "get_similar_cases",
                description = "Busca casos similares com bons resultados",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        crianca_id = new { type = "string" },
                        limit = new { type = "integer", description = "Número de casos (máx 20)" }
                    },
                    required = new[] { "crianca_id" }
                }
            },
            new
            {
                name = "query_statistics",
                description = "Consulta estatísticas gerais do sistema (total de pacientes, médias, etc)",
                parameters = new
                {
                    type = "object",
                    properties = new Dictionary<string, object>()
                }
            }
        };
    }

    private async Task<string> ExecuteFunctionAsync(
        string functionName,
        string argumentsJson,
        Guid? criancaId,
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Executando função: {FunctionName}", functionName);

            var arguments = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(argumentsJson);

            return functionName switch
            {
                "get_patient_data" => await GetPatientDataFunction(arguments, cancellationToken),
                "get_growth_prediction" => await GetGrowthPredictionFunction(arguments, cancellationToken),
                "get_similar_cases" => await GetSimilarCasesFunction(arguments, cancellationToken),
                "query_statistics" => await QueryStatisticsFunction(cancellationToken),
                _ => JsonSerializer.Serialize(new { error = "Função não encontrada" })
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao executar função {FunctionName}", functionName);
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    private async Task<string> GetPatientDataFunction(
        Dictionary<string, JsonElement>? args,
        CancellationToken cancellationToken)
    {
        if (args == null || !args.ContainsKey("crianca_id"))
            return JsonSerializer.Serialize(new { error = "crianca_id não fornecido" });

        var criancaIdStr = args["crianca_id"].GetString() ?? "";

        RecemNascido? crianca = null;

        // Tentar como GUID primeiro
        if (Guid.TryParse(criancaIdStr, out var criancaId))
        {
            crianca = await _context.RecemNascidos
                .Include(r => r.Consultas.OrderByDescending(c => c.DataHora).Take(5))
                .FirstOrDefaultAsync(r => r.Id == criancaId, cancellationToken);
        }

        // Se não encontrou, tentar buscar por nome
        if (crianca == null)
        {
            crianca = await _context.RecemNascidos
                .Include(r => r.Consultas.OrderByDescending(c => c.DataHora).Take(5))
                .FirstOrDefaultAsync(r => r.Nome.Contains(criancaIdStr), cancellationToken);
        }

        if (crianca == null)
            return JsonSerializer.Serialize(new { error = $"Paciente '{criancaIdStr}' não encontrado" });

        var result = new
        {
            id = crianca.Id,
            nome = crianca.Nome,
            sexo = crianca.Sexo,
            idade_gestacional_semanas = crianca.IdadeGestacionalSemanas,
            peso_nascimento_gr = crianca.PesoNascimentoGr,
            classificacao_ig = crianca.ClassificacaoIG,
            classificacao_peso = crianca.ClassificacaoPN,
            consultas_recentes = crianca.Consultas.Select(c => new
            {
                data = c.DataHora,
                peso_kg = c.PesoKg,
                zscore_peso = c.ZScorePeso
            })
        };

        return JsonSerializer.Serialize(result, _jsonOptions);
    }

    private async Task<string> GetGrowthPredictionFunction(
        Dictionary<string, JsonElement>? args,
        CancellationToken cancellationToken)
    {
        if (args == null || !args.ContainsKey("crianca_id"))
            return JsonSerializer.Serialize(new { error = "Parâmetros inválidos" });

        var criancaId = Guid.Parse(args["crianca_id"].GetString() ?? "");
        var taxaEnergia = args["taxa_energia"].GetDouble();
        var metaProteina = args["meta_proteina"].GetDouble();

        var cenario = new DietScenario
        {
            TaxaEnergeticaKcalKg = taxaEnergia,
            MetaProteinaGKg = metaProteina,
            FrequenciaHoras = 3.0
        };

        var prediction = await _mlService.PredictGrowthAsync(criancaId, cenario, 14, cancellationToken);

        return JsonSerializer.Serialize(prediction, _jsonOptions);
    }

    private async Task<string> GetSimilarCasesFunction(
        Dictionary<string, JsonElement>? args,
        CancellationToken cancellationToken)
    {
        if (args == null || !args.ContainsKey("crianca_id"))
            return JsonSerializer.Serialize(new { error = "crianca_id não fornecido" });

        var criancaId = Guid.Parse(args["crianca_id"].GetString() ?? "");
        var limit = args.ContainsKey("limit") ? args["limit"].GetInt32() : 10;

        var cases = await _mlService.GetSimilarCasesAsync(criancaId, limit, cancellationToken);

        return JsonSerializer.Serialize(cases, _jsonOptions);
    }

    private async Task<string> QueryStatisticsFunction(CancellationToken cancellationToken)
    {
        var stats = await _mlService.GetStatisticsAsync(cancellationToken);
        return JsonSerializer.Serialize(stats, _jsonOptions);
    }
}

// ==================== OPENAI RESPONSE MODELS ====================

internal class OpenAIResponse
{
    public List<OpenAIChoice> Choices { get; set; } = new();
}

internal class OpenAIChoice
{
    public OpenAIMessage Message { get; set; } = new();
}

internal class OpenAIMessage
{
    public string? Content { get; set; }

    [JsonPropertyName("tool_calls")]
    public List<OpenAIToolCall>? ToolCalls { get; set; }

    // Manter compatibilidade com formato antigo (deprecated)
    [JsonPropertyName("function_call")]
    public OpenAIFunctionCall? FunctionCall { get; set; }
}

internal class OpenAIToolCall
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "function";
    public OpenAIFunctionCall Function { get; set; } = new();
}

internal class OpenAIFunctionCall
{
    public string Name { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
}

