namespace CrescerSaudavel.Api.Models.ML;

/// <summary>
/// Mensagem no chat
/// </summary>
public class ChatMessage
{
    public string Role { get; set; } = "user"; // user, assistant, system, function
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public List<FunctionCall>? FunctionCalls { get; set; }
}

/// <summary>
/// Chamada de função pelo LLM
/// </summary>
public class FunctionCall
{
    public string Name { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string? Result { get; set; }
}

/// <summary>
/// Conversa (histórico de mensagens)
/// </summary>
public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? CriancaId { get; set; }
    public List<ChatMessage> Messages { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// ==================== REQUEST/RESPONSE MODELS ====================

public record ChatRequest(
    string Message,
    Guid? CriancaId = null,
    Guid? ConversationId = null
);

public record ChatResponse(
    ChatMessage Message,
    Guid ConversationId,
    string ModelUsed
);

