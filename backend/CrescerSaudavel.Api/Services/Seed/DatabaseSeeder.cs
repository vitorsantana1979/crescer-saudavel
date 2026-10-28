using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Services.Seed;

public class DatabaseSeeder : IDatabaseSeeder
{
    private static readonly string[] Roles =
    {
        SystemRoles.SuperAdmin,
        SystemRoles.AdminGrupo,
        SystemRoles.AdminUnidade,
        SystemRoles.Operador
    };

    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly UserManager<ProfissionalSaude> _userManager;
    private readonly CrescerSaudavelDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseSeeder> _logger;

    private const string DefaultSuperAdminEmail = "superadmin@crescersaudavel.com";
    // Senha de desenvolvimento, pública no repositório. Em qualquer ambiente real defina
    // Seed:SuperAdminPassword (variável Seed__SuperAdminPassword) antes do primeiro start.
    private const string DefaultSuperAdminPassword = "Super@123";

    public DatabaseSeeder(
        RoleManager<IdentityRole<Guid>> roleManager,
        UserManager<ProfissionalSaude> userManager,
        CrescerSaudavelDbContext context,
        IConfiguration configuration,
        ILogger<DatabaseSeeder> logger)
    {
        _roleManager = roleManager;
        _userManager = userManager;
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        await EnsureRolesAsync();
        await EnsureSuperAdminAsync();
        await EnsureExistingUsersAsync();
    }

    private async Task EnsureRolesAsync()
    {
        foreach (var role in Roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }
        }
    }

    private async Task EnsureSuperAdminAsync()
    {
        var superAdmin = await _userManager.FindByEmailAsync(DefaultSuperAdminEmail);
        if (superAdmin != null)
        {
            if (!await _userManager.IsInRoleAsync(superAdmin, SystemRoles.SuperAdmin))
            {
                await _userManager.AddToRoleAsync(superAdmin, SystemRoles.SuperAdmin);
            }
            return;
        }

        superAdmin = new ProfissionalSaude
        {
            Id = Guid.NewGuid(),
            UserName = DefaultSuperAdminEmail,
            Email = DefaultSuperAdminEmail,
            Nome = "Super Administrador",
            TipoConselhoId = 1,
            NumeroRegistro = "SUPERADMIN",
            EmailConfirmed = true,
            Ativo = true,
            CriadoEm = DateTimeOffset.UtcNow
        };

        var senhaInicial = _configuration["Seed:SuperAdminPassword"];
        if (string.IsNullOrWhiteSpace(senhaInicial))
        {
            senhaInicial = DefaultSuperAdminPassword;
            _logger.LogWarning(
                "Seed:SuperAdminPassword não configurada; o SuperAdmin inicial será criado com a senha padrão de desenvolvimento. Troque-a no primeiro acesso.");
        }

        var createResult = await _userManager.CreateAsync(superAdmin, senhaInicial);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException($"Falha ao criar SuperAdmin: {string.Join(",", createResult.Errors.Select(e => e.Description))}");
        }

        await _userManager.AddToRoleAsync(superAdmin, SystemRoles.SuperAdmin);
    }

    private async Task EnsureExistingUsersAsync()
    {
        var usuarios = await _userManager.Users.ToListAsync();
        if (usuarios.Count == 0)
        {
            return;
        }

        var agora = DateTimeOffset.UtcNow;

        foreach (var usuario in usuarios)
        {
            var roles = await _userManager.GetRolesAsync(usuario);
            if (roles == null || roles.Count == 0)
            {
                await _userManager.AddToRoleAsync(usuario, SystemRoles.AdminUnidade);
            }

            if (usuario.TenantId != null)
            {
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == usuario.TenantId);
                if (tenant != null)
                {
                    if (usuario.GrupoSaudeId == null)
                    {
                        usuario.GrupoSaudeId = tenant.GrupoSaudeId;
                    }

                    var existeVinculo = await _context.ProfissionaisUnidades
                        .AnyAsync(p => p.ProfissionalSaudeId == usuario.Id && p.TenantId == tenant.Id);

                    if (!existeVinculo)
                    {
                        _context.ProfissionaisUnidades.Add(new ProfissionalSaudeUnidade
                        {
                            Id = Guid.NewGuid(),
                            ProfissionalSaudeId = usuario.Id,
                            TenantId = tenant.Id,
                            Principal = true,
                            CriadoEm = agora
                        });
                    }
                }
            }

            await _userManager.UpdateAsync(usuario);
        }

        await _context.SaveChangesAsync();
    }

    public static class RoleNames
    {
        public const string SuperAdmin = "SuperAdmin";
        public const string AdminGrupo = "AdminGrupo";
        public const string AdminUnidade = "AdminUnidade";
        public const string Operador = "Operador";
    }
}
