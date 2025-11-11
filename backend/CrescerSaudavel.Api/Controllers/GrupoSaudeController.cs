using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/grupos-saude")]
[Authorize(Roles = SystemRoles.SuperAdmin)]
public class GrupoSaudeController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;

    public GrupoSaudeController(CrescerSaudavelDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var grupos = await _context.GruposSaude
            .OrderBy(g => g.Nome)
            .Select(g => new
            {
                g.Id,
                g.Nome,
                g.Tipo,
                g.Cnpj,
                g.Telefone,
                g.Endereco,
                g.Cidade,
                g.Estado,
                g.Cep,
                g.Ativo,
                g.CriadoEm
            })
            .ToListAsync();

        return Ok(grupos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var grupo = await _context.GruposSaude.FindAsync(id);
        if (grupo == null)
            return NotFound();

        return Ok(grupo);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GrupoSaudeRequest request)
    {
        var grupo = new GrupoSaude
        {
            Id = Guid.NewGuid(),
            Nome = request.Nome,
            Tipo = request.Tipo,
            Cnpj = request.Cnpj,
            Telefone = request.Telefone,
            Endereco = request.Endereco,
            Cidade = request.Cidade,
            Estado = request.Estado,
            Cep = request.Cep,
            Ativo = true
        };

        _context.GruposSaude.Add(grupo);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = grupo.Id }, grupo);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GrupoSaudeRequest request)
    {
        var grupo = await _context.GruposSaude.FindAsync(id);
        if (grupo == null)
            return NotFound();

        grupo.Nome = request.Nome;
        grupo.Tipo = request.Tipo;
        grupo.Cnpj = request.Cnpj;
        grupo.Telefone = request.Telefone;
        grupo.Endereco = request.Endereco;
        grupo.Cidade = request.Cidade;
        grupo.Estado = request.Estado;
        grupo.Cep = request.Cep;
        grupo.Ativo = request.Ativo;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var grupo = await _context.GruposSaude.FindAsync(id);
        if (grupo == null)
            return NotFound();

        grupo.Ativo = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public record GrupoSaudeRequest(
    string Nome,
    string Tipo,
    string? Cnpj,
    string? Telefone,
    string? Endereco,
    string? Cidade,
    string? Estado,
    string? Cep,
    bool Ativo = true
);
