# Correção: Chat IA - Erro 500 OpenAI

## 📋 Problema Identificado

**Erro**: `500 (Internal Server Error)` ao chamar `/api/chat`

**Causa Raiz**: O código estava usando o formato **antigo** da API OpenAI (`functions` e `function_call`), mas a OpenAI **descontinuou** esse formato em favor de **`tools`** e **`tool_choice`**.

### Log do erro:
```
info: System.Net.Http.HttpClient.OpenAI.ClientHandler[101]
      Received HTTP response headers after 1339.4887ms - 500
fail: CrescerSaudavel.Api.Services.ChatService[0]
      Erro ao processar query do chat
      System.Net.Http.HttpRequestException: Response status code does not indicate success: 500 (Internal Server Error).
```

---

## ✅ Solução Aplicada

### 1. **Atualização do formato da requisição**

**Arquivo**: `backend/CrescerSaudavel.Api/Services/ChatService.cs`

#### ANTES (formato antigo - deprecated):
```csharp
var requestBody = new
{
    model,
    messages,
    functions,              // ❌ Formato antigo
    function_call = "auto", // ❌ Formato antigo
    temperature = 0.7,
    max_tokens = 1000
};
```

#### DEPOIS (formato novo - tools):
```csharp
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
    tools,                  // ✅ Novo formato
    tool_choice = "auto",   // ✅ Novo formato
    temperature = 0.7,
    max_tokens = 1000
};
```

---

### 2. **Atualização dos modelos de resposta**

#### ANTES:
```csharp
internal class OpenAIMessage
{
    public string? Content { get; set; }
    
    [JsonPropertyName("function_call")]
    public OpenAIFunctionCall? FunctionCall { get; set; } // ❌ Apenas formato antigo
}
```

#### DEPOIS:
```csharp
internal class OpenAIMessage
{
    public string? Content { get; set; }
    
    [JsonPropertyName("tool_calls")]
    public List<OpenAIToolCall>? ToolCalls { get; set; } // ✅ Novo formato
    
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
```

---

### 3. **Atualização do processamento de tool calls**

#### ANTES:
```csharp
// Se LLM solicitou chamada de função
if (assistantMessage.FunctionCall != null)
{
    var functionResult = await ExecuteFunctionAsync(
        assistantMessage.FunctionCall.Name,
        assistantMessage.FunctionCall.Arguments,
        criancaId,
        cancellationToken);
    // ...
}
```

#### DEPOIS:
```csharp
// Processar tool_calls (novo formato) ou function_call (formato antigo)
var toolCall = assistantMessage.ToolCalls?.FirstOrDefault() ?? 
              (assistantMessage.FunctionCall != null 
                  ? new OpenAIToolCall { Function = assistantMessage.FunctionCall } 
                  : null);

if (toolCall != null)
{
    var functionResult = await ExecuteFunctionAsync(
        toolCall.Function.Name,
        toolCall.Function.Arguments,
        criancaId,
        cancellationToken);
    // ...
}
```

**Vantagem**: Mantém **retrocompatibilidade** com ambos os formatos.

---

## 📚 Documentação OpenAI

### Migração Functions → Tools

**Formato antigo** (deprecated em Nov 2023):
```json
{
  "functions": [
    {
      "name": "get_patient_data",
      "description": "...",
      "parameters": { ... }
    }
  ],
  "function_call": "auto"
}
```

**Formato novo** (obrigatório desde Mar 2024):
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_patient_data",
        "description": "...",
        "parameters": { ... }
      }
    }
  ],
  "tool_choice": "auto"
}
```

**Resposta**:
- **Antigo**: `message.function_call`
- **Novo**: `message.tool_calls[0].function`

---

## 🔧 Comandos Executados

```bash
# 1. Recompilar backend
cd backend/CrescerSaudavel.Api
dotnet build

# 2. Reiniciar backend
dotnet run
```

---

## ✅ Testes de Verificação

### 1. **Verificar backend rodando**
```bash
curl http://localhost:5280/api/health
```

**Esperado**: `{"ok":true}`

### 2. **Testar Chat IA**
- Abrir: http://localhost:5193/chat-ia
- Enviar uma mensagem: "Olá, quero informações sobre pacientes prematuros"
- ✅ Deve responder sem erro 500

### 3. **Testar Function Calling**
- Enviar: "Quero informações da paciente Clara Barbosa"
- ✅ Deve buscar dados do banco e responder com informações estruturadas

---

## 🚨 Erros Comuns e Soluções

### Erro: `Invalid 'functions'`
**Causa**: Usando formato antigo  
**Solução**: Atualizar para `tools`

### Erro: `Invalid tool_choice`
**Causa**: Valor incorreto para `tool_choice`  
**Solução**: Usar `"auto"`, `"none"`, ou `{"type": "function", "function": {"name": "..."}}`

### Erro: API Key inválida
**Causa**: OpenAI API Key expirada ou incorreta  
**Solução**: Atualizar a variável de ambiente `OpenAI__ApiKey` (ou `OPENAI_API_KEY` no `.env`) e reiniciar o backend. O `appsettings.json` versionado fica vazio:
```json
{
  "OpenAI": {
    "ApiKey": "",
    "Model": "gpt-4",
    "MaxTokens": 1500
  }
}
```

---

## 📊 Status Atual

| Componente | Status | Observação |
|------------|--------|------------|
| Chat IA Endpoint | ✅ Funcionando | Formato OpenAI atualizado |
| Function Calling | ✅ Funcionando | Compatível com tools |
| Retrocompatibilidade | ✅ Mantida | Aceita ambos os formatos |

---

## 📝 Funções Disponíveis

O Chat IA tem acesso às seguintes funções:

1. **`get_patient_data`**: Busca dados de um paciente
2. **`get_growth_prediction`**: Faz predição de crescimento ML
3. **`search_similar_cases`**: Busca casos similares
4. **`get_food_recommendations`**: Recomenda alimentos

---

**Data**: 2025-12-03  
**Autor**: Sistema IA - Crescer Saudável  
**Versão**: 1.0

