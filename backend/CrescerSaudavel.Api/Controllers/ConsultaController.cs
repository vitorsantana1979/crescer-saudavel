using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
using CrescerSaudavel.Api.Services.Time;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/consultas")]
[Authorize]
public class ConsultaController : ControllerBase
{
    private const decimal LimiarAlertaRceu = -1.28m; // z do percentil 10
    private const decimal LimiarQuedaPonderal = -0.5m; // queda de 0,5 DP em relação à consulta anterior

    private readonly CrescerSaudavelDbContext _context;
    private readonly IAvaliacaoCrescimentoService _avaliacao;
    private readonly ICurrentUserService _currentUserService;

    public ConsultaController(
        CrescerSaudavelDbContext context,
        IAvaliacaoCrescimentoService avaliacao,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _avaliacao = avaliacao;
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

        if (request.DataHora.Date < crianca.DataNascimento.Date)
            return BadRequest(new { message = "Data da consulta anterior ao nascimento" });

        var consulta = new Consulta
        {
            RecemNascidoId = request.RecemNascidoId,
            DataHora = request.DataHora,
            PesoKg = request.PesoKg,
            EstaturaCm = request.EstaturaCm,
            PerimetroCefalicoCm = request.PerimetroCefalicoCm,
            ClassificacaoManualEquipe = request.ClassificacaoManualEquipe,
            ZScoreManualEquipe = request.ZScoreManualEquipe
        };

        _avaliacao.AplicarZScores(consulta, crianca);

        var consultaAnterior = await ConsultaAnteriorAsync(consulta);
        AplicarAlertasEVelocidade(consulta, consultaAnterior);

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

        if (request.DataHora.Date < crianca.DataNascimento.Date)
            return BadRequest(new { message = "Data da consulta anterior ao nascimento" });

        consulta.DataHora = request.DataHora;
        consulta.PesoKg = request.PesoKg;
        consulta.EstaturaCm = request.EstaturaCm;
        consulta.PerimetroCefalicoCm = request.PerimetroCefalicoCm;
        consulta.ClassificacaoManualEquipe = request.ClassificacaoManualEquipe;
        consulta.ZScoreManualEquipe = request.ZScoreManualEquipe;

        _avaliacao.AplicarZScores(consulta, crianca);

        var consultaAnterior = await ConsultaAnteriorAsync(consulta);
        AplicarAlertasEVelocidade(consulta, consultaAnterior);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Recalcula z-scores, alertas e velocidade de ganho ponderal de todas as consultas com as
    /// referências atuais. Usar após atualizar as tabelas de referência ou a regra de seleção.
    /// </summary>
    [HttpPost("recalcular-zscores")]
    [Authorize(Roles = SystemRoles.SuperAdmin)]
    public async Task<IActionResult> RecalcularZScores()
    {
        var criancas = await _context.RecemNascidos
            .Include(r => r.Consultas)
            .ToListAsync();

        var total = 0;
        var comReferencia = 0;
        var semReferencia = new Dictionary<string, int>();

        foreach (var crianca in criancas)
        {
            Consulta? anterior = null;
            foreach (var consulta in crianca.Consultas.OrderBy(c => c.DataHora))
            {
                total++;
                var selecao = _avaliacao.AplicarZScores(consulta, crianca);
                if (selecao.PossuiReferencia)
                {
                    comReferencia++;
                }
                else
                {
                    var motivo = selecao.Motivo ?? "Sem referência";
                    semReferencia[motivo] = semReferencia.GetValueOrDefault(motivo) + 1;
                }

                AplicarAlertasEVelocidade(consulta, anterior);
                anterior = consulta;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { total, comReferencia, semReferencia });
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

    private Task<Consulta?> ConsultaAnteriorAsync(Consulta consulta) =>
        _context.Consultas
            .Where(c => c.RecemNascidoId == consulta.RecemNascidoId && c.DataHora < consulta.DataHora && c.Id != consulta.Id)
            .OrderByDescending(c => c.DataHora)
            .FirstOrDefaultAsync();

    private static void AplicarAlertasEVelocidade(Consulta consulta, Consulta? anterior)
    {
        consulta.AlertaRCEU = consulta.ZScorePeso.HasValue && consulta.ZScorePeso.Value <= LimiarAlertaRceu;

        consulta.AlertaQuedaPonderal =
            anterior?.ZScorePeso != null
            && consulta.ZScorePeso.HasValue
            && consulta.ZScorePeso.Value - anterior.ZScorePeso.Value <= LimiarQuedaPonderal;

        // Velocidade de Ganho Ponderal (VGP) - Método Exponencial de Patel et al. (2005)
        // VGP = 1000 × ln(P2/P1) / (D2 - D1)
        consulta.VelocidadeGanhoPonderal = null;
        if (anterior != null && anterior.PesoKg > 0 && consulta.PesoKg > 0)
        {
            var intervaloDias = (consulta.DataHora.Date - anterior.DataHora.Date).Days;
            if (intervaloDias > 0)
            {
                var p1 = (double)anterior.PesoKg;
                var p2 = (double)consulta.PesoKg;
                consulta.VelocidadeGanhoPonderal = (decimal)(1000.0 * Math.Log(p2 / p1) / intervaloDias);
            }
        }
    }
}

public record CreateConsultaRequest(
    Guid RecemNascidoId,
    DateTime DataHora,
    decimal PesoKg,
    decimal EstaturaCm,
    decimal PerimetroCefalicoCm,
    string? ClassificacaoManualEquipe = null,
    decimal? ZScoreManualEquipe = null
);

public record UpdateConsultaRequest(
    DateTime DataHora,
    decimal PesoKg,
    decimal EstaturaCm,
    decimal PerimetroCefalicoCm,
    string? ClassificacaoManualEquipe = null,
    decimal? ZScoreManualEquipe = null
);
