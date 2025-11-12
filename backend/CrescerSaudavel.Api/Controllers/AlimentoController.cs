using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;
using System.Linq;
using System;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlimentosController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public AlimentosController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var tenantIds = _currentUserService.TenantIds.ToHashSet();
            if (tenantIds.Count == 0)
                return Ok(Array.Empty<Alimento>());

            var alimentos = await _context.Alimentos
                .Where(a => a.Ativo && !a.Excluido && tenantIds.Contains(a.TenantId))
                .OrderBy(a => a.Nome)
                .ToListAsync();

            return Ok(alimentos);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        var alimento = await _context.Alimentos.FindAsync(id);

        if (alimento == null)
            return NotFound();

        if (!tenantIds.Contains(alimento.TenantId))
            return Forbid();

        return Ok(alimento);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Alimento alimento)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        if (alimento.TenantId == Guid.Empty && tenantIds.Count == 1)
        {
            alimento.TenantId = tenantIds.First();
        }

        if (!tenantIds.Contains(alimento.TenantId))
            return Forbid();

        _context.Alimentos.Add(alimento);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = alimento.Id }, alimento);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Alimento alimento)
    {
        if (id != alimento.Id)
            return BadRequest();

        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
            return Forbid();

        if (!tenantIds.Contains(alimento.TenantId))
            return Forbid();

        _context.Entry(alimento).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Alimentos.AnyAsync(a => a.Id == id))
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

        var alimento = await _context.Alimentos.FindAsync(id);

        if (alimento == null)
            return NotFound();

        if (!tenantIds.Contains(alimento.TenantId))
            return Forbid();

        alimento.Excluido = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

