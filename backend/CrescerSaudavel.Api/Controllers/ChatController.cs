using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CrescerSaudavel.Api.Models.ML;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Time;

namespace CrescerSaudavel.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly ILogger<ChatController> _logger;
    private readonly ICurrentUserService _currentUserService;

    public ChatController(
        ChatService chatService,
        ILogger<ChatController> logger,
        ICurrentUserService currentUserService)
    {
        _chatService = chatService;
        _logger = logger;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Envia mensagem para o assistente de IA
    /// </summary>
    /// <param name="request">Mensagem e contexto</param>
    [HttpPost]
    [ProducesResponseType(typeof(ChatResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { message = "Mensagem não pode ser vazia" });

            if (_currentUserService.UserId == null)
                return Unauthorized();

            _logger.LogInformation(
                "Usuário {UserId} enviou mensagem para chat: {Message}",
                _currentUserService.UserId,
                request.Message.Substring(0, Math.Min(50, request.Message.Length)));

            var response = await _chatService.ProcessQueryAsync(
                request.Message,
                request.CriancaId,
                request.ConversationId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao processar mensagem do chat");
            return StatusCode(500, new
            {
                message = "Erro ao processar mensagem",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Obtém histórico de uma conversa
    /// </summary>
    /// <param name="conversationId">ID da conversa</param>
    [HttpGet("history/{conversationId}")]
    [ProducesResponseType(typeof(Conversation), 200)]
    [ProducesResponseType(404)]
    public IActionResult GetChatHistory(Guid conversationId)
    {
        // TODO: Implementar storage persistente de conversas
        // Por enquanto, retornar não implementado
        return NotFound(new { message = "Histórico não disponível nesta versão" });
    }

    /// <summary>
    /// Verifica se o serviço de chat está configurado
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    [ProducesResponseType(200)]
    public IActionResult GetStatus()
    {
        // Verificar se OpenAI API Key está configurada
        var apiKey = Request.HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["OpenAI:ApiKey"];

        var isConfigured = !string.IsNullOrEmpty(apiKey);

        return Ok(new
        {
            configured = isConfigured,
            message = isConfigured
                ? "Serviço de chat disponível"
                : "Serviço de chat não configurado (OpenAI API Key ausente)"
        });
    }
}

