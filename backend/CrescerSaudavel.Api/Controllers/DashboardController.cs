using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
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
                totalProfissionais = 0,
                criancasPig = 0,
                criancasComAdequacao = 0
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

        // Alertas: consultas recentes com classificação de nível "cuidado" ou alerta de RCEU/queda ponderal
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

        var alertas = consultasRecentes.Count(PossuiAlerta);

        // Total de alimentos
        var totalAlimentos = await _context.Alimentos
            .Where(a => tenantIds.Contains(a.TenantId) && a.Ativo && !a.Excluido)
            .CountAsync();

        // Adequação do peso ao nascer pela INTERGROWTH-21st (PIG < P10)
        var adequacoes = await _context.RecemNascidos
            .Where(r => tenantIds.Contains(r.TenantId) && r.AdequacaoPesoNascimento != null)
            .GroupBy(r => r.AdequacaoPesoNascimento)
            .Select(g => new { Adequacao = g.Key, Total = g.Count() })
            .ToListAsync();
        var criancasComAdequacao = adequacoes.Sum(a => a.Total);
        var criancasPig = adequacoes.Where(a => a.Adequacao == "PIG").Sum(a => a.Total);

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
            totalProfissionais,
            criancasPig,
            criancasComAdequacao
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

        var codigosCuidado = ClassificacaoCrescimento.CodigosCuidado;
        var consultasComAlerta = await _context.Consultas
            .Join(_context.RecemNascidos,
                c => c.RecemNascidoId,
                r => r.Id,
                (c, r) => new { Consulta = c, RecemNascido = r })
            .Where(x => tenantIds.Contains(x.RecemNascido.TenantId))
            .Where(x => codigosCuidado.Contains(x.Consulta.ClassificacaoPeso!) ||
                        codigosCuidado.Contains(x.Consulta.ClassificacaoEstatura!) ||
                        codigosCuidado.Contains(x.Consulta.ClassificacaoPerimetro!) ||
                        x.Consulta.AlertaQuedaPonderal ||
                        x.Consulta.AlertaRCEU)
            .OrderByDescending(x => x.Consulta.DataHora)
            .Take(limit)
            .Select(x => new { x.Consulta, crianca = new { id = x.RecemNascido.Id, nome = x.RecemNascido.Nome } })
            .ToListAsync();

        return Ok(consultasComAlerta.Select(x => new
        {
            x.Consulta.Id,
            x.Consulta.DataHora,
            x.Consulta.ZScorePeso,
            x.Consulta.ZScoreAltura,
            x.Consulta.ZScorePerimetro,
            x.Consulta.ClassificacaoPeso,
            x.Consulta.ClassificacaoEstatura,
            x.Consulta.ClassificacaoPerimetro,
            x.Consulta.AlertaRCEU,
            x.Consulta.AlertaQuedaPonderal,
            x.crianca,
            tipoAlerta = GetTipoAlerta(x.Consulta),
            severidade = GetSeveridade(x.Consulta)
        }));
    }

    private static bool PossuiAlerta(Consulta c) =>
        ClassificacaoCrescimento.EhCuidado(c.ClassificacaoPeso)
        || ClassificacaoCrescimento.EhCuidado(c.ClassificacaoEstatura)
        || ClassificacaoCrescimento.EhCuidado(c.ClassificacaoPerimetro)
        || c.AlertaQuedaPonderal
        || c.AlertaRCEU;

    private static string GetTipoAlerta(Consulta c)
    {
        var alertas = new List<string>();

        if (c.AlertaRCEU)
            alertas.Add("RCEU (Restrição de Crescimento Extrauterino)");
        else if (ClassificacaoCrescimento.PorCodigo(c.ClassificacaoPeso) is { EhCuidado: true } peso)
            alertas.Add(peso.Rotulo);

        if (c.AlertaQuedaPonderal)
            alertas.Add("Queda ponderal (≥ 0,5 DP desde a consulta anterior)");

        if (ClassificacaoCrescimento.PorCodigo(c.ClassificacaoEstatura) is { EhCuidado: true } estatura)
            alertas.Add(estatura.Rotulo);

        if (ClassificacaoCrescimento.PorCodigo(c.ClassificacaoPerimetro) is { EhCuidado: true } perimetro)
            alertas.Add(perimetro.Rotulo);

        return string.Join(", ", alertas);
    }

    private static string GetSeveridade(Consulta c)
    {
        if (c.AlertaRCEU || c.AlertaQuedaPonderal)
            return "critico";

        var scores = new[] { c.ZScorePeso, c.ZScoreAltura, c.ZScorePerimetro }
            .Where(z => z.HasValue)
            .Select(z => Math.Abs(z!.Value))
            .ToList();

        if (scores.Any(s => s >= 3))
            return "critico";

        if (PossuiAlerta(c))
            return "alerta";

        return "atencao";
    }
}

