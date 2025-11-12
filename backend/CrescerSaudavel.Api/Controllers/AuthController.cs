using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly UserManager<ProfissionalSaude> _userManager;
    private readonly SignInManager<ProfissionalSaude> _signInManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IConfiguration _configuration;
    private readonly CrescerSaudavelDbContext _context;

    public AuthController(
        UserManager<ProfissionalSaude> userManager,
        SignInManager<ProfissionalSaude> signInManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IConfiguration configuration,
        CrescerSaudavelDbContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _context = context;
    }

    [HttpGet("tipos-conselho")]
    public async Task<IActionResult> GetTiposConselho()
    {
        var tipos = await _context.TiposConselho
            .Where(t => t.Ativo)
            .OrderBy(t => t.TipoProfissional)
            .ToListAsync();

        return Ok(tipos);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Senha))
            {
                return BadRequest(new { message = "Email e senha são obrigatórios" });
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Credenciais inválidas" });
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Senha, false);
            if (!result.Succeeded)
            {
                if (result.IsLockedOut)
                    return Unauthorized(new { message = "Usuário bloqueado" });
                if (result.IsNotAllowed)
                    return Unauthorized(new { message = "Login não permitido" });
                return Unauthorized(new { message = "Credenciais inválidas" });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var unidades = await _context.ProfissionaisUnidades
                .Where(p => p.ProfissionalSaudeId == user.Id)
                .OrderByDescending(p => p.Principal)
                .ThenBy(p => p.CriadoEm)
                .Select(p => new { p.TenantId, p.Principal })
                .ToListAsync();

            var tenantPrincipalId = unidades.FirstOrDefault(u => u.Principal)?.TenantId
                ?? user.TenantId
                ?? unidades.FirstOrDefault()?.TenantId;

            if (tenantPrincipalId != null && user.TenantId != tenantPrincipalId)
            {
                user.TenantId = tenantPrincipalId;
                await _userManager.UpdateAsync(user);
            }

            Guid? grupoSaudeId = user.GrupoSaudeId;
            if (grupoSaudeId == null && tenantPrincipalId != null)
            {
                grupoSaudeId = await _context.Tenants
                    .Where(t => t.Id == tenantPrincipalId.Value)
                    .Select(t => t.GrupoSaudeId)
                    .FirstOrDefaultAsync();

                if (grupoSaudeId != null)
                {
                    user.GrupoSaudeId = grupoSaudeId;
                    await _userManager.UpdateAsync(user);
                }
            }

            var claims = BuildClaims(user, roles, tenantPrincipalId, grupoSaudeId, unidades.Select(u => u.TenantId));
            var token = GenerateJwtToken(claims);

            return Ok(new
            {
                token,
                user = new
                {
                    user.Id,
                    user.Nome,
                    user.Email,
                    roles,
                    tenantId = tenantPrincipalId,
                    grupoSaudeId,
                    principalTenantId = tenantPrincipalId,
                    tenantIds = unidades.Select(u => u.TenantId).Distinct().ToArray()
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                error = ex.Message, 
                stackTrace = ex.StackTrace,
                innerException = ex.InnerException?.Message 
            });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
            return BadRequest(new { message = "Email já cadastrado" });

        var tenantIds = (request.TenantIds ?? Array.Empty<Guid>())
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (request.TenantId.HasValue &&
            request.TenantId.Value != Guid.Empty &&
            !tenantIds.Contains(request.TenantId.Value))
        {
            tenantIds.Insert(0, request.TenantId.Value);
        }

        Guid? tenantPrincipalId = null;

        if (request.PrincipalTenantId.HasValue &&
            tenantIds.Contains(request.PrincipalTenantId.Value))
        {
            tenantPrincipalId = request.PrincipalTenantId.Value;
        }

        if (tenantPrincipalId == null &&
            request.TenantId.HasValue &&
            request.TenantId.Value != Guid.Empty)
        {
            tenantPrincipalId = request.TenantId.Value;
            if (!tenantIds.Contains(tenantPrincipalId.Value))
            {
                tenantIds.Insert(0, tenantPrincipalId.Value);
            }
        }

        if (tenantPrincipalId == null)
        {
            tenantPrincipalId = tenantIds.FirstOrDefault();
        }

        tenantIds = tenantIds.Distinct().ToList();

        var user = new ProfissionalSaude
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            Nome = request.Nome,
            TipoConselhoId = request.TipoConselhoId,
            NumeroRegistro = request.NumeroRegistro,
            TenantId = tenantPrincipalId,
            GrupoSaudeId = request.GrupoSaudeId,
            Ativo = true,
            EmailConfirmed = true
        };

        if (user.GrupoSaudeId == null && tenantPrincipalId != null)
        {
            user.GrupoSaudeId = await _context.Tenants
                .Where(t => t.Id == tenantPrincipalId.Value)
                .Select(t => t.GrupoSaudeId)
                .FirstOrDefaultAsync();
        }

        var result = await _userManager.CreateAsync(user, request.Senha);
        if (!result.Succeeded)
            return BadRequest(new { message = "Erro ao criar usuário", errors = result.Errors });

        var role = string.IsNullOrWhiteSpace(request.Role) ? SystemRoles.Operador : request.Role.Trim();
        if (!await _roleManager.RoleExistsAsync(role))
        {
            await _roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }
        await _userManager.AddToRoleAsync(user, role);

        if (tenantIds.Count > 0)
        {
            foreach (var tenantId in tenantIds)
            {
                _context.ProfissionaisUnidades.Add(new ProfissionalSaudeUnidade
                {
                    Id = Guid.NewGuid(),
                    ProfissionalSaudeId = user.Id,
                    TenantId = tenantId,
                    Principal = tenantId == tenantPrincipalId,
                    CriadoEm = DateTimeOffset.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }

        var claims = BuildClaims(user, new[] { role }, tenantPrincipalId, user.GrupoSaudeId, tenantIds);
        var token = GenerateJwtToken(claims);

        return Ok(new
        {
            token,
            user = new
            {
                user.Id,
                user.Nome,
                user.Email,
                roles = new[] { role },
                tenantId = tenantPrincipalId,
                grupoSaudeId = user.GrupoSaudeId,
                principalTenantId = tenantPrincipalId,
                tenantIds = tenantIds
            }
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado" });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.NovaSenha);

        if (!result.Succeeded)
            return BadRequest(new { message = "Erro ao resetar senha", errors = result.Errors });

        return Ok(new { message = "Senha resetada com sucesso" });
    }

    private string GenerateJwtToken(IEnumerable<Claim> claims)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.Now.AddHours(Convert.ToDouble(_configuration["Jwt:ExpiresInHours"]));

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private List<Claim> BuildClaims(
        ProfissionalSaude user,
        IEnumerable<string> roles,
        Guid? tenantPrincipalId,
        Guid? grupoSaudeId,
        IEnumerable<Guid> tenantIds)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.Nome),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        if (tenantPrincipalId.HasValue)
        {
            claims.Add(new Claim("tenant_id", tenantPrincipalId.Value.ToString()));
        }

        var tenantList = tenantIds?.Distinct().ToList() ?? new List<Guid>();
        if (tenantList.Count > 0)
        {
            claims.Add(new Claim("tenant_ids", string.Join(",", tenantList)));
        }

        if (grupoSaudeId.HasValue)
        {
            claims.Add(new Claim("grupo_id", grupoSaudeId.Value.ToString()));
        }

        return claims;
    }
}

public record LoginRequest(string Email, string Senha);

public record RegisterRequest(
    string Email,
    string Senha,
    string Nome,
    int TipoConselhoId,
    string NumeroRegistro,
    Guid? GrupoSaudeId,
    Guid? TenantId,
    IEnumerable<Guid>? TenantIds,
    Guid? PrincipalTenantId,
    string? Role);

public record ResetPasswordRequest(string Email, string NovaSenha);
