using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CrescerSaudavel.Api.Authorization;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace CrescerSaudavel.Tests;

// Mesmo pipeline real de AuthAutorizacaoTests, com login de verdade e OpenAI e ml-service falsos.
public class EscopoUnidadeTests : IClassFixture<EscopoUnidadeTests.ApiComServicosFalsos>
{
    private const string Senha = "senha-de-teste";

    private readonly ApiComServicosFalsos _api;

    public EscopoUnidadeTests(ApiComServicosFalsos api)
    {
        _api = api;
        _api.OpenAI.Limpar();
        _api.Ml.Limpar();
    }

    public class ApiComServicosFalsos : AuthAutorizacaoTests.ApiDeTeste
    {
        public ServicoFalso OpenAI { get; } = new();
        public ServicoFalso Ml { get; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureTestServices(services =>
            {
                services.AddHttpClient("OpenAI").ConfigurePrimaryHttpMessageHandler(() => OpenAI);
                services.AddHttpClient<MLService>().ConfigurePrimaryHttpMessageHandler(() => Ml);
            });
        }
    }

    public class ServicoFalso : HttpMessageHandler
    {
        public List<string> Chamadas { get; } = new();
        public List<string> Corpos { get; } = new();
        public Func<string, string> Responder { get; set; } = _ => "{}";

        public void Limpar()
        {
            Chamadas.Clear();
            Corpos.Clear();
            Responder = _ => "{}";
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var corpo = request.Content == null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            Chamadas.Add(request.RequestUri!.AbsolutePath);
            Corpos.Add(corpo);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(Responder(corpo), Encoding.UTF8, "application/json")
            };
        }

