using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;
using System.Linq;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecemNascidoController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public RecemNascidoController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Ok(Array.Empty<RecemNascido>());
        }

        var criancas = await _context.RecemNascidos
            .Where(r => tenantIds.Contains(r.TenantId))
            .OrderByDescending(r => r.DataNascimento)
            .ToListAsync();

        return Ok(criancas);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var crianca = await _context.RecemNascidos.FindAsync(id);

        if (crianca == null)
            return NotFound();

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        return Ok(crianca);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RecemNascido recemNascido)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        if (recemNascido.TenantId == Guid.Empty && tenantIds.Count == 1)
        {
            recemNascido.TenantId = tenantIds.First();
        }

        if (!tenantIds.Contains(recemNascido.TenantId))
            return Forbid();

        _context.RecemNascidos.Add(recemNascido);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = recemNascido.Id }, recemNascido);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] RecemNascido recemNascido)
    {
        if (id != recemNascido.Id)
            return BadRequest();

        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        if (!tenantIds.Contains(recemNascido.TenantId))
            return Forbid();

        _context.Entry(recemNascido).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.RecemNascidos.AnyAsync(r => r.Id == id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var crianca = await _context.RecemNascidos.FindAsync(id);

        if (crianca == null)
            return NotFound();

        if (!tenantIds.Contains(crianca.TenantId))
            return Forbid();

        _context.RecemNascidos.Remove(crianca);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

