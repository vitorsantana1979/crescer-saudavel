using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CrescerSaudavel.Api.Models.ML;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Time;

namespace CrescerSaudavel.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly MLService _mlService;
    private readonly ILogger<AnalyticsController> _logger;
    private readonly ICurrentUserService _currentUserService;

    public AnalyticsController(
        MLService mlService,
        ILogger<AnalyticsController> logger,
        ICurrentUserService currentUserService)
    {
        _mlService = mlService;
        _logger = logger;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Prediz crescimento para um cenário de dieta
    /// </summary>
    /// <param name="criancaId">ID da criança</param>
    /// <param name="request">Cenário de dieta e horizonte</param>
    [HttpPost("predict-growth/{criancaId}")]
    [ProducesResponseType(typeof(PredictionResponse), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> PredictGrowth(
        Guid criancaId,
        [FromBody] DietScenarioRequest request)
    {
        try
        {
            // TODO: Verificar permissões de acesso à criança
            if (_currentUserService.UserId == null)
                return Unauthorized();

            _logger.LogInformation(
                "Usuário {UserId} solicitou predição para criança {CriancaId}",
                _currentUserService.UserId,
                criancaId);

            var result = await _mlService.PredictGrowthAsync(
                criancaId,
                request.Cenario,
                request.HorizonteDias);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao processar predição para criança {CriancaId}", criancaId);
            return StatusCode(500, new { message = "Erro ao processar predição", error = ex.Message });
        }
    }

    /// <summary>
    /// Compara múltiplos cenários de dieta
    /// </summary>
    /// <param name="criancaId">ID da criança</param>
    /// <param name="request">Lista de cenários a comparar</param>
    [HttpPost("compare-diets/{criancaId}")]
    [ProducesResponseType(typeof(ComparisonResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> CompareDiets(
        Guid criancaId,
        [FromBody] List<DietScenario> request)
    {
        try
        {
            if (request == null || request.Count < 2)
                return BadRequest(new { message = "É necessário fornecer pelo menos 2 cenários" });

            if (request.Count > 10)
                return BadRequest(new { message = "Máximo de 10 cenários por comparação" });

            if (_currentUserService.UserId == null)
                return Unauthorized();

            _logger.LogInformation(
                "Usuário {UserId} solicitou comparação de {Count} cenários para criança {CriancaId}",
                _currentUserService.UserId,
                request.Count,
                criancaId);

            var result = await _mlService.CompareDietsAsync(criancaId, request);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao comparar dietas para criança {CriancaId}", criancaId);
            return StatusCode(500, new { message = "Erro ao comparar cenários", error = ex.Message });
        }
    }

    /// <summary>
    /// Busca casos similares no histórico
    /// </summary>
    /// <param name="criancaId">ID da criança de referência</param>
    /// <param name="limit">Número de casos a retornar (máx: 50)</param>
    [HttpGet("similar-cases/{criancaId}")]
    [ProducesResponseType(typeof(List<SimilarCase>), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> GetSimilarCases(
        Guid criancaId,
        [FromQuery] int limit = 10)
    {
        try
        {
            if (limit < 1 || limit > 50)
                return BadRequest(new { message = "Limit deve estar entre 1 e 50" });

            if (_currentUserService.UserId == null)
                return Unauthorized();

            _logger.LogInformation(
                "Usuário {UserId} solicitou casos similares para criança {CriancaId}",
                _currentUserService.UserId,
                criancaId);

            var result = await _mlService.GetSimilarCasesAsync(criancaId, limit);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao buscar casos similares para criança {CriancaId}", criancaId);
            return StatusCode(500, new { message = "Erro ao buscar casos similares", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtém estatísticas gerais do sistema
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(AnalyticsStats), 200)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> GetStatistics()
    {
        try
        {
            if (_currentUserService.UserId == null)
                return Unauthorized();

            var result = await _mlService.GetStatisticsAsync();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter estatísticas");
            return StatusCode(500, new { message = "Erro ao obter estatísticas", error = ex.Message });
        }
    }

    /// <summary>
    /// Verifica status do serviço de ML
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    [ProducesResponseType(200)]
    [ProducesResponseType(503)]
    public async Task<IActionResult> HealthCheck()
    {
        try
        {
            var isHealthy = await _mlService.HealthCheckAsync();

            if (isHealthy)
                return Ok(new { status = "healthy", service = "ml-service" });

            return StatusCode(503, new { status = "unhealthy", service = "ml-service" });
        }
        catch
        {
            return StatusCode(503, new { status = "error", service = "ml-service" });
        }
    }

    /// <summary>
    /// Solicita re-treinamento dos modelos (somente administradores)
    /// </summary>
    [HttpPost("retrain")]
    [Authorize(Roles = "Administrador")]
    [ProducesResponseType(200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> RetrainModels([FromQuery] int horizonteDias = 14)
    {
        try
        {
            _logger.LogWarning(
                "Usuário {UserId} solicitou re-treinamento dos modelos",
                _currentUserService.UserId);

            var result = await _mlService.RetrainModelsAsync(horizonteDias);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao solicitar re-treinamento");
            return StatusCode(500, new { message = "Erro ao re-treinar modelos", error = ex.Message });
        }
    }
}

// ==================== REQUEST MODELS ====================

public record DietScenarioRequest(
    DietScenario Cenario,
    int HorizonteDias = 14
);

