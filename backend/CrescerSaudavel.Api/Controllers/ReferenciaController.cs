using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
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
    private readonly ITamanhoNascimentoService _tamanhoNascimento;

    public ReferenciaController(ZScoreService zScoreService, ITamanhoNascimentoService tamanhoNascimento)
    {
        _zScoreService = zScoreService;
        _tamanhoNascimento = tamanhoNascimento;
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

    /// <summary>Tabela de interpretação dos z-scores por indicador (códigos gravados em Consulta.Classificacao*).</summary>
    [HttpGet("classificacoes")]
    public IActionResult GetClassificacoes() =>
        Ok(ClassificacaoCrescimento.Tabela.Select(c => new
        {
            c.Codigo,
            Indicador = c.Indicador.ToString(),
            Nivel = c.Nivel.ToString(),
            c.Rotulo,
            c.Faixa
        }));

    /// <summary>
    /// Curva OMS de peso para comprimento (<paramref name="tipo"/> = comprimento, 45-110 cm, até 2 anos) ou
    /// peso para estatura (altura, 65-120 cm, a partir de 2 anos), a cada 0,5 cm, linhas z = -3..+3.
    /// </summary>
    [HttpGet("oms/peso-estatura/{tipo}/{sexo}/curva")]
    public IActionResult GetCurvaPesoEstatura(string tipo, string sexo)
    {
        var deitado = tipo.ToLowerInvariant() switch
        {
            "comprimento" => (bool?)true,
            "altura" or "estatura" => false,
            _ => null
        };
        if (deitado is null)
        {
            return BadRequest(new { message = "Tipo inválido. Use comprimento ou altura." });
        }

        var curva = _zScoreService.ObterCurvaPesoEstatura(deitado.Value, SexoChar(sexo));
        return curva is { Count: > 0 }
            ? Ok(curva)
            : NotFound(new { message = $"Referência OMS de peso/{tipo} não encontrada para {sexo}." });
    }

    /// <summary>
    /// Tamanho ao nascer pela INTERGROWTH-21st (24+0 a 42+6 semanas): z, percentil e adequação
    /// (PIG &lt; P10, AIG, GIG &gt; P90) de peso, comprimento e perímetro cefálico. Recebe só medidas e IG.
    /// </summary>
    [HttpGet("nascimento/avaliar")]
    public IActionResult AvaliarNascimento(
        [FromQuery] string sexo,
        [FromQuery] decimal igSemanas,
        [FromQuery] int? igDias,
        [FromQuery] int? pesoGr,
        [FromQuery] decimal? comprimentoCm,
        [FromQuery] decimal? perimetroCefalicoCm)
    {
        if (igSemanas <= 0 || igDias is < 0 or > 6)
        {
            return BadRequest(new { message = "Idade gestacional inválida." });
        }

        var crianca = new RecemNascido { Sexo = SexoChar(sexo), IdadeGestacionalSemanas = igSemanas, IdadeGestacionalDias = igDias };
        var ig = ReferenciaCrescimentoService.IdadeGestacionalDias(crianca);
        var dentroDaFaixa = ig >= TamanhoNascimentoService.IdadeGestacionalMinimaDias &&
                            ig <= TamanhoNascimentoService.IdadeGestacionalMaximaDias;

        return Ok(new
        {
            IdadeGestacionalDias = ig,
            DentroDaFaixa = dentroDaFaixa,
            Padrao = dentroDaFaixa ? ig >= TamanhoNascimentoService.InicioPadraoDias : (bool?)null,
            Peso = pesoGr is > 0 ? _tamanhoNascimento.Avaliar(Medida.Peso, crianca.Sexo, ig, pesoGr.Value / 1000.0) : null,
            Comprimento = comprimentoCm is > 0 ? _tamanhoNascimento.Avaliar(Medida.Estatura, crianca.Sexo, ig, (double)comprimentoCm.Value) : null,
            PerimetroCefalico = perimetroCefalicoCm is > 0
                ? _tamanhoNascimento.Avaliar(Medida.PerimetroCefalico, crianca.Sexo, ig, (double)perimetroCefalicoCm.Value)
                : null
        });
    }

    private static char SexoChar(string sexo) => string.IsNullOrEmpty(sexo) ? 'f' : char.ToLowerInvariant(sexo[0]);
}
