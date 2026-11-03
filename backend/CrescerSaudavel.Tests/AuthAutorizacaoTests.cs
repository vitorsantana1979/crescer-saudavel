using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace CrescerSaudavel.Tests;

// Sobe o Program.cs de verdade, com banco em memória, para exercitar o pipeline de autorização.
public class AuthAutorizacaoTests : IClassFixture<AuthAutorizacaoTests.ApiDeTeste>
{
    private const string JwtKey = "chave-usada-somente-nos-testes-automatizados";
    private const string JwtIssuer = "CrescerSaudavelTestes";
    private const string JwtAudience = "CrescerSaudavelTestes";
    private const string SenhaInicial = "senha-inicial";

    private static readonly Guid GrupoA = Guid.NewGuid();
    private static readonly Guid GrupoB = Guid.NewGuid();
    private static readonly Guid UnidadeA1 = Guid.NewGuid();
    private static readonly Guid UnidadeA2 = Guid.NewGuid();
    private static readonly Guid UnidadeB1 = Guid.NewGuid();

    private readonly ApiDeTeste _api;

    public AuthAutorizacaoTests(ApiDeTeste api)
    {
        _api = api;
    }

    public class ApiDeTeste : WebApplicationFactory<Program>
    {
        private readonly string _nomeBanco = Guid.NewGuid().ToString();

