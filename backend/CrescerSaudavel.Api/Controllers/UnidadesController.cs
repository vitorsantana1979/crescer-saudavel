using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Time;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/unidades")]
[Authorize]
public class UnidadesController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UnidadesController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    private bool IsSuperAdmin => _currentUserService.IsInRole(SystemRoles.SuperAdmin);
    private bool IsAdminGrupo => _currentUserService.IsInRole(SystemRoles.AdminGrupo) || IsSuperAdmin;
    private bool IsAdminUnidade => _currentUserService.IsInRole(SystemRoles.AdminUnidade) || IsAdminGrupo;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = _context.Tenants.AsQueryable();

        if (!IsSuperAdmin)
        {
            var grupoId = _currentUserService.GrupoSaudeId;
            var tenantIds = _currentUserService.TenantIds;

            if (_currentUserService.IsInRole(SystemRoles.AdminGrupo) && grupoId != null)
            {
                query = query.Where(t => t.GrupoSaudeId == grupoId);
            }
            else
            {
                query = query.Where(t => tenantIds.Contains(t.Id));
            }
        }

        var unidades = await query
            .Include(t => t.GrupoSaude)
            .OrderBy(t => t.Nome)
            .Select(t => new
            {
                t.Id,
                t.Nome,
                t.Tipo,
                t.TipoUnidade,
                t.Cnpj,
                t.Telefone,
                t.Endereco,
                t.Cidade,
                t.Estado,
                t.Cep,
                t.GrupoSaudeId,
                GrupoSaudeNome = t.GrupoSaude != null ? t.GrupoSaude.Nome : null,
                t.Ativo,
                t.CriadoEm
            })
            .ToListAsync();

        return Ok(unidades);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var unidade = await _context.Tenants
            .Include(t => t.GrupoSaude)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (unidade == null)
            return NotFound();

        if (!IsSuperAdmin)
        {
            var grupoId = _currentUserService.GrupoSaudeId;
            var tenantIds = _currentUserService.TenantIds;
            var autorizado =
                (_currentUserService.IsInRole(SystemRoles.AdminGrupo) && grupoId == unidade.GrupoSaudeId) ||
                tenantIds.Contains(unidade.Id);

            if (!autorizado)
                return Forbid();
        }

        return Ok(unidade);
    }

    [HttpPost]
    [Authorize(Roles = SystemRoles.SuperAdmin + "," + SystemRoles.AdminGrupo)]
    public async Task<IActionResult> Create([FromBody] UnidadeRequest request)
    {
        var grupoId = request.GrupoSaudeId ?? _currentUserService.GrupoSaudeId;
        if (!IsSuperAdmin && grupoId == null)
        {
            return Forbid();
        }

        if (!IsSuperAdmin && grupoId != _currentUserService.GrupoSaudeId)
        {
            return Forbid();
        }

        var unidade = new Tenant
        {
            Id = Guid.NewGuid(),
            GrupoSaudeId = grupoId ?? request.GrupoSaudeId!.Value,
            Nome = request.Nome,
            Tipo = request.Tipo ?? "hospital",
            TipoUnidade = request.TipoUnidade,
            Cnpj = request.Cnpj,
            Telefone = request.Telefone,
            Endereco = request.Endereco,
            Cidade = request.Cidade,
            Estado = request.Estado,
            Cep = request.Cep,
            IdadePreTermoLimite = request.IdadePreTermoLimite ?? 37,
            Ativo = true
        };

        _context.Tenants.Add(unidade);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = unidade.Id }, unidade);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = SystemRoles.SuperAdmin + "," + SystemRoles.AdminGrupo)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UnidadeRequest request)
    {
        var unidade = await _context.Tenants.FindAsync(id);
        if (unidade == null)
            return NotFound();

        if (!IsSuperAdmin)
        {
            if (unidade.GrupoSaudeId != _currentUserService.GrupoSaudeId)
                return Forbid();
        }

        if (request.GrupoSaudeId.HasValue)
        {
            if (IsSuperAdmin)
            {
                unidade.GrupoSaudeId = request.GrupoSaudeId.Value;
            }
            else if (request.GrupoSaudeId.Value != _currentUserService.GrupoSaudeId)
            {
                return Forbid();
            }
        }

        unidade.Nome = request.Nome;
        unidade.Tipo = request.Tipo ?? unidade.Tipo;
        unidade.TipoUnidade = request.TipoUnidade;
        unidade.Cnpj = request.Cnpj;
        unidade.Telefone = request.Telefone;
        unidade.Endereco = request.Endereco;
        unidade.Cidade = request.Cidade;
        unidade.Estado = request.Estado;
        unidade.Cep = request.Cep;
        unidade.IdadePreTermoLimite = request.IdadePreTermoLimite ?? unidade.IdadePreTermoLimite;
        unidade.Ativo = request.Ativo ?? unidade.Ativo;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = SystemRoles.SuperAdmin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var unidade = await _context.Tenants.FindAsync(id);
        if (unidade == null)
            return NotFound();

        unidade.Ativo = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public record UnidadeRequest(
    string Nome,
    string? Tipo,
    string? TipoUnidade,
    string? Cnpj,
    string? Telefone,
    string? Endereco,
    string? Cidade,
    string? Estado,
    string? Cep,
    int? IdadePreTermoLimite,
    Guid? GrupoSaudeId,
    bool? Ativo = true
);