        // O HttpClientFactory recicla o pipeline; o falso continua valendo para os testes seguintes.
        protected override void Dispose(bool disposing) { }
    }

    private sealed record Cenario(
        Guid GrupoA, Guid GrupoB,
        Guid UnidadeA1, Guid UnidadeA2, Guid UnidadeB1,
        Guid CriancaA1, string NomeA1,
        Guid CriancaB1, string NomeB1,
        string Sobrenome);

    private async Task<Cenario> SemearAsync()
    {
        using var scope = _api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrescerSaudavelDbContext>();

        var grupoA = Guid.NewGuid();
        var grupoB = Guid.NewGuid();
        var a1 = Guid.NewGuid();
        var a2 = Guid.NewGuid();
        var b1 = Guid.NewGuid();
        context.Tenants.AddRange(
            new Tenant { Id = a1, GrupoSaudeId = grupoA, Nome = "A1" },
            new Tenant { Id = a2, GrupoSaudeId = grupoA, Nome = "A2" },
            new Tenant { Id = b1, GrupoSaudeId = grupoB, Nome = "B1" });

        var sobrenome = Guid.NewGuid().ToString("N");
        // A criança de B entra primeiro: sem filtro, a busca por nome a encontraria.
        var criancaB = NovaCrianca(b1, $"B-{sobrenome}");
        var criancaA = NovaCrianca(a1, $"A-{sobrenome}");
        context.RecemNascidos.AddRange(criancaB, criancaA);
        await context.SaveChangesAsync();

        return new Cenario(grupoA, grupoB, a1, a2, b1, criancaA.Id, criancaA.Nome, criancaB.Id, criancaB.Nome, sobrenome);
    }

    private static RecemNascido NovaCrianca(Guid unidade, string nome) => new()
    {
        TenantId = unidade,
        Nome = nome,
        Sexo = 'F',
        DataNascimento = DateTime.UtcNow.Date.AddDays(-30),
        IdadeGestacionalSemanas = 38
    };

    private async Task<(string Email, Guid Id)> CriarUsuarioAsync(string papel, Guid? grupo, params Guid[] unidades)
    {
        using var scope = _api.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ProfissionalSaude>>();
        var context = scope.ServiceProvider.GetRequiredService<CrescerSaudavelDbContext>();

        var email = $"{Guid.NewGuid():N}@teste.local";
        var usuario = new ProfissionalSaude
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            Nome = papel,
            NumeroRegistro = "1",
            TipoConselhoId = 1,
            GrupoSaudeId = grupo,
            TenantId = unidades.Length > 0 ? unidades[0] : null
        };
        Assert.True((await userManager.CreateAsync(usuario, Senha)).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(usuario, papel)).Succeeded);

        foreach (var unidade in unidades)
        {
            context.ProfissionaisUnidades.Add(new ProfissionalSaudeUnidade
            {
                ProfissionalSaudeId = usuario.Id,
                TenantId = unidade,
                Principal = unidade == unidades[0]
            });
        }
        await context.SaveChangesAsync();

        return (email, usuario.Id);
    }

    private async Task<string> LoginAsync(string email)
    {
        var resposta = await _api.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, senha = Senha });
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("token").GetString()!;
    }

    private async Task<HttpClient> EntrarComoAsync(string papel, Guid? grupo, params Guid[] unidades)
    {
        var (email, _) = await CriarUsuarioAsync(papel, grupo, unidades);
        return Cliente(await LoginAsync(email));
    }

    private HttpClient Cliente(string token, Guid? cabecalho = null)
    {
        var cliente = _api.CreateClient();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (cabecalho.HasValue)
            cliente.DefaultRequestHeaders.Add("X-Tenant-Id", cabecalho.Value.ToString());
        return cliente;
    }

    private async Task<T> LerAsync<T>(Func<CrescerSaudavelDbContext, Task<T>> leitura)
    {
        using var scope = _api.Services.CreateScope();
        return await leitura(scope.ServiceProvider.GetRequiredService<CrescerSaudavelDbContext>());
    }

    private static object EdicaoProfissional(bool ativo = true, params Guid[] unidades) => new
    {
        nome = "Editado",
        tipoConselhoId = 1,
        numeroRegistro = "1",
        ativo,
        tenantIds = unidades
    };

    private static object EdicaoCrianca(Guid id, Guid unidade, string nome = "Editada") => new
    {
        id,
        tenantId = unidade,
        nome,
        sexo = "F",
        dataNascimento = DateTime.UtcNow.Date.AddDays(-30),
        idadeGestacionalSemanas = 38
    };

    // ==================== Cabeçalho X-Tenant-Id ====================

    [Fact]
    public async Task Cabecalho_UsuarioSemUnidades_NaoEscolheUnidade()
    {
        var c = await SemearAsync();
        var (email, _) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA);

        var resposta = await Cliente(await LoginAsync(email), c.UnidadeB1).GetAsync("/api/RecemNascido");

        Assert.DoesNotContain(c.NomeB1, await resposta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Cabecalho_UsuarioComUnidade_NaoTrocaDeUnidade()
    {
        var c = await SemearAsync();
        var (email, _) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var corpo = await Cliente(await LoginAsync(email), c.UnidadeB1).GetStringAsync("/api/RecemNascido");

        Assert.Contains(c.NomeA1, corpo);
        Assert.DoesNotContain(c.NomeB1, corpo);
    }

    [Fact]
    public async Task Cabecalho_SuperAdminSemUnidades_EscolheUnidade()
    {
        var c = await SemearAsync();
        var (email, _) = await CriarUsuarioAsync(SystemRoles.SuperAdmin, null);

        var corpo = await Cliente(await LoginAsync(email), c.UnidadeB1).GetStringAsync("/api/RecemNascido");

        Assert.Contains(c.NomeB1, corpo);
    }

    [Fact]
    public async Task Cabecalho_AdminQueRemoveAsPropriasUnidades_NaoGanhaOutra()
    {
        var c = await SemearAsync();
        var (email, id) = await CriarUsuarioAsync(SystemRoles.AdminUnidade, c.GrupoA, c.UnidadeA1);
        var removeu = await Cliente(await LoginAsync(email))
            .PutAsJsonAsync($"/api/profissionais/{id}", EdicaoProfissional());
        Assert.Equal(HttpStatusCode.NoContent, removeu.StatusCode);

        var resposta = await Cliente(await LoginAsync(email), c.UnidadeB1).GetAsync("/api/RecemNascido");

        Assert.DoesNotContain(c.NomeB1, await resposta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Register_AdminSemUnidadesComCabecalho_Retorna403()
    {
        var c = await SemearAsync();
        var (email, _) = await CriarUsuarioAsync(SystemRoles.AdminUnidade, c.GrupoA);
        var novo = $"{Guid.NewGuid():N}@teste.local";

        var resposta = await Cliente(await LoginAsync(email), c.UnidadeB1).PostAsJsonAsync("/api/auth/register", new
        {
            email = novo, senha = Senha, nome = "Novo", tipoConselhoId = 1, numeroRegistro = "1",
            tenantIds = new[] { c.UnidadeB1 }, role = SystemRoles.Operador
        });

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.False(await LerAsync(db => db.Users.AnyAsync(u => u.Email == novo)));
    }

    [Fact]
    public async Task Register_AdminSemInformarUnidades_Retorna403()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.AdminUnidade, c.GrupoA, c.UnidadeA1);
        var novo = $"{Guid.NewGuid():N}@teste.local";

        var resposta = await cliente.PostAsJsonAsync("/api/auth/register", new
        {
            email = novo, senha = Senha, nome = "Novo", tipoConselhoId = 1, numeroRegistro = "1",
            role = SystemRoles.Operador
        });

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.False(await LerAsync(db => db.Users.AnyAsync(u => u.Email == novo)));
    }

    // ==================== PUT de criança e alimento ====================

    [Fact]
    public async Task PutCrianca_DeOutraUnidade_Retorna403ENaoAltera()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PutAsJsonAsync($"/api/RecemNascido/{c.CriancaB1}", EdicaoCrianca(c.CriancaB1, c.UnidadeA1));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        var gravada = await LerAsync(db => db.RecemNascidos.AsNoTracking().FirstAsync(r => r.Id == c.CriancaB1));
        Assert.Equal(c.UnidadeB1, gravada.TenantId);
        Assert.Equal(c.NomeB1, gravada.Nome);
    }

    [Fact]
    public async Task PutCrianca_MoverParaOutraUnidadeQueNaoEDoUsuario_Retorna403()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PutAsJsonAsync($"/api/RecemNascido/{c.CriancaA1}", EdicaoCrianca(c.CriancaA1, c.UnidadeB1));

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Equal(c.UnidadeA1, await LerAsync(db => db.RecemNascidos.AsNoTracking().Where(r => r.Id == c.CriancaA1).Select(r => r.TenantId).FirstAsync()));
    }

    [Fact]
    public async Task PutCrianca_DaPropriaUnidade_Altera()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PutAsJsonAsync($"/api/RecemNascido/{c.CriancaA1}", EdicaoCrianca(c.CriancaA1, c.UnidadeA1, "Novo Nome"));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal("Novo Nome", await LerAsync(db => db.RecemNascidos.AsNoTracking().Where(r => r.Id == c.CriancaA1).Select(r => r.Nome).FirstAsync()));
    }

    [Fact]
    public async Task PutCrianca_MoverEntreAsProprias_Altera()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1, c.UnidadeA2);

        var resposta = await cliente.PutAsJsonAsync($"/api/RecemNascido/{c.CriancaA1}", EdicaoCrianca(c.CriancaA1, c.UnidadeA2));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal(c.UnidadeA2, await LerAsync(db => db.RecemNascidos.AsNoTracking().Where(r => r.Id == c.CriancaA1).Select(r => r.TenantId).FirstAsync()));
    }

    [Fact]
    public async Task PutCrianca_Inexistente_Retorna404()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        var id = Guid.NewGuid();

        var resposta = await cliente.PutAsJsonAsync($"/api/RecemNascido/{id}", EdicaoCrianca(id, c.UnidadeA1));

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
    }

    private async Task<Guid> NovoAlimentoAsync(Guid unidade)
    {
        var alimento = new Alimento { TenantId = unidade, Nome = "Original" };
        using var scope = _api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CrescerSaudavelDbContext>();
        context.Alimentos.Add(alimento);
        await context.SaveChangesAsync();
        return alimento.Id;
    }

    [Fact]
    public async Task PutAlimento_DeOutraUnidade_Retorna403ENaoAltera()
    {
        var c = await SemearAsync();
        var id = await NovoAlimentoAsync(c.UnidadeB1);
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PutAsJsonAsync($"/api/Alimentos/{id}", new { id, tenantId = c.UnidadeA1, nome = "Tomado" });

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        var gravado = await LerAsync(db => db.Alimentos.AsNoTracking().FirstAsync(a => a.Id == id));
        Assert.Equal(c.UnidadeB1, gravado.TenantId);
        Assert.Equal("Original", gravado.Nome);
    }

    [Fact]
    public async Task PutAlimento_DaPropriaUnidade_Altera()
    {
        var c = await SemearAsync();
        var id = await NovoAlimentoAsync(c.UnidadeA1);
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PutAsJsonAsync($"/api/Alimentos/{id}", new { id, tenantId = c.UnidadeA1, nome = "Novo" });

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal("Novo", await LerAsync(db => db.Alimentos.AsNoTracking().Where(a => a.Id == id).Select(a => a.Nome).FirstAsync()));
    }

    // ==================== Chat ====================

    private void OpenAIChamaFerramenta(string funcao, string argumentos)
    {
        _api.OpenAI.Responder = corpo => corpo.Contains("\"role\":\"tool\"")
            ? """{"choices":[{"message":{"content":"pronto"}}]}"""
            : JsonSerializer.Serialize(new
            {
                choices = new[]
                {
                    new
                    {
                        message = new
                        {
                            content = (string?)null,
                            tool_calls = new[]
                            {
                                new { id = "c1", type = "function", function = new { name = funcao, arguments = argumentos } }
                            }
                        }
                    }
                }
            });
    }

    private static object MensagemDeChat(string texto = "dados do paciente", Guid? conversa = null) =>
        new { message = texto, conversationId = conversa };

    [Fact]
    public async Task Chat_BuscaPorNome_SoEncontraNaPropriaUnidade()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        OpenAIChamaFerramenta("get_patient_data", JsonSerializer.Serialize(new { crianca_id = c.Sobrenome }));

        var resposta = await cliente.PostAsJsonAsync("/api/chat", MensagemDeChat());

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var enviado = string.Join("\n", _api.OpenAI.Corpos);
        Assert.Contains(c.NomeA1, enviado);
        Assert.DoesNotContain(c.NomeB1, enviado);
    }

    [Fact]
    public async Task Chat_BuscaPorIdDeOutraUnidade_NaoEnviaDados()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        OpenAIChamaFerramenta("get_patient_data", JsonSerializer.Serialize(new { crianca_id = c.CriancaB1 }));

        var resposta = await cliente.PostAsJsonAsync("/api/chat", MensagemDeChat());

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.DoesNotContain(c.NomeB1, string.Join("\n", _api.OpenAI.Corpos));
    }

    [Theory]
    [InlineData("get_growth_prediction")]
    [InlineData("get_similar_cases")]
    public async Task Chat_FerramentaDeMlComCriancaDeOutraUnidade_NaoChamaMl(string funcao)
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        OpenAIChamaFerramenta(funcao, JsonSerializer.Serialize(new { crianca_id = c.CriancaB1, taxa_energia = 120.0, meta_proteina = 3.0 }));

        var resposta = await cliente.PostAsJsonAsync("/api/chat", MensagemDeChat());

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Empty(_api.Ml.Chamadas);
    }

    [Fact]
    public async Task Chat_ConversaDeOutroUsuario_NaoContinuaNemSobrescreve()
    {
        var c = await SemearAsync();
        var dono = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        var intruso = await EntrarComoAsync(SystemRoles.Operador, c.GrupoB, c.UnidadeB1);
        _api.OpenAI.Responder = _ => """{"choices":[{"message":{"content":"ok"}}]}""";
        var segredo = $"segredo-{Guid.NewGuid():N}";

        var primeira = await dono.PostAsJsonAsync("/api/chat", MensagemDeChat(segredo));
        var idConversa = JsonDocument.Parse(await primeira.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetGuid();
        _api.OpenAI.Corpos.Clear();

        var segunda = await intruso.PostAsJsonAsync("/api/chat", MensagemDeChat("o que foi dito antes?", idConversa));

        Assert.DoesNotContain(segredo, _api.OpenAI.Corpos.Single());
        var idDoIntruso = JsonDocument.Parse(await segunda.Content.ReadAsStringAsync()).RootElement.GetProperty("conversationId").GetGuid();
        Assert.NotEqual(idConversa, idDoIntruso);

        _api.OpenAI.Corpos.Clear();
        await dono.PostAsJsonAsync("/api/chat", MensagemDeChat("continua", idConversa));
        Assert.Contains(segredo, _api.OpenAI.Corpos.Single());
    }

    // ==================== Predições ====================

    private static object Cenario120() => new { taxa_energetica_kcal_kg = 120.0, meta_proteina_g_kg = 3.0, frequencia_horas = 3.0 };

    private static object PedidoDePredicao() => new { cenario = Cenario120(), horizonteDias = 14 };

    private static object CasoSimilar(Guid crianca) => new { crianca_id = crianca, sexo = "F", similarity_score = 0.9 };

    [Fact]
    public async Task PredictGrowth_DeOutraUnidade_Retorna403SemChamarMl()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PostAsJsonAsync($"/api/analytics/predict-growth/{c.CriancaB1}", PedidoDePredicao());

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Empty(_api.Ml.Chamadas);
    }

    [Fact]
    public async Task PredictGrowth_DaPropriaUnidade_TiraCasosDeOutraUnidade()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        _api.Ml.Responder = _ => JsonSerializer.Serialize(new
        {
            casos_similares = new[] { CasoSimilar(c.CriancaA1), CasoSimilar(c.CriancaB1) }
        });

        var resposta = await cliente.PostAsJsonAsync($"/api/analytics/predict-growth/{c.CriancaA1}", PedidoDePredicao());

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var corpo = await resposta.Content.ReadAsStringAsync();
        Assert.Contains(c.CriancaA1.ToString(), corpo);
        Assert.DoesNotContain(c.CriancaB1.ToString(), corpo);
    }

    [Fact]
    public async Task CompareDiets_DeOutraUnidade_Retorna403SemChamarMl()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.PostAsJsonAsync($"/api/analytics/compare-diets/{c.CriancaB1}", new[] { Cenario120(), Cenario120() });

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Empty(_api.Ml.Chamadas);
    }

    [Fact]
    public async Task SimilarCases_DeOutraUnidade_Retorna403SemChamarMl()
    {
        var c = await SemearAsync();
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.GetAsync($"/api/analytics/similar-cases/{c.CriancaB1}");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
        Assert.Empty(_api.Ml.Chamadas);
    }

    [Fact]
    public async Task SimilarCases_DaPropriaUnidade_TiraOutraUnidadeERespeitaOLimite()
    {
        var c = await SemearAsync();
        var outra = Guid.NewGuid();
        await LerAsync(async db =>
        {
            var crianca = NovaCrianca(c.UnidadeA1, "Outra da unidade");
            crianca.Id = outra;
            db.RecemNascidos.Add(crianca);
            return await db.SaveChangesAsync();
        });
        var cliente = await EntrarComoAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        _api.Ml.Responder = _ => JsonSerializer.Serialize(new[] { CasoSimilar(c.CriancaB1), CasoSimilar(c.CriancaA1), CasoSimilar(outra) });

        var corpo = await cliente.GetStringAsync($"/api/analytics/similar-cases/{c.CriancaA1}?limit=1");

        Assert.Contains(c.CriancaA1.ToString(), corpo);
        Assert.DoesNotContain(c.CriancaB1.ToString(), corpo);
        Assert.DoesNotContain(outra.ToString(), corpo);
    }

    // ==================== Quem gerencia profissionais ====================

    [Fact]
    public async Task Profissional_Operador_NaoEditaNemDesativa()
    {
        var c = await SemearAsync();
        var (_, admin) = await CriarUsuarioAsync(SystemRoles.AdminGrupo, c.GrupoA, c.UnidadeA1);
        var (email, proprio) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        var cliente = Cliente(await LoginAsync(email));

        var editarAdmin = await cliente.PutAsJsonAsync($"/api/profissionais/{admin}", EdicaoProfissional(false));
        var desativarAdmin = await cliente.DeleteAsync($"/api/profissionais/{admin}");
        var editarASi = await cliente.PutAsJsonAsync($"/api/profissionais/{proprio}", EdicaoProfissional());

        Assert.Equal(HttpStatusCode.Forbidden, editarAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, desativarAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, editarASi.StatusCode);
        Assert.True(await LerAsync(db => db.Users.AsNoTracking().Where(u => u.Id == admin).Select(u => u.Ativo).FirstAsync()));
    }

    [Fact]
    public async Task Profissional_AdminUnidade_NaoAlcancaPapelSuperior()
    {
        var c = await SemearAsync();
        var (_, adminGrupo) = await CriarUsuarioAsync(SystemRoles.AdminGrupo, c.GrupoA, c.UnidadeA1);
        var cliente = await EntrarComoAsync(SystemRoles.AdminUnidade, c.GrupoA, c.UnidadeA1);

        var resposta = await cliente.DeleteAsync($"/api/profissionais/{adminGrupo}");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task Profissional_AdminUnidade_SoAlcancaAPropriaUnidade()
    {
        var c = await SemearAsync();
        var (_, mesmaUnidade) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        var (_, outraDoGrupo) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA2);
        var cliente = await EntrarComoAsync(SystemRoles.AdminUnidade, c.GrupoA, c.UnidadeA1);

        var permitido = await cliente.PutAsJsonAsync($"/api/profissionais/{mesmaUnidade}", EdicaoProfissional(true, c.UnidadeA1));
        var negado = await cliente.DeleteAsync($"/api/profissionais/{outraDoGrupo}");

        Assert.Equal(HttpStatusCode.NoContent, permitido.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, negado.StatusCode);
    }

    [Fact]
    public async Task Profissional_AdminGrupo_AlcancaOGrupoMasNaoOutroNemSuperAdmin()
    {
        var c = await SemearAsync();
        var (_, doGrupo) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA2);
        var (_, deOutroGrupo) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoB, c.UnidadeB1);
        var (_, superAdmin) = await CriarUsuarioAsync(SystemRoles.SuperAdmin, c.GrupoA, c.UnidadeA1);
        var cliente = await EntrarComoAsync(SystemRoles.AdminGrupo, c.GrupoA, c.UnidadeA1);

        var permitido = await cliente.DeleteAsync($"/api/profissionais/{doGrupo}");
        var outroGrupo = await cliente.DeleteAsync($"/api/profissionais/{deOutroGrupo}");
        var acima = await cliente.DeleteAsync($"/api/profissionais/{superAdmin}");

        Assert.Equal(HttpStatusCode.NoContent, permitido.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, outroGrupo.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, acima.StatusCode);
    }

    [Fact]
    public async Task Profissional_SemGrupoNoToken_NaoAlcancaSuperAdminSemGrupo()
    {
        await SemearAsync();
        var (_, superAdmin) = await CriarUsuarioAsync(SystemRoles.SuperAdmin, null);
        var cliente = await EntrarComoAsync(SystemRoles.AdminGrupo, null);

        var resposta = await cliente.DeleteAsync($"/api/profissionais/{superAdmin}");

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task Profissional_SuperAdmin_AlcancaQualquerUm()
    {
        var c = await SemearAsync();
        var (_, adminGrupo) = await CriarUsuarioAsync(SystemRoles.AdminGrupo, c.GrupoB, c.UnidadeB1);
        var cliente = await EntrarComoAsync(SystemRoles.SuperAdmin, null);

        var resposta = await cliente.PutAsJsonAsync($"/api/profissionais/{adminGrupo}", EdicaoProfissional(true, c.UnidadeB1));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
    }

    [Fact]
    public async Task Profissional_NinguemDesativaAPropriaConta()
    {
        var (email, id) = await CriarUsuarioAsync(SystemRoles.SuperAdmin, null);
        var cliente = Cliente(await LoginAsync(email));

        var porPut = await cliente.PutAsJsonAsync($"/api/profissionais/{id}", EdicaoProfissional(false));
        var porDelete = await cliente.DeleteAsync($"/api/profissionais/{id}");

        Assert.Equal(HttpStatusCode.BadRequest, porPut.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, porDelete.StatusCode);
        Assert.True(await LerAsync(db => db.Users.AsNoTracking().Where(u => u.Id == id).Select(u => u.Ativo).FirstAsync()));
    }

    // ==================== Login e contas desativadas ====================

    [Fact]
    public async Task Desativado_NaoEntraEPerdeOTokenNaHora()
    {
        var c = await SemearAsync();
        var (email, id) = await CriarUsuarioAsync(SystemRoles.Operador, c.GrupoA, c.UnidadeA1);
        var tokenAntigo = await LoginAsync(email);
        Assert.Equal(HttpStatusCode.OK, (await Cliente(tokenAntigo).GetAsync("/api/RecemNascido")).StatusCode);

        var admin = await EntrarComoAsync(SystemRoles.SuperAdmin, null);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/profissionais/{id}")).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await Cliente(tokenAntigo).GetAsync("/api/RecemNascido")).StatusCode);
        var login = await _api.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, senha = Senha });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
        Assert.DoesNotContain("token", await login.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Login_CincoErros_BloqueiaAtePorSenhaCerta()
    {
        var (email, _) = await CriarUsuarioAsync(SystemRoles.Operador, null);
        var cliente = _api.CreateClient();

        for (var i = 0; i < 5; i++)
        {
            var errada = await cliente.PostAsJsonAsync("/api/auth/login", new { email, senha = "senha-errada" });
            Assert.Equal(HttpStatusCode.Unauthorized, errada.StatusCode);
        }

        var certa = await cliente.PostAsJsonAsync("/api/auth/login", new { email, senha = Senha });

        Assert.Equal(HttpStatusCode.Unauthorized, certa.StatusCode);
        Assert.Contains("bloqueada", await certa.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Login_ErrosSeguidosDeAcerto_ZeramAContagem()
    {
        var (email, _) = await CriarUsuarioAsync(SystemRoles.Operador, null);
        var cliente = _api.CreateClient();

        for (var rodada = 0; rodada < 2; rodada++)
        {
            for (var i = 0; i < 4; i++)
                await cliente.PostAsJsonAsync("/api/auth/login", new { email, senha = "senha-errada" });

            Assert.False(string.IsNullOrEmpty(await LoginAsync(email)));
        }
    }

    [Fact]
    public async Task Senha_ComMenosDeOitoCaracteres_ERecusada()
    {
        var (email, _) = await CriarUsuarioAsync(SystemRoles.Operador, null);
        var admin = await EntrarComoAsync(SystemRoles.SuperAdmin, null);

        var curta = await admin.PostAsJsonAsync("/api/auth/reset-password", new { email, novaSenha = "1234567" });
        var valida = await admin.PostAsJsonAsync("/api/auth/reset-password", new { email, novaSenha = "12345678" });

        Assert.Equal(HttpStatusCode.BadRequest, curta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, valida.StatusCode);
    }
}
