using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CrescerSaudavel.Api.Models.ML;

namespace CrescerSaudavel.Api.Services;

/// <summary>
/// Serviço para integração com microserviço de ML (Python)
/// </summary>
public class MLService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MLService> _logger;
    private readonly IConfiguration _config;

    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = null, // Não converter - manter snake_case para Python
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public MLService(HttpClient httpClient, ILogger<MLService> logger, IConfiguration config)
    {
        _httpClient = httpClient;
        _logger = logger;
        _config = config;

        // Configurar base URL do serviço de ML
        var baseUrl = _config["MLService:BaseUrl"] ?? "http://ml-service:8000";
        _httpClient.BaseAddress = new Uri(baseUrl);

        // Configurar timeout
        var timeout = _config.GetValue<int>("MLService:Timeout", 30);
        _httpClient.Timeout = TimeSpan.FromSeconds(timeout);
    }

    /// <summary>
    /// Faz predição de crescimento para um cenário de dieta
    /// </summary>
    public async Task<PredictionResponse> PredictGrowthAsync(
        Guid criancaId,
        DietScenario scenario,
        int horizonDays = 14,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new
            {
                crianca_id = criancaId,
                dieta_cenario = new
                {
                    taxa_energetica_kcal_kg = scenario.TaxaEnergeticaKcalKg,
                    meta_proteina_g_kg = scenario.MetaProteinaGKg,
                    frequencia_horas = scenario.FrequenciaHoras,
                    peso_referencia_kg = scenario.PesoReferenciaKg
                },
                horizonte_dias = horizonDays
            };

            var json = JsonSerializer.Serialize(request, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Chamando ML service para predição: criança {CriancaId}", criancaId);

            var response = await _httpClient.PostAsync("/api/v1/predictions/growth", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

            // DEBUG: Log do JSON bruto
            _logger.LogInformation("JSON bruto recebido do Python ML Service: {ResponseJson}", responseJson.Length > 500 ? responseJson.Substring(0, 500) + "..." : responseJson);

            var result = JsonSerializer.Deserialize<PredictionResponse>(responseJson, _jsonOptions);

            if (result == null)
                throw new InvalidOperationException("Resposta inválida do serviço de ML");

            _logger.LogInformation("Predição concluída: Δ Z-Score = {DeltaZScore}, Probabilidade Melhora = {ProbMelhora}, Confiabilidade = {Conf}",
                result.Predicao.DeltaZscorePred, result.Predicao.ProbabilidadeMelhora, result.Predicao.Confiabilidade);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro ao chamar serviço de ML");
            throw new Exception("Erro ao conectar ao serviço de predição", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Erro ao deserializar resposta do ML");
            throw new Exception("Erro ao processar resposta do serviço de predição", ex);
        }
    }

    /// <summary>
    /// Compara múltiplos cenários de dieta
    /// </summary>
    public async Task<ComparisonResponse> CompareDietsAsync(
        Guid criancaId,
        List<DietScenario> scenarios,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new
            {
                crianca_id = criancaId,
                cenarios = scenarios.Select(s => new
                {
                    taxa_energetica_kcal_kg = s.TaxaEnergeticaKcalKg,
                    meta_proteina_g_kg = s.MetaProteinaGKg,
                    frequencia_horas = s.FrequenciaHoras,
                    peso_referencia_kg = s.PesoReferenciaKg
                }).ToList()
            };

            var json = JsonSerializer.Serialize(request, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Comparando {Count} cenários para criança {CriancaId}", scenarios.Count, criancaId);

            var response = await _httpClient.PostAsync("/api/v1/predictions/compare-diets", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<ComparisonResponse>(responseJson, _jsonOptions);

            if (result == null)
                throw new InvalidOperationException("Resposta inválida do serviço de ML");

            _logger.LogInformation("Comparação concluída: melhor cenário tem score {Score}",
                result.Comparacoes.FirstOrDefault()?.Score ?? 0);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro ao chamar serviço de ML");
            throw new Exception("Erro ao conectar ao serviço de comparação", ex);
        }
    }

    /// <summary>
    /// Busca casos similares no histórico
    /// </summary>
    public async Task<List<SimilarCase>> GetSimilarCasesAsync(
        Guid criancaId,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Buscando casos similares para criança {CriancaId}", criancaId);

            var response = await _httpClient.GetAsync(
                $"/api/v1/analytics/similar-cases/{criancaId}?limit={limit}",
                cancellationToken);

            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<List<SimilarCase>>(responseJson, _jsonOptions);

            if (result == null)
                return new List<SimilarCase>();

            _logger.LogInformation("Encontrados {Count} casos similares", result.Count);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro ao buscar casos similares");
            throw new Exception("Erro ao buscar casos similares", ex);
        }
    }

    /// <summary>
    /// Obtém estatísticas gerais do sistema
    /// </summary>
    public async Task<AnalyticsStats> GetStatisticsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("/api/v1/analytics/stats", cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<AnalyticsStats>(responseJson, _jsonOptions);

            if (result == null)
                throw new InvalidOperationException("Resposta inválida do serviço de ML");

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro ao obter estatísticas");
            throw new Exception("Erro ao obter estatísticas", ex);
        }
    }

    /// <summary>
    /// Verifica se o serviço de ML está online
    /// </summary>
    public async Task<bool> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("/health", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Solicita re-treinamento dos modelos
    /// </summary>
    public async Task<object> RetrainModelsAsync(
        int horizonteDias = 14,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Solicitando re-treinamento dos modelos");

            var response = await _httpClient.PostAsync(
                $"/api/v1/analytics/retrain?horizonte_dias={horizonteDias}",
                null,
                cancellationToken);

            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<object>(responseJson, _jsonOptions);

            _logger.LogInformation("Re-treinamento concluído");

            return result ?? new { };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro ao solicitar re-treinamento");
            throw new Exception("Erro ao solicitar re-treinamento", ex);
        }
    }

    /// <summary>
    /// Recomenda alimentos baseado em ML
    /// </summary>
    public async Task<Models.Analytics.FoodRecommendationResponse> RecommendFoodsAsync(
        Models.Analytics.FoodRecommendationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                perfil = new
                {
                    idade_gestacional_semanas = request.Perfil.IdadeGestacionalSemanas,
                    peso_atual_gr = request.Perfil.PesoAtualGr,
                    sexo = request.Perfil.Sexo,
                    classificacao_ig = request.Perfil.ClassificacaoIG,
                    classificacao_peso = request.Perfil.ClassificacaoPeso,
                    zscore_atual = request.Perfil.ZScoreAtual,
                    dias_de_vida = request.Perfil.DiasDeVida
                },
                top_n = request.TopN
            };

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Solicitando recomendação de alimentos para perfil IG={IG}, Peso={Peso}g",
                request.Perfil.IdadeGestacionalSemanas, request.Perfil.PesoAtualGr);

            var response = await _httpClient.PostAsync(
                "/api/v1/analytics/food-recommendation",
                content,
                cancellationToken);

            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<Models.Analytics.FoodRecommendationResponse>(
                responseJson, _jsonOptions);

            if (result == null)
                throw new InvalidOperationException("Resposta inválida do serviço de ML");

            _logger.LogInformation("Recomendação concluída: {Count} alimentos sugeridos",
                result.AlimentosRecomendados.Count);

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro ao chamar serviço de recomendação de alimentos");
            throw new Exception("Erro ao conectar ao serviço de recomendação", ex);
        }
    }
}