        public ApiDeTeste()
        {
            // O Program.cs lê essas chaves antes do Build, então precisam estar no ambiente.
            Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", "Server=nao-usado;");
            Environment.SetEnvironmentVariable("Jwt__Key", JwtKey);
            Environment.SetEnvironmentVariable("Jwt__Issuer", JwtIssuer);
            Environment.SetEnvironmentVariable("Jwt__Audience", JwtAudience);
            Environment.SetEnvironmentVariable("Jwt__ExpiresInHours", "1");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<CrescerSaudavelDbContext>>();
                services.AddDbContext<CrescerSaudavelDbContext>(options =>
                    options.UseInMemoryDatabase(_nomeBanco));
            });
        }
    }

    private async Task PrepararDadosAsync()
    {
        using var scope = _api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrescerSaudavelDbContext>();
        if (await context.Tenants.AnyAsync())
            return;

        context.TiposConselho.Add(new TipoConselho { Id = 99, Sigla = "CRM", Nome = "Medicina", TipoProfissional = "Médico" });
        context.Tenants.AddRange(
            new Tenant { Id = UnidadeA1, GrupoSaudeId = GrupoA, Nome = "Unidade A1" },
            new Tenant { Id = UnidadeA2, GrupoSaudeId = GrupoA, Nome = "Unidade A2" },
            new Tenant { Id = UnidadeB1, GrupoSaudeId = GrupoB, Nome = "Unidade B1" });
        await context.SaveChangesAsync();
    }

    private async Task<string> CriarUsuarioAsync()
    {
        using var scope = _api.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ProfissionalSaude>>();
        var email = NovoEmail();
        var resultado = await userManager.CreateAsync(new ProfissionalSaude
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            Nome = "Alvo",
            NumeroRegistro = "1"
        }, SenhaInicial);
        Assert.True(resultado.Succeeded);
        return email;
    }

    private async Task<ProfissionalSaude?> BuscarUsuarioAsync(string email)
    {
        using var scope = _api.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ProfissionalSaude>>();
        return await userManager.FindByEmailAsync(email);
    }

    private async Task<bool> SenhaConfereAsync(string email, string senha)
    {
        using var scope = _api.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ProfissionalSaude>>();
        var usuario = await userManager.FindByEmailAsync(email);
        return usuario != null && await userManager.CheckPasswordAsync(usuario, senha);
    }

    private static string NovoEmail() => $"{Guid.NewGuid():N}@teste.local";

    private static string Token(string role, Guid? grupo, params Guid[] unidades)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, role)
        };
        if (grupo.HasValue)
            claims.Add(new Claim("grupo_id", grupo.Value.ToString()));
        if (unidades.Length > 0)
            claims.Add(new Claim("tenant_ids", string.Join(",", unidades)));

        var chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey));
        var token = new JwtSecurityToken(
            JwtIssuer,
            JwtAudience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(chave, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient Cliente(string? token = null)
    {
        var cliente = _api.CreateClient();
        if (token != null)
            cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return cliente;
    }

    private static object Cadastro(string email, string? role, Guid? grupo = null, params Guid[] unidades) => new
    {
        email,
        senha = "senha-do-novo-usuario",
        nome = "Novo Profissional",
        tipoConselhoId = 99,
        numeroRegistro = "123",
        grupoSaudeId = grupo,
        tenantIds = unidades,
        principalTenantId = unidades.Length > 0 ? unidades[0] : (Guid?)null,
        role
    };

    // Sem cabeçalho Authorization o OnChallenge do Program.cs responde 200 vazio em vez de 401.
    // O que importa aqui é a rota não executar: nada muda no banco e a resposta vem sem corpo.
    [Fact]
    public async Task ResetPassword_SemLogin_NaoAlteraSenha()
    {
        await PrepararDadosAsync();
        var email = await CriarUsuarioAsync();

        var resposta = await Cliente().PostAsJsonAsync("/api/auth/reset-password", new { email, novaSenha = "tomada" });

        Assert.Empty(await resposta.Content.ReadAsStringAsync());
        Assert.True(await SenhaConfereAsync(email, SenhaInicial));
        Assert.False(await SenhaConfereAsync(email, "tomada"));
    }

    [Fact]
    public async Task ResetPassword_EmailInexistenteSemLogin_NaoChegaNaRota()
    {
        await PrepararDadosAsync();

        var resposta = await Cliente().PostAsJsonAsync("/api/auth/reset-password", new { email = NovoEmail(), novaSenha = "tomada" });

        Assert.NotEqual(HttpStatusCode.NotFound, resposta.StatusCode);
        Assert.Empty(await resposta.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData(SystemRoles.AdminGrupo)]
    [InlineData(SystemRoles.AdminUnidade)]
    [InlineData(SystemRoles.Operador)]
    public async Task ResetPassword_PerfilSemPermissao_Retorna403(string role)
    {
        await PrepararDadosAsync();
        var email = await CriarUsuarioAsync();

        var resposta = await Cliente(Token(role, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/reset-password", new { email, novaSenha = "tomada" });

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.True(await SenhaConfereAsync(email, SenhaInicial));
    }

    [Fact]
    public async Task ResetPassword_SuperAdmin_AlteraSenha()
    {
        await PrepararDadosAsync();
        var email = await CriarUsuarioAsync();

        var resposta = await Cliente(Token(SystemRoles.SuperAdmin, null))
            .PostAsJsonAsync("/api/auth/reset-password", new { email, novaSenha = "senha-nova" });

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.True(await SenhaConfereAsync(email, "senha-nova"));
    }

    [Fact]
    public async Task Register_SemLogin_NaoCriaUsuario()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente().PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.SuperAdmin));

        Assert.Empty(await resposta.Content.ReadAsStringAsync());
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_TokenInvalido_Retorna401()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente("token-invalido").PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.Operador));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_Operador_Retorna403()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.Operador, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.Operador, GrupoA, UnidadeA1));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Theory]
    [InlineData(SystemRoles.AdminUnidade, SystemRoles.SuperAdmin)]
    [InlineData(SystemRoles.AdminUnidade, SystemRoles.AdminGrupo)]
    [InlineData(SystemRoles.AdminUnidade, "superadmin")]
    [InlineData(SystemRoles.AdminUnidade, "PapelInventado")]
    [InlineData(SystemRoles.AdminGrupo, SystemRoles.SuperAdmin)]
    [InlineData(SystemRoles.AdminGrupo, "superadmin")]
    public async Task Register_PapelAcimaDoPermitido_Retorna403(string quemCadastra, string papelPedido)
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(quemCadastra, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, papelPedido, GrupoA, UnidadeA1));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_AdminUnidadeEmUnidadeAlheia_Retorna403()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.AdminUnidade, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.Operador, GrupoA, UnidadeA2));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_AdminGrupoEmUnidadeDeOutroGrupo_Retorna403()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.AdminGrupo, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.Operador, GrupoA, UnidadeB1));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_AdminDeclarandoOutroGrupo_Retorna403()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.AdminUnidade, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.Operador, GrupoB, UnidadeA1));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Null(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_AdminUnidadeNaPropriaUnidade_CriaUsuario()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.AdminUnidade, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.Operador, GrupoA, UnidadeA1));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var usuario = await BuscarUsuarioAsync(email);
        Assert.NotNull(usuario);
        Assert.Equal(UnidadeA1, usuario!.TenantId);
    }

    [Fact]
    public async Task Register_AdminGrupoEmOutraUnidadeDoGrupo_CriaUsuario()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.AdminGrupo, GrupoA, UnidadeA1))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.AdminGrupo, GrupoA, UnidadeA2));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.NotNull(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Register_SuperAdmin_CriaOutroSuperAdmin()
    {
        await PrepararDadosAsync();
        var email = NovoEmail();

        var resposta = await Cliente(Token(SystemRoles.SuperAdmin, null))
            .PostAsJsonAsync("/api/auth/register", Cadastro(email, SystemRoles.SuperAdmin, GrupoB, UnidadeB1));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.NotNull(await BuscarUsuarioAsync(email));
    }

    [Fact]
    public async Task Login_SemToken_ContinuaAcessivel()
    {
        await PrepararDadosAsync();
        var email = await CriarUsuarioAsync();

        var certa = await Cliente().PostAsJsonAsync("/api/auth/login", new { email, senha = SenhaInicial });
        var errada = await Cliente().PostAsJsonAsync("/api/auth/login", new { email, senha = "errada" });

        Assert.Equal(HttpStatusCode.OK, certa.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, errada.StatusCode);
    }

    [Fact]
    public async Task TiposConselho_SemToken_ContinuaAcessivel()
    {
        await PrepararDadosAsync();

        var resposta = await Cliente().GetAsync("/api/auth/tipos-conselho");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("CRM", await resposta.Content.ReadAsStringAsync());
    }
}
