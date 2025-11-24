using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/profissionais")]
[Authorize]
public class ProfissionalController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly UserManager<ProfissionalSaude> _userManager;
    private readonly ICurrentUserService _currentUserService;

    public ProfissionalController(
        CrescerSaudavelDbContext context,
        UserManager<ProfissionalSaude> userManager,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _userManager = userManager;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();

        IQueryable<ProfissionalSaude> query = _context.Users
            .Include(p => p.TipoConselho)
            .Where(p => p.Ativo);

        if (!_currentUserService.IsInRole(SystemRoles.SuperAdmin))
        {
            if (tenantIds.Count == 0)
            {
                return Ok(Array.Empty<object>());
            }

            query = query.Where(p =>
                p.GrupoSaudeId == _currentUserService.GrupoSaudeId ||
                p.UnidadesPermitidas.Any(up => tenantIds.Contains(up.TenantId)));
        }

        var profissionais = await query
            .OrderBy(p => p.Nome)
            .Select(p => new
            {
                p.Id,
                p.Nome,
                p.Email,
                TipoConselho = new
                {
                    p.TipoConselho!.Sigla,
                    p.TipoConselho.TipoProfissional
                },
                p.NumeroRegistro,
                p.Especialidade,
                p.Ativo,
                p.CriadoEm,
                Tenants = p.UnidadesPermitidas
                    .Select(up => new { up.TenantId, up.Principal })
                    .ToList()
            })
            .ToListAsync();

        return Ok(profissionais);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        var profissional = await _context.Users
            .Include(p => p.TipoConselho)
            .Include(p => p.UnidadesPermitidas)
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Nome,
                p.Email,
                p.TipoConselhoId,
                TipoConselho = new
                {
                    p.TipoConselho!.Sigla,
                    p.TipoConselho.TipoProfissional
                },
                p.NumeroRegistro,
                p.Especialidade,
                p.Ativo,
                p.CriadoEm,
                p.GrupoSaudeId,
                p.TenantId,
                Tenants = p.UnidadesPermitidas
                    .Select(up => new { up.TenantId, up.Principal })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (profissional == null)
            return NotFound();

        if (!_currentUserService.IsInRole(SystemRoles.SuperAdmin))
        {
            var possuiAcesso = await _context.Users
                .Where(p => p.Id == id)
                .AnyAsync(p =>
                    p.GrupoSaudeId == _currentUserService.GrupoSaudeId ||
                    p.UnidadesPermitidas.Any(up => tenantIds.Contains(up.TenantId)));

            if (!possuiAcesso)
                return Forbid();
        }

        return Ok(profissional);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProfissionalRequest request)
    {
        var tenantIdsUsuario = _currentUserService.TenantIds.ToHashSet();
        var profissional = await _userManager.Users
            .Include(p => p.UnidadesPermitidas)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (profissional == null)
            return NotFound();

        if (!_currentUserService.IsInRole(SystemRoles.SuperAdmin))
        {
            var possuiAcesso = profissional.GrupoSaudeId == _currentUserService.GrupoSaudeId ||
                                profissional.UnidadesPermitidas.Any(up => tenantIdsUsuario.Contains(up.TenantId));

            if (!possuiAcesso)
                return Forbid();
        }

        profissional.Nome = request.Nome;
        profissional.TipoConselhoId = request.TipoConselhoId;
        profissional.NumeroRegistro = request.NumeroRegistro;
        profissional.Especialidade = request.Especialidade;
        profissional.Ativo = request.Ativo;

        List<Guid>? desiredTenantIds = null;
        if (request.TenantIds != null)
        {
            desiredTenantIds = request.TenantIds
                .Where(id => id != Guid.Empty)
                .Distinct()
                .ToList();

            if (!_currentUserService.IsInRole(SystemRoles.SuperAdmin))
            {
                if (_currentUserService.IsInRole(SystemRoles.AdminGrupo))
                {
                    var grupoIdAtual = _currentUserService.GrupoSaudeId;
                    if (grupoIdAtual == null)
                    {
                        return Forbid();
                    }

                    var allowedTenantIds = await _context.Tenants
                        .Where(t => t.GrupoSaudeId == grupoIdAtual)
                        .Select(t => t.Id)
                        .ToListAsync();

                    if (desiredTenantIds.Except(allowedTenantIds).Any())
                    {
                        return Forbid();
                    }
                }
                else
                {
                    if (desiredTenantIds.Except(tenantIdsUsuario).Any())
                    {
                        return Forbid();
                    }
                }
            }
        }

        var currentAssignments = profissional.UnidadesPermitidas.ToList();
        var currentTenantIds = currentAssignments.Select(a => a.TenantId).Distinct().ToList();
        var tenantIdsFinal = desiredTenantIds ?? currentTenantIds;

        Guid? principalAtual = currentAssignments.FirstOrDefault(a => a.Principal)?.TenantId ?? profissional.TenantId;
        Guid? principalFinal = principalAtual;

        if (request.PrincipalTenantId.HasValue && request.PrincipalTenantId.Value != Guid.Empty)
        {
            var principalInformado = request.PrincipalTenantId.Value;

            if (tenantIdsFinal.Contains(principalInformado))
            {
                principalFinal = principalInformado;
            }
            else if (desiredTenantIds == null && currentTenantIds.Contains(principalInformado))
            {
                principalFinal = principalInformado;
            }
            else
            {
                return BadRequest(new { message = "A unidade principal precisa estar entre as unidades vinculadas." });
            }
        }

        if (tenantIdsFinal.Count == 0)
        {
            principalFinal = null;
        }
        else if (principalFinal == null || !tenantIdsFinal.Contains(principalFinal.Value))
        {
            principalFinal = tenantIdsFinal.First();
        }

        if (desiredTenantIds != null)
        {
            foreach (var vinculo in currentAssignments.Where(v => !tenantIdsFinal.Contains(v.TenantId)).ToList())
            {
                _context.ProfissionaisUnidades.Remove(vinculo);
            }

            foreach (var tenantId in tenantIdsFinal)
            {
                if (!currentAssignments.Any(v => v.TenantId == tenantId))
                {
                    profissional.UnidadesPermitidas.Add(new ProfissionalSaudeUnidade
                    {
                        Id = Guid.NewGuid(),
                        ProfissionalSaudeId = profissional.Id,
                        TenantId = tenantId,
                        Principal = false
                    });
                }
            }
        }

        foreach (var vinculo in profissional.UnidadesPermitidas)
        {
            vinculo.Principal = principalFinal.HasValue && vinculo.TenantId == principalFinal.Value;
        }

        profissional.TenantId = principalFinal;

        if (_currentUserService.IsInRole(SystemRoles.SuperAdmin) && request.GrupoSaudeId.HasValue)
        {
            profissional.GrupoSaudeId = request.GrupoSaudeId;
        }

        if (principalFinal.HasValue)
        {
            var grupoDaUnidade = await _context.Tenants
                .Where(t => t.Id == principalFinal.Value)
                .Select(t => t.GrupoSaudeId)
                .FirstOrDefaultAsync();

            if (grupoDaUnidade != default)
            {
                profissional.GrupoSaudeId = grupoDaUnidade;
            }
        }

        var result = await _userManager.UpdateAsync(profissional);
        if (!result.Succeeded)
            return BadRequest(new { message = "Erro ao atualizar profissional", errors = result.Errors });

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        var profissional = await _userManager.Users
            .Include(p => p.UnidadesPermitidas)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (profissional == null)
            return NotFound();

        if (!_currentUserService.IsInRole(SystemRoles.SuperAdmin))
        {
            var possuiAcesso = profissional.GrupoSaudeId == _currentUserService.GrupoSaudeId ||
                                profissional.UnidadesPermitidas.Any(up => tenantIds.Contains(up.TenantId));

            if (!possuiAcesso)
                return Forbid();
        }

        // Soft delete
        profissional.Ativo = false;
        await _userManager.UpdateAsync(profissional);

        return NoContent();
    }
}

public record UpdateProfissionalRequest(
    string Nome,
    int TipoConselhoId,
    string NumeroRegistro,
    string? Especialidade,
    bool Ativo,
    IEnumerable<Guid>? TenantIds,
    Guid? PrincipalTenantId,
    Guid? GrupoSaudeId
);










