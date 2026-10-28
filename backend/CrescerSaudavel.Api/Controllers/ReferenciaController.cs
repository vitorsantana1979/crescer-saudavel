using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CrescerSaudavel.Api.Services;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/referencias")]
[Authorize]
public class ReferenciaController : ControllerBase
{
    private readonly ZScoreService _zScoreService;

    public ReferenciaController(ZScoreService zScoreService)
    {
        _zScoreService = zScoreService;
    }

    /// <summary>Curvas INTERGROWTH-21st de peso para pré-termo, um ponto por semana pós-menstrual (27-64).</summary>
    [HttpGet("pretermo/peso/{sexo}/curvas")]
    [AllowAnonymous]
    public IActionResult GetCurvasPesoPretermo(string sexo)
    {
        var curvas = _zScoreService.ObterCurvasPesoPretermo(sexo);
        if (curvas == null || curvas.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência pré-termo não encontrados para peso {sexo}." });
        }

        return Ok(curvas);
    }

    /// <summary>Curvas OMS de peso para a termo, um ponto por semana (0-265).</summary>
    [HttpGet("padrao/peso/{sexo}/curvas")]
    [AllowAnonymous]
    public IActionResult GetCurvasPesoPadrao(string sexo)
    {
        var curvas = _zScoreService.ObterCurvasPesoPadrao(sexo);
        if (curvas == null || curvas.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência padrão (OMS) não encontrados para peso {sexo}." });
        }

        return Ok(curvas);
    }

    /// <summary>Curva OMS dia a dia (0-1856) de peso, estatura ou perímetro cefálico.</summary>
    [HttpGet("oms/{medida}/{sexo}/curva-diaria")]
    public IActionResult GetCurvaDiariaOms(string medida, string sexo)
    {
        if (!ZScoreService.TryParseMedida(medida, out var medidaEnum))
        {
            return BadRequest(new { message = $"Medida inválida: {medida}. Use peso, estatura ou perimetro." });
        }

        var curva = _zScoreService.ObterCurvaDiaria(medidaEnum, SexoChar(sexo));
        if (curva == null || curva.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência OMS não encontrados para {medida}/{sexo}" });
        }

        return Ok(curva);
    }

    [HttpGet("{tipo}/{medida}/{sexo}/curvas")]
    public IActionResult GetCurvasReferencia(string tipo, string medida, string sexo)
    {
        if (!Enum.TryParse<TipoReferencia>(tipo, ignoreCase: true, out var tipoEnum))
        {
            return BadRequest(new { message = $"Tipo de referência inválido: {tipo}. Use OMS ou INTERGROWTH." });
        }

        if (!ZScoreService.TryParseMedida(medida, out var medidaEnum))
        {
            return BadRequest(new { message = $"Medida inválida: {medida}. Use peso, estatura ou perimetro." });
        }

        var curvas = _zScoreService.ObterCurvasReferencia(tipoEnum, medidaEnum, SexoChar(sexo));
        if (curvas == null || curvas.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência não encontrados para {tipo}/{medida}/{sexo}" });
        }

        return Ok(curvas);
    }

    private static char SexoChar(string sexo) => string.IsNullOrEmpty(sexo) ? 'f' : char.ToLowerInvariant(sexo[0]);
}
