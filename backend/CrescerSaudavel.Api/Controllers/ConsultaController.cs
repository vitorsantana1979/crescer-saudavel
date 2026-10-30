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
    private readonly CrescerSaudavelDbContext _context;
    private readonly IAvaliacaoCrescimentoService _avaliacao;
    private readonly ICurrentUserService _currentUserService;

    private readonly ITamanhoNascimentoService _tamanhoNascimento;

    public ConsultaController(
        CrescerSaudavelDbContext context,
        IAvaliacaoCrescimentoService avaliacao,
        ICurrentUserService currentUserService,
        ITamanhoNascimentoService tamanhoNascimento)
    {
        _context = context;
        _avaliacao = avaliacao;
        _currentUserService = currentUserService;
        _tamanhoNascimento = tamanhoNascimento;
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

        if (!PosicaoMedida.Valida(request.PosicaoMedida))
            return BadRequest(new { message = "Posição da medida deve ser Deitado ou EmPe" });

        var consulta = new Consulta
        {
            RecemNascidoId = request.RecemNascidoId,
            DataHora = request.DataHora,
            PesoKg = request.PesoKg,
            EstaturaCm = request.EstaturaCm,
            PerimetroCefalicoCm = request.PerimetroCefalicoCm,
            PosicaoMedida = request.PosicaoMedida,
            ClassificacaoManualEquipe = request.ClassificacaoManualEquipe,
            ZScoreManualEquipe = request.ZScoreManualEquipe
        };

        var consultaAnterior = await ConsultaAnteriorAsync(consulta);
        _avaliacao.Avaliar(consulta, crianca, consultaAnterior);

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

        if (!PosicaoMedida.Valida(request.PosicaoMedida))
            return BadRequest(new { message = "Posição da medida deve ser Deitado ou EmPe" });

        consulta.DataHora = request.DataHora;
        consulta.PesoKg = request.PesoKg;
        consulta.EstaturaCm = request.EstaturaCm;
        consulta.PerimetroCefalicoCm = request.PerimetroCefalicoCm;
        consulta.PosicaoMedida = request.PosicaoMedida;
        consulta.ClassificacaoManualEquipe = request.ClassificacaoManualEquipe;
        consulta.ZScoreManualEquipe = request.ZScoreManualEquipe;

        var consultaAnterior = await ConsultaAnteriorAsync(consulta);
        _avaliacao.Avaliar(consulta, crianca, consultaAnterior);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Ganho de cada medida para manter o z atual no próximo período (7 d INTERGROWTH, 30 d OMS).</summary>
    [HttpGet("{id}/ganho-esperado")]
    public async Task<IActionResult> GetGanhoEsperado(Guid id)
    {
        var consulta = await _context.Consultas.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (consulta == null)
            return NotFound();

        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == consulta.RecemNascidoId);

        if (crianca == null || !tenantIds.Contains(crianca.TenantId))
            return Forbid();

        return Ok(_avaliacao.GanhoParaManterCanal(consulta, crianca));
    }

    /// <summary>
    /// Recalcula z-scores, classificações, alertas e velocidade de ganho ponderal de todas as consultas
    /// (e o tamanho ao nascer de todas as crianças) com as referências atuais. Usar após atualizar as
    /// tabelas de referência ou a regra de seleção.
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
            _tamanhoNascimento.Aplicar(crianca);

            Consulta? anterior = null;
            foreach (var consulta in crianca.Consultas.OrderBy(c => c.DataHora))
            {
                total++;
                var selecao = _avaliacao.Avaliar(consulta, crianca, anterior);
                if (selecao.PossuiReferencia)
                {
                    comReferencia++;
                }
                else
                {
                    var motivo = selecao.Motivo ?? "Sem referência";
                    semReferencia[motivo] = semReferencia.GetValueOrDefault(motivo) + 1;
                }

                anterior = consulta;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { criancas = criancas.Count, total, comReferencia, semReferencia });
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
}

public record CreateConsultaRequest(
    Guid RecemNascidoId,
    DateTime DataHora,
    decimal PesoKg,
    decimal EstaturaCm,
    decimal PerimetroCefalicoCm,
    string? ClassificacaoManualEquipe = null,
    decimal? ZScoreManualEquipe = null,
    string? PosicaoMedida = null
);

public record UpdateConsultaRequest(
    DateTime DataHora,
    decimal PesoKg,
    decimal EstaturaCm,
    decimal PerimetroCefalicoCm,
    string? ClassificacaoManualEquipe = null,
    decimal? ZScoreManualEquipe = null,
    string? PosicaoMedida = null
);
