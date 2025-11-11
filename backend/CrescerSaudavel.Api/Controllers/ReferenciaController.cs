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

    [HttpGet("pretermo/peso/{sexo}/curvas")]
    [AllowAnonymous]
    public IActionResult GetCurvasPesoPretermo(string sexo)
    {
        var sexoLower = sexo.ToLower();
        
        // Para pré-termo, usar apenas dados INTERGROWTH
        var curvas = _zScoreService.ObterCurvasPesoPretermo(sexoLower);
        
        if (curvas == null || curvas.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência pré-termo não encontrados para peso {sexo}." });
        }

        return Ok(curvas);
    }
    
    [HttpGet("padrao/peso/{sexo}/curvas")]
    [AllowAnonymous]
    public IActionResult GetCurvasPesoPadrao(string sexo)
    {
        var sexoLower = sexo.ToLower();
        
        // Para padrão (a termo), usar dados OMS
        var curvas = _zScoreService.ObterCurvasPesoPadrao(sexoLower);
        
        if (curvas == null || curvas.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência padrão (OMS) não encontrados para peso {sexo}." });
        }

        return Ok(curvas);
    }
    
    [HttpGet("{tipo}/{medida}/{sexo}/curvas")]
    public IActionResult GetCurvasReferencia(string tipo, string medida, string sexo)
    {
        var curvas = _zScoreService.ObterCurvasReferencia(tipo.ToUpper(), medida.ToLower(), sexo.ToLower());
        
        if (curvas == null || curvas.Count == 0)
        {
            return NotFound(new { message = $"Dados de referência não encontrados para {tipo}/{medida}/{sexo}" });
        }

        return Ok(curvas);
    }
}

