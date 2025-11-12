using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Services.Time;
using System;
using System.Linq;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DashboardController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Ok(new
            {
                totalCriancas = 0,
                criancasPreTermo = 0,
                atendimentosHoje = 0,
                alertas = 0,
                totalAlimentos = 0,
                totalProfissionais = 0
            });
        }

        var hoje = DateTime.Today;
        var inicioHoje = hoje;
        var fimHoje = hoje.AddDays(1);

        // Total de crianças
        var totalCriancas = await _context.RecemNascidos
            .Where(r => tenantIds.Contains(r.TenantId))
            .CountAsync();

        // Crianças pré-termo (idade gestacional < 37 semanas)
        var criancasPreTermo = await _context.RecemNascidos
            .Where(r => tenantIds.Contains(r.TenantId) && r.IdadeGestacionalSemanas < 37)
            .CountAsync();

        // Atendimentos hoje
        var atendimentosHoje = await _context.Consultas
            .Join(_context.RecemNascidos,
                c => c.RecemNascidoId,
                r => r.Id,
                (c, r) => new { Consulta = c, RecemNascido = r })
            .Where(x => tenantIds.Contains(x.RecemNascido.TenantId))
            .Where(x => x.Consulta.DataHora >= inicioHoje && x.Consulta.DataHora < fimHoje)
            .CountAsync();

        // Alertas: crianças com Z-Score crítico (abaixo de -2 ou acima de +2)
        var consultasRecentes = await _context.Consultas
            .Join(_context.RecemNascidos,
                c => c.RecemNascidoId,
                r => r.Id,
                (c, r) => new { Consulta = c, RecemNascido = r })
            .Where(x => tenantIds.Contains(x.RecemNascido.TenantId))
            .Select(x => x.Consulta)
            .OrderByDescending(c => c.DataHora)
            .Take(100)
            .ToListAsync();

        var alertas = consultasRecentes
            .Count(c => (c.ZScorePeso.HasValue && (c.ZScorePeso < -2 || c.ZScorePeso > 2)) ||
                       (c.ZScoreAltura.HasValue && (c.ZScoreAltura < -2 || c.ZScoreAltura > 2)) ||
                       (c.ZScorePerimetro.HasValue && (c.ZScorePerimetro < -2 || c.ZScorePerimetro > 2)));

        // Total de alimentos
        var totalAlimentos = await _context.Alimentos
            .Where(a => tenantIds.Contains(a.TenantId) && a.Ativo && !a.Excluido)
            .CountAsync();

        // Total de profissionais
        var totalProfissionais = await _context.Users
            .Where(u => tenantIds.Contains(u.TenantId ?? Guid.Empty) && u.Ativo)
            .CountAsync();

        return Ok(new
        {
            totalCriancas,
            criancasPreTermo,
            atendimentosHoje,
            alertas,
            totalAlimentos,
            totalProfissionais
        });
    }

    [HttpGet("ultimos-atendimentos")]
    public async Task<IActionResult> GetUltimosAtendimentos([FromQuery] int limit = 5)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var consultas = await _context.Consultas
            .Join(_context.RecemNascidos,
                c => c.RecemNascidoId,
                r => r.Id,
                (c, r) => new { Consulta = c, RecemNascido = r })
            .Where(x => tenantIds.Contains(x.RecemNascido.TenantId))
            .OrderByDescending(x => x.Consulta.DataHora)
            .Take(limit)
            .Select(x => new
            {
                x.Consulta.Id,
                x.Consulta.DataHora,
                x.Consulta.PesoKg,
                x.Consulta.EstaturaCm,
                x.Consulta.PerimetroCefalicoCm,
                x.Consulta.ZScorePeso,
                x.Consulta.ZScoreAltura,
                x.Consulta.ZScorePerimetro,
                crianca = new
                {
                    id = x.RecemNascido.Id,
                    nome = x.RecemNascido.Nome
                }
            })
            .ToListAsync();

        return Ok(consultas);
    }

    [HttpGet("alertas")]
    public async Task<IActionResult> GetAlertas([FromQuery] int limit = 10)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var consultasComAlerta = await _context.Consultas
            .Join(_context.RecemNascidos,
                c => c.RecemNascidoId,
                r => r.Id,
                (c, r) => new { Consulta = c, RecemNascido = r })
            .Where(x => tenantIds.Contains(x.RecemNascido.TenantId))
            .Where(x => (x.Consulta.ZScorePeso.HasValue && (x.Consulta.ZScorePeso < -2 || x.Consulta.ZScorePeso > 2)) ||
                       (x.Consulta.ZScoreAltura.HasValue && (x.Consulta.ZScoreAltura < -2 || x.Consulta.ZScoreAltura > 2)) ||
                       (x.Consulta.ZScorePerimetro.HasValue && (x.Consulta.ZScorePerimetro < -2 || x.Consulta.ZScorePerimetro > 2)))
            .OrderByDescending(x => x.Consulta.DataHora)
            .Take(limit)
            .Select(x => new
            {
                x.Consulta.Id,
                x.Consulta.DataHora,
                x.Consulta.ZScorePeso,
                x.Consulta.ZScoreAltura,
                x.Consulta.ZScorePerimetro,
                crianca = new
                {
                    id = x.RecemNascido.Id,
                    nome = x.RecemNascido.Nome
                },
                tipoAlerta = GetTipoAlerta(x.Consulta.ZScorePeso, x.Consulta.ZScoreAltura, x.Consulta.ZScorePerimetro),
                severidade = GetSeveridade(x.Consulta.ZScorePeso, x.Consulta.ZScoreAltura, x.Consulta.ZScorePerimetro)
            })
            .ToListAsync();

        return Ok(consultasComAlerta);
    }

    private static string GetTipoAlerta(decimal? zPeso, decimal? zAltura, decimal? zPerimetro)
    {
        var alertas = new List<string>();
        
        if (zPeso.HasValue && (zPeso < -2 || zPeso > 2))
            alertas.Add(zPeso < -2 ? "Peso abaixo do esperado" : "Peso acima do esperado");
        
        if (zAltura.HasValue && (zAltura < -2 || zAltura > 2))
            alertas.Add(zAltura < -2 ? "Altura abaixo do esperado" : "Altura acima do esperado");
        
        if (zPerimetro.HasValue && (zPerimetro < -2 || zPerimetro > 2))
            alertas.Add(zPerimetro < -2 ? "Perímetro cefálico abaixo do esperado" : "Perímetro cefálico acima do esperado");

        return string.Join(", ", alertas);
    }

    private static string GetSeveridade(decimal? zPeso, decimal? zAltura, decimal? zPerimetro)
    {
        var scores = new[] { zPeso, zAltura, zPerimetro }
            .Where(z => z.HasValue)
            .Select(z => Math.Abs(z!.Value))
            .ToList();

        if (scores.Any(s => s >= 3))
            return "critico";
        
        if (scores.Any(s => s >= 2))
            return "alerta";
        
        return "atencao";
    }
}

