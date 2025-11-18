using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
using CrescerSaudavel.Api.Services.Seed;
using CrescerSaudavel.Api.Services.Time;
using CrescerSaudavel.Api.Services.Location;
using Swashbuckle.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configurar logging para aparecer no console
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.SetMinimumLevel(LogLevel.Information);

builder.Services.AddDbContext<CrescerSaudavelDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddIdentity<ProfissionalSaude, IdentityRole<Guid>>(options =>
    {
        // Desabilitar requisições de autenticação automáticas (usamos JWT)
        options.SignIn.RequireConfirmedAccount = false;
        options.SignIn.RequireConfirmedEmail = false;
        options.SignIn.RequireConfirmedPhoneNumber = false;

        // Configurações de senha mais simples para desenvolvimento
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 4;
    })
    .AddEntityFrameworkStores<CrescerSaudavelDbContext>()
    .AddDefaultTokenProviders();

// Desabilitar cookies de autenticação padrão do Identity - retornar 401 ao invés de redirecionar
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = string.Empty; // Desabilitar redirecionamento
    options.Events.OnRedirectToLogin = context =>
    {
        // Para API, retornar 401 JSON ao invés de redirecionar
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync("{\"message\":\"Unauthorized\"}");
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = 403;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync("{\"message\":\"Forbidden\"}");
    };
    options.Events.OnRedirectToReturnUrl = context =>
    {
        context.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthentication(options =>
    {
        // Definir JWT como esquema padrão e desabilitar cookies
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; // Não requer HTTPS em desenvolvimento
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };

        // Não falhar quando não há token - permite endpoints anônimos
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Permite que requisições sem token passem (para endpoints anônimos)
                if (string.IsNullOrEmpty(context.Token))
                {
                    context.Token = null;
                }
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                // Se falhou porque não há token, permite endpoint anônimo continuar
                if (context.Exception != null)
                {
                    var ex = context.Exception;
                    if (ex.Message.Contains("IDX10214") || // Token não encontrado
                        ex.Message.Contains("IDX10211") || // Token vazio
                        ex.Message.Contains("IDX10503") || // Token não pode ser validado
                        ex.Message.Contains("IDX10501") ||  // Token não pode ser lido
                        ex.Message.Contains("token") ||
                        ex.Message.Contains("No token found"))
                    {
                        // Token ausente ou inválido - permite endpoint anônimo continuar
                        context.NoResult();
                        return Task.CompletedTask;
                    }
                }
                Console.WriteLine($"Authentication failed: {context.Exception?.Message ?? "Unknown error"}");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                // Se não há token, não desafia - permite endpoint anônimo
                if (string.IsNullOrEmpty(context.Request.Headers.Authorization.ToString()))
                {
                    context.HandleResponse();
                    return Task.CompletedTask;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Permite acesso anônimo por padrão - os controllers marcam com [Authorize] quando necessário
    options.FallbackPolicy = null;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ZScoreService>();
builder.Services.AddScoped<IDatabaseSeeder, DatabaseSeeder>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<ILocationService, LocationService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "https://stock.menthor.app",
                "http://localhost:5193",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<IDatabaseSeeder>();
    await seeder.SeedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.MapGet("/api/localizacao/estados", async (ILocationService service, CancellationToken ct) => Results.Ok(await service.ObterEstadosAsync(ct)));
app.MapGet("/api/localizacao/estados/{uf}/municipios", async (string uf, ILocationService service, CancellationToken ct) =>
{
    var municipios = await service.ObterMunicipiosPorEstadoAsync(uf, ct);
    return municipios.Count == 0 ? Results.NotFound(new { message = "Municípios não encontrados para a UF informada" }) : Results.Ok(municipios);
});
app.MapGet("/api/localizacao/cep/{cep}", async (string cep, ILocationService service, CancellationToken ct) =>
{
    var info = await service.BuscarCepAsync(cep, ct);
    return info is null ? Results.NotFound(new { message = "CEP não encontrado" }) : Results.Ok(info);
});

// HTTPS redirect DESABILITADO para desenvolvimento local
// if (!app.Environment.IsDevelopment())
// {
//     app.UseHttpsRedirection();
// }

// Configurar URLs para desenvolvimento
app.Urls.Add("http://0.0.0.0:5280");
app.Urls.Add("http://localhost:5280");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { ok = true }));
await app.RunAsync();
