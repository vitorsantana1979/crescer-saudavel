using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Services.Time;
using System.Text;
using System.Globalization;

namespace CrescerSaudavel.Api.Controllers;

[ApiController]
[Route("api/exportar")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly CrescerSaudavelDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ExportController(
        CrescerSaudavelDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpGet("pesquisa")]
    public async Task<IActionResult> ExportarDadosPesquisa()
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Forbid();
        }

        var consultas = await _context.Consultas
            .Include(c => c.RecemNascido)
            .Where(c => tenantIds.Contains(c.RecemNascido!.TenantId))
            .OrderBy(c => c.RecemNascidoId)
            .ThenBy(c => c.DataHora)
            .ToListAsync();

        var builder = new StringBuilder();
        // Cabeçalho
        builder.AppendLine("RecemNascidoId,Nome,DataNascimento,Sexo,IdadeGestacionalSemanas,ClassificacaoIG,PesoNascimentoGr,ClassificacaoPN,ConsultaId,DataConsulta,IdadeDiasNaConsulta,PesoKg,EstaturaCm,PerimetroCefalicoCm,ZScorePesoPlataforma,ZScoreAlturaPlataforma,ZScorePerimetroPlataforma,VGP_gKgDia,ZScorePesoManual,ClassificacaoManual,AlertaQuedaPonderal,AlertaRCEU");

        foreach (var c in consultas)
        {
            var r = c.RecemNascido!;
            var idadeDias = (c.DataHora.Date - r.DataNascimento.Date).Days;
            
            builder.AppendLine($"{r.Id}," +
                               $"\"{r.Nome}\"," +
                               $"{r.DataNascimento:yyyy-MM-dd}," +
                               $"{r.Sexo}," +
                               $"{r.IdadeGestacionalSemanas.ToString(CultureInfo.InvariantCulture)}," +
                               $"\"{r.ClassificacaoIG}\"," +
                               $"{r.PesoNascimentoGr}," +
                               $"\"{r.ClassificacaoPN}\"," +
                               $"{c.Id}," +
                               $"{c.DataHora:yyyy-MM-dd}," +
                               $"{idadeDias}," +
                               $"{c.PesoKg.ToString(CultureInfo.InvariantCulture)}," +
                               $"{c.EstaturaCm.ToString(CultureInfo.InvariantCulture)}," +
                               $"{c.PerimetroCefalicoCm.ToString(CultureInfo.InvariantCulture)}," +
                               $"{c.ZScorePeso?.ToString(CultureInfo.InvariantCulture) ?? ""}," +
                               $"{c.ZScoreAltura?.ToString(CultureInfo.InvariantCulture) ?? ""}," +
                               $"{c.ZScorePerimetro?.ToString(CultureInfo.InvariantCulture) ?? ""}," +
                               $"{c.VelocidadeGanhoPonderal?.ToString(CultureInfo.InvariantCulture) ?? ""}," +
                               $"{c.ZScoreManualEquipe?.ToString(CultureInfo.InvariantCulture) ?? ""}," +
                               $"\"{c.ClassificacaoManualEquipe ?? ""}\"," +
                               $"{c.AlertaQuedaPonderal}," +
                               $"{c.AlertaRCEU}");
        }

        var byteArray = Encoding.UTF8.GetBytes(builder.ToString());
        return File(byteArray, "text/csv", $"exportacao_pesquisa_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
    }
}
