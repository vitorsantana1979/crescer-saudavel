using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/dev")]
[AllowAnonymous]
public class DevSeedController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ZScoreService _zScoreService;
    private readonly IWebHostEnvironment _environment;

    public DevSeedController(
        CrescerSaudavelDbContext context,
        ZScoreService zScoreService,
        IWebHostEnvironment environment)
    {
        _context = context;
        _zScoreService = zScoreService;
        _environment = environment;
    }

    [HttpPost("seed-sample-data")]
    public async Task<IActionResult> SeedSampleData()
    {
        if (!_environment.IsDevelopment())
        {
            return Forbid("Seed disponível apenas em ambiente de desenvolvimento.");
        }

        var tenant = await _context.Tenants.FirstOrDefaultAsync();
        if (tenant == null)
        {
            tenant = new Tenant
            {
                Nome = "Hospital Demo",
                Tipo = "hospital",
                IdadePreTermoLimite = 37,
                Ativo = true
            };
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();
        }

        var createdRecords = new List<object>();

        var criancasSeed = new[]
        {
            CriarCriancaSeed(
                "Bebê Demo - Termo",
                'M',
                DateTime.UtcNow.Date.AddMonths(-3),
                39,
                3250,
                49.5m,
                34.0m,
                new[]
                {
                    new MedidaSeed(1, 3.1m, 50.0m, 34.5m),
                    new MedidaSeed(3, 3.8m, 52.2m, 35.2m),
                    new MedidaSeed(6, 4.4m, 55.1m, 36.1m),
                    new MedidaSeed(9, 5.3m, 58.0m, 37.0m),
                    new MedidaSeed(12, 6.0m, 61.0m, 38.0m),
                }
            ),
            CriarCriancaSeed(
                "Bebê Demo - Pré-termo",
                'F',
                DateTime.UtcNow.Date.AddMonths(-4),
                33,
                1900,
                42.0m,
                30.0m,
                new[]
                {
                    new MedidaSeed(2, 2.1m, 44.0m, 31.2m),
                    new MedidaSeed(5, 2.6m, 46.5m, 32.1m),
                    new MedidaSeed(8, 3.2m, 48.5m, 33.3m),
                    new MedidaSeed(12, 3.8m, 50.0m, 34.0m),
                    new MedidaSeed(16, 4.5m, 52.5m, 35.0m),
                }
            )
        };

        foreach (var criancaSeed in criancasSeed)
        {
            var existing = await _context.RecemNascidos
                .Include(r => r.Consultas)
                .FirstOrDefaultAsync(r => r.Nome == criancaSeed.Nome);

            if (existing != null)
            {
                _context.Consultas.RemoveRange(existing.Consultas);
                _context.RecemNascidos.Remove(existing);
                await _context.SaveChangesAsync();
            }

            var crianca = new RecemNascido
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Nome = criancaSeed.Nome,
                Sexo = criancaSeed.Sexo,
                DataNascimento = criancaSeed.DataNascimento,
                IdadeGestacionalSemanas = criancaSeed.IdadeGestacionalSemanas,
                PesoNascimentoGr = criancaSeed.PesoNascimentoGr,
                ComprimentoCm = criancaSeed.ComprimentoCm,
                PerimetroCefalicoCm = criancaSeed.PerimetroCefalicoCm
            };

            _context.RecemNascidos.Add(crianca);
            await _context.SaveChangesAsync();

            var sexo = crianca.Sexo == 'M' ? "m" : "f";
            var curva = crianca.IdadeGestacionalSemanas < 37 ? "INTERGROWTH" : "OMS";

            foreach (var medida in criancaSeed.Medidas)
            {
                var dataConsulta = crianca.DataNascimento.AddDays(medida.Semanas * 7);
                var idadeSemanas = (dataConsulta.Date - crianca.DataNascimento.Date).TotalDays / 7.0;

                decimal? zPeso = null;
                decimal? zAltura = null;
                decimal? zPerimetro = null;

                try
                {
                    var zPesoCalc = _zScoreService.CalcularZ(idadeSemanas, (double)medida.PesoKg, sexo, curva, "peso");
                    if (zPesoCalc.HasValue) zPeso = (decimal)zPesoCalc.Value;

                    var zAlturaCalc = _zScoreService.CalcularZ(idadeSemanas, (double)medida.EstaturaCm, sexo, curva, "comprimento");
                    if (zAlturaCalc.HasValue) zAltura = (decimal)zAlturaCalc.Value;

                    var zPerimetroCalc = _zScoreService.CalcularZ(idadeSemanas, (double)medida.PerimetroCefalicoCm, sexo, curva, "pc");
                    if (zPerimetroCalc.HasValue) zPerimetro = (decimal)zPerimetroCalc.Value;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro ao calcular Z-Score na seed: {ex.Message}");
                }

                var consulta = new Consulta
                {
                    RecemNascidoId = crianca.Id,
                    DataHora = dataConsulta,
                    PesoKg = medida.PesoKg,
                    EstaturaCm = medida.EstaturaCm,
                    PerimetroCefalicoCm = medida.PerimetroCefalicoCm,
                    ZScorePeso = zPeso,
                    ZScoreAltura = zAltura,
                    ZScorePerimetro = zPerimetro
                };

                _context.Consultas.Add(consulta);
            }

            await _context.SaveChangesAsync();

            createdRecords.Add(new
            {
                crianca.Id,
                crianca.Nome,
                Consultas = criancaSeed.Medidas.Length
            });
        }

        return Ok(new
        {
            message = "Dados de demonstração criados com sucesso.",
            criancas = createdRecords
        });
    }

    private static CriancaSeed CriarCriancaSeed(
        string nome,
        char sexo,
        DateTime dataNascimento,
        decimal idadeGestacionalSemanas,
        int pesoNascimento,
        decimal? comprimento,
        decimal? perimetro,
        MedidaSeed[] medidas)
    {
        return new CriancaSeed(
            nome,
            sexo,
            dataNascimento,
            idadeGestacionalSemanas,
            pesoNascimento,
            comprimento,
            perimetro,
            medidas);
    }

    private record CriancaSeed(
        string Nome,
        char Sexo,
        DateTime DataNascimento,
        decimal IdadeGestacionalSemanas,
        int PesoNascimentoGr,
        decimal? ComprimentoCm,
        decimal? PerimetroCefalicoCm,
        MedidaSeed[] Medidas);

    private record MedidaSeed(
        int Semanas,
        decimal PesoKg,
        decimal EstaturaCm,
        decimal PerimetroCefalicoCm);
}

