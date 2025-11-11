using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Time;
using System.Linq;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/consultas")]
[Authorize]
public class ConsultaController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ZScoreService _zScoreService;
    private readonly ICurrentUserService _currentUserService;

    public ConsultaController(
        CrescerSaudavelDbContext context,
        ZScoreService zScoreService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _zScoreService = zScoreService;
        _currentUserService = currentUserService;
    }

    [HttpGet("crianca/{recemNascidoId}")]
    public async Task<IActionResult> GetByRecemNascido(Guid recemNascidoId)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Ok(Array.Empty<Consulta>());
        }

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recemNascidoId);

        if (crianca == null)
            return NotFound();

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        var consultas = await _context.Consultas
            .Where(c => c.RecemNascidoId == recemNascidoId)
            .OrderByDescending(c => c.DataHora)
            .ToListAsync();

        return Ok(consultas);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var consulta = await _context.Consultas.FindAsync(id);
        if (consulta == null)
            return NotFound();

        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == consulta.RecemNascidoId);

        if (crianca == null || !tenantIds.Contains(crianca.TenantId))
            return Forbid();

        return Ok(consulta);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateConsultaRequest request)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var crianca = await _context.RecemNascidos.FindAsync(request.RecemNascidoId);
        if (crianca == null)
            return NotFound(new { message = "Criança não encontrada" });

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        // Calcular idade em semanas na data da consulta
        var idadeDias = (request.DataHora.Date - crianca.DataNascimento.Date).Days;
        var idadeSemanas = idadeDias / 7.0;

        // Calcular Z-Scores
        decimal? zScorePeso = null;
        decimal? zScoreAltura = null;
        decimal? zScorePerimetro = null;

        try
        {
            // Determinar se usa INTERGROWTH ou OMS baseado na idade gestacional
            var curva = crianca.IdadeGestacionalSemanas < 37 ? "INTERGROWTH" : "OMS";
            var sexo = crianca.Sexo == 'M' ? "m" : "f";

            var zPeso = _zScoreService.CalcularZ(
                idadeSemanas, (double)request.PesoKg, sexo, curva, "peso"
            );
            zScorePeso = zPeso.HasValue ? (decimal)zPeso.Value : null;

            var zAltura = _zScoreService.CalcularZ(
                idadeSemanas, (double)request.EstaturaCm, sexo, curva, "comprimento"
            );
            zScoreAltura = zAltura.HasValue ? (decimal)zAltura.Value : null;

            var zPerimetro = _zScoreService.CalcularZ(
                idadeSemanas, (double)request.PerimetroCefalicoCm, sexo, curva, "pc"
            );
            zScorePerimetro = zPerimetro.HasValue ? (decimal)zPerimetro.Value : null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao calcular Z-Score: {ex.Message}");
        }

        var consulta = new Consulta
        {
            RecemNascidoId = request.RecemNascidoId,
            DataHora = request.DataHora,
            PesoKg = request.PesoKg,
            EstaturaCm = request.EstaturaCm,
            PerimetroCefalicoCm = request.PerimetroCefalicoCm,
            ZScorePeso = zScorePeso,
            ZScoreAltura = zScoreAltura,
            ZScorePerimetro = zScorePerimetro
        };

        _context.Consultas.Add(consulta);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = consulta.Id }, consulta);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateConsultaRequest request)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var consulta = await _context.Consultas.FindAsync(id);
        if (consulta == null)
            return NotFound();

        var crianca = await _context.RecemNascidos.FindAsync(consulta.RecemNascidoId);
        if (crianca == null)
            return NotFound(new { message = "Criança não encontrada" });

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        var idadeDias = (request.DataHora.Date - crianca.DataNascimento.Date).Days;
        var idadeSemanas = idadeDias / 7.0;

        // Recalcular Z-Scores
        try
        {
            var curva = crianca.IdadeGestacionalSemanas < 37 ? "INTERGROWTH" : "OMS";
            var sexo = crianca.Sexo == 'M' ? "m" : "f";

            var zPeso = _zScoreService.CalcularZ(
                idadeSemanas, (double)request.PesoKg, sexo, curva, "peso"
            );
            consulta.ZScorePeso = zPeso.HasValue ? (decimal)zPeso.Value : null;

            var zAltura = _zScoreService.CalcularZ(
                idadeSemanas, (double)request.EstaturaCm, sexo, curva, "comprimento"
            );
            consulta.ZScoreAltura = zAltura.HasValue ? (decimal)zAltura.Value : null;

            var zPerimetro = _zScoreService.CalcularZ(
                idadeSemanas, (double)request.PerimetroCefalicoCm, sexo, curva, "pc"
            );
            consulta.ZScorePerimetro = zPerimetro.HasValue ? (decimal)zPerimetro.Value : null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao recalcular Z-Score: {ex.Message}");
        }

        consulta.DataHora = request.DataHora;
        consulta.PesoKg = request.PesoKg;
        consulta.EstaturaCm = request.EstaturaCm;
        consulta.PerimetroCefalicoCm = request.PerimetroCefalicoCm;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var consulta = await _context.Consultas.FindAsync(id);
        if (consulta == null)
            return NotFound();

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == consulta.RecemNascidoId);

        if (crianca == null || !tenantIds.Contains(crianca.TenantId))
            return Forbid();

        _context.Consultas.Remove(consulta);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateConsultaRequest(
    Guid RecemNascidoId,
    DateTime DataHora,
    decimal PesoKg,
    decimal EstaturaCm,
    decimal PerimetroCefalicoCm
);

public record UpdateConsultaRequest(
    DateTime DataHora,
    decimal PesoKg,
    decimal EstaturaCm,
    decimal PerimetroCefalicoCm
);
