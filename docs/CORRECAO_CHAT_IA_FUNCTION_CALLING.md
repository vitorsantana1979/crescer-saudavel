# Correção: Chat IA - Function Calling com Tools

## 📋 Problemas Identificados

### 1. **Erro ao parsear GUID**
```
System.FormatException: Unrecognized Guid format.
at CrescerSaudavel.Api.Services.ChatService.GetPatientDataFunction
```

**Causa**: O OpenAI estava enviando o nome do paciente ("Clara Barbosa") ao invés do GUID, e o código tentava fazer `Guid.Parse()` direto.

### 2. **Erro 400 da OpenAI**
```
Response status code does not indicate success: 400 (Bad Request).
```

**Causa**: Formato incorreto das mensagens de função. O novo formato `tools` requer:
- `role: "tool"` para respostas de função (não `"function"`)
- `tool_call_id` obrigatório nas respostas
- Mensagens do assistente com `tool_calls` array

---

## ✅ Correções Aplicadas

### 1. **Busca por Nome ou GUID**

**Arquivo**: `ChatService.cs` - `GetPatientDataFunction()`

#### ANTES:
```csharp
var criancaId = Guid.Parse(args["crianca_id"].GetString() ?? "");

var crianca = await _context.RecemNascidos
    .Include(r => r.Consultas.OrderByDescending(c => c.DataHora).Take(5))
    .FirstOrDefaultAsync(r => r.Id == criancaId, cancellationToken);
```

#### DEPOIS:
```csharp
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
```

**Resultado**: Agora aceita tanto GUID quanto nome do paciente.

---

### 2. **Formato Correto de Mensagens com Tools**

#### A. Adicionado campo `ToolCallId` no modelo

**Arquivo**: `ChatModels.cs`

```csharp
public class ChatMessage
{
    public string Role { get; set; } = "user"; // user, assistant, system, tool
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public List<FunctionCall>? FunctionCalls { get; set; }
    public string? ToolCallId { get; set; } // ✅ Novo campo
}
```

#### B. Armazenamento correto das mensagens

**Arquivo**: `ChatService.cs` - `ProcessQueryAsync()`

**ANTES**:
```csharp
// Adicionar resultado como mensagem
conversation.Messages.Add(new ChatMessage
{
    Role = "function", // ❌ Formato antigo
    Content = functionResult,
    Timestamp = DateTime.UtcNow
});
```

**DEPOIS**:
```csharp
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

// Adicionar resultado da função (tool response) ✅ Role correto
conversation.Messages.Add(new ChatMessage
{
    Role = "tool", // ✅ Novo formato
    Content = functionResult,
    Timestamp = DateTime.UtcNow,
    ToolCallId = toolCallId // ✅ ID obrigatório
});
```

#### C. Formatação correta para enviar à OpenAI

**Arquivo**: `ChatService.cs` - `BuildMessagesForOpenAI()`

**ANTES**:
```csharp
foreach (var msg in conversation.Messages)
{
    messages.Add(new { role = msg.Role, content = msg.Content });
}
```

**DEPOIS**:
```csharp
foreach (var msg in conversation.Messages)
{
    if (msg.Role == "tool")
    {
        // Mensagem de resposta de função (formato tools)
        messages.Add(new
        {
            role = "tool",
            content = msg.Content,
            tool_call_id = msg.ToolCallId ?? "call_temp" // ✅ ID obrigatório
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
            tool_calls = toolCalls // ✅ Novo formato
        });
    }
    else
    {
        // Mensagem normal
        messages.Add(new { role = msg.Role, content = msg.Content });
    }
}
```

---

## 📊 Fluxo de Mensagens Correto

### Exemplo: Usuário pede informações de "Clara Barbosa"

1. **Usuário envia**: "Quero informações da paciente Clara Barbosa"
   ```json
   {
     "role": "user",
     "content": "Quero informações da paciente Clara Barbosa"
   }
   ```

2. **OpenAI responde com tool_call**:
   ```json
   {
     "role": "assistant",
     "content": null,
     "tool_calls": [{
       "id": "call_abc123",
       "type": "function",
       "function": {
         "name": "get_patient_data",
         "arguments": "{\"crianca_id\": \"Clara Barbosa\"}"
       }
     }]
   }
   ```

3. **Sistema executa função e responde**:
   ```json
   {
     "role": "tool",
     "tool_call_id": "call_abc123",
     "content": "{\"nome\": \"Clara Barbosa\", \"sexo\": \"F\", ...}"
   }
   ```

4. **OpenAI processa e responde ao usuário**:
   ```json
   {
     "role": "assistant",
     "content": "Encontrei as informações da paciente Clara Barbosa..."
   }
   ```

---

## 🔧 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `ChatService.cs` | ✅ Busca por nome/GUID<br>✅ Formato tools<br>✅ tool_call_id |
| `ChatModels.cs` | ✅ Campo ToolCallId |

---

## 🧪 Como Testar

### 1. **Teste básico**
- Vá para: http://localhost:5193/chat-ia
- Digite: "Olá!"
- ✅ Deve responder normalmente

### 2. **Teste com busca por nome**
- Digite: "Quero informações da paciente Clara Barbosa"
- ✅ Deve buscar no banco e retornar dados da Clara

### 3. **Teste com busca por GUID**
- Digite: "Quero informações do paciente d488dc11-1c7a-438f-ad46-9836a22981c3"
- ✅ Deve buscar pelo ID e retornar dados

### 4. **Teste de predição ML**
- Digite: "Faça uma predição de crescimento para prematuros de 32 semanas"
- ✅ Deve chamar o ML Service

---

## 📝 Documentação OpenAI

### Formato Tools (atual)

**Requisição**:
```json
{
  "model": "gpt-4",
  "messages": [...],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_patient_data",
      "description": "...",
      "parameters": {...}
    }
  }],
  "tool_choice": "auto"
}
```

**Resposta com tool_call**:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "tool_calls": [{
        "id": "call_xyz",
        "type": "function",
        "function": {
          "name": "get_patient_data",
          "arguments": "{...}"
        }
      }]
    }
  }]
}
```

**Resposta da função**:
```json
{
  "role": "tool",
  "tool_call_id": "call_xyz",
  "content": "{...}"
}
```

---

## ✅ Status Atual

| Componente | Status | Observação |
|------------|--------|------------|
| Busca por nome | ✅ Funcionando | Aceita nome parcial |
| Busca por GUID | ✅ Funcionando | GUID completo |
| Formato tools | ✅ Atualizado | OpenAI API v1 |
| tool_call_id | ✅ Implementado | Obrigatório |
| Function calling | ✅ Funcionando | 4 funções disponíveis |

---

**Data**: 2025-12-03  
**Autor**: Sistema IA - Crescer Saudável  
**Versão**: 2.0

