using CrescerSaudavel.Api.Services.Location;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/localizacao")]
[AllowAnonymous]
public class LocalizacaoController : ControllerBase
{
    private readonly ILocationService _locationService;

    public LocalizacaoController(ILocationService locationService)
    {
        _locationService = locationService;
    }

    [HttpGet("cep/{cep}")]
    public async Task<IActionResult> BuscarCep(string cep, CancellationToken cancellationToken)
    {
        var resultado = await _locationService.BuscarCepAsync(cep, cancellationToken);
        if (resultado == null)
        {
            return NotFound(new { message = "CEP não encontrado" });
        }

        return Ok(resultado);
    }

    [HttpGet("estados")]
    public async Task<IActionResult> ObterEstados(CancellationToken cancellationToken)
    {
        var estados = await _locationService.ObterEstadosAsync(cancellationToken);
        return Ok(estados);
    }

    [HttpGet("estados/{uf}/municipios")]
    public async Task<IActionResult> ObterMunicipios(string uf, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(uf))
        {
            return BadRequest(new { message = "UF é obrigatória" });
        }

        var municipios = await _locationService.ObterMunicipiosPorEstadoAsync(uf, cancellationToken);
        if (municipios.Count == 0)
        {
            return NotFound(new { message = "Municípios não encontrados para a UF informada" });
        }

        return Ok(municipios);
    }
}
