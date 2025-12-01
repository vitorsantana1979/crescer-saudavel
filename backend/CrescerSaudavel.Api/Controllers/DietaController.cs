using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;
using System.Linq;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/dietas")]
[Authorize]
public class DietaController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DietaController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet("crianca/{recemNascidoId}")]
    public async Task<IActionResult> GetByRecemNascido(Guid recemNascidoId)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Ok(Array.Empty<Dieta>());

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recemNascidoId);

        if (crianca == null)
            return NotFound();

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        var dietas = await _context.Dietas
            .AsNoTracking()
            .Include(d => d.Itens)
            .Where(d => d.RecemNascidoId == recemNascidoId)
            .OrderByDescending(d => d.DataInicio)
            .ToListAsync();

        return Ok(dietas);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var dieta = await _context.Dietas
            .Include(d => d.Itens)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (dieta == null)
            return NotFound();

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == dieta.RecemNascidoId);

        if (crianca == null || !tenantIds.Contains(crianca.TenantId))
            return Forbid();

        return Ok(dieta);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDietaRequest request)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var crianca = await _context.RecemNascidos.FindAsync(request.RecemNascidoId);
        if (crianca == null)
            return NotFound(new { message = "Criança não encontrada" });

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        var dieta = new Dieta
        {
            RecemNascidoId = request.RecemNascidoId,
            DataInicio = request.DataInicio,
            DataFim = request.DataFim,
            FrequenciaHoras = request.FrequenciaHoras,
            Itens = request.Itens.Select(i => new DietaItem
            {
                AlimentoId = i.AlimentoId,
                Quantidade = i.Quantidade,
                EnergiaTotalKcal = i.EnergiaTotalKcal,
                ProteinaTotalG = i.ProteinaTotalG
            }).ToList()
        };

        _context.Dietas.Add(dieta);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = dieta.Id }, dieta);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDietaRequest request)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var dieta = await _context.Dietas
            .Include(d => d.Itens)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (dieta == null)
            return NotFound();

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == dieta.RecemNascidoId);

        if (crianca == null || !tenantIds.Contains(crianca.TenantId))
            return Forbid();

        dieta.DataInicio = request.DataInicio;
        dieta.DataFim = request.DataFim;
        dieta.FrequenciaHoras = request.FrequenciaHoras;

        // Remove itens antigos
        _context.DietaItens.RemoveRange(dieta.Itens);

        // Adiciona novos itens
        dieta.Itens = request.Itens.Select(i => new DietaItem
        {
            DietaId = id,
            AlimentoId = i.AlimentoId,
            Quantidade = i.Quantidade,
            EnergiaTotalKcal = i.EnergiaTotalKcal,
            ProteinaTotalG = i.ProteinaTotalG
        }).ToList();

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var dieta = await _context.Dietas.FindAsync(id);
        if (dieta == null)
            return NotFound();

        var crianca = await _context.RecemNascidos
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == dieta.RecemNascidoId);

        if (crianca == null || !tenantIds.Contains(crianca.TenantId))
            return Forbid();

        _context.Dietas.Remove(dieta);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateDietaRequest(
    Guid RecemNascidoId,
    DateTime DataInicio,
    DateTime? DataFim,
    double FrequenciaHoras,
    List<DietaItemRequest> Itens
);

public record UpdateDietaRequest(
    DateTime DataInicio,
    DateTime? DataFim,
    double FrequenciaHoras,
    List<DietaItemRequest> Itens
);

public record DietaItemRequest(
    Guid AlimentoId,
    decimal Quantidade,
    decimal? EnergiaTotalKcal,
    decimal? ProteinaTotalG
);
