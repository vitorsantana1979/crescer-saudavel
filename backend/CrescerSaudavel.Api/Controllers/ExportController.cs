using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CrescerSaudavel.Api.Data;
using CrescerSaudavel.Api.Models;
using CrescerSaudavel.Api.Services.Crescimento;
using CrescerSaudavel.Api.Services.Planilhas;
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

    /// <summary>
    /// Uma linha por consulta com os dados da criança, z-scores, percentis, classificações e alertas.
    /// <paramref name="formato"/>: csv (padrão, separador vírgula e ponto decimal, para análise) ou xlsx.
    /// <paramref name="criancaId"/>: restringe a uma criança.
    /// </summary>
    [HttpGet("pesquisa")]
    public async Task<IActionResult> ExportarDadosPesquisa([FromQuery] string? formato = "csv", [FromQuery] Guid? criancaId = null)
    {
        var tenantIds = _currentUserService.TenantIds.ToHashSet();
        if (tenantIds.Count == 0)
        {
            return Forbid();
        }

        var xlsx = string.Equals(formato, "xlsx", StringComparison.OrdinalIgnoreCase);
        if (!xlsx && !string.Equals(formato ?? "csv", "csv", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Formato deve ser csv ou xlsx." });
        }

        var consultas = await _context.Consultas
            .AsNoTracking()
            .Include(c => c.RecemNascido)
            .Where(c => tenantIds.Contains(c.RecemNascido!.TenantId))
            .Where(c => criancaId == null || c.RecemNascidoId == criancaId)
            .OrderBy(c => c.RecemNascidoId)
            .ThenBy(c => c.DataHora)
            .ToListAsync();

        var linhas = consultas.Select(Linha).ToList();
        var carimbo = DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);

        if (xlsx)
        {
            var arquivo = XlsxSimples.Gerar("Atendimentos", Cabecalho, linhas);
            return File(arquivo, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"crescer_saudavel_{carimbo}.xlsx");
        }

        var csv = new StringBuilder();
        csv.AppendLine(string.Join(",", Cabecalho));
        foreach (var linha in linhas) csv.AppendLine(string.Join(",", linha.Select(CelulaCsv)));
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"exportacao_pesquisa_{carimbo}.csv");
    }

    public static readonly string[] Cabecalho =
    [
        "RecemNascidoId", "Nome", "DataNascimento", "HoraNascimento", "Sexo", "IdadeGestacionalSemanas",
        "IdadeGestacionalDias", "MetodoIG", "DUM", "DPP", "ClassificacaoIG", "PesoNascimentoGr", "ClassificacaoPN",
        "AdequacaoPesoNascimento", "ZNascimentoPeso", "ZNascimentoComprimento", "ZNascimentoPerimetro",
        "ConsultaId", "DataConsulta", "IdadeDiasNaConsulta", "PesoKg", "EstaturaCm", "PerimetroCefalicoCm",
        "ReferenciaCurva", "TipoIdadeCalculo", "IdadeCalculoDias", "ZScorePesoPlataforma", "ZScoreAlturaPlataforma",
        "ZScorePerimetroPlataforma", "PercentilPeso", "PercentilEstatura", "PercentilPerimetro", "ClassificacaoPeso",
        "ClassificacaoEstatura", "ClassificacaoPerimetro", "PosicaoMedida", "Imc", "ZScoreImc", "ZScorePesoEstatura",
        "ClassificacaoImc", "ClassificacaoPesoEstatura", "VGP_gKgDia", "ZScorePesoManual", "ClassificacaoManual",
        "AlertaQuedaPonderal", "AlertaRCEU"
    ];

    private static IReadOnlyList<object?> Linha(Consulta c)
    {
        var r = c.RecemNascido!;
        return
        [
            r.Id.ToString(), r.Nome, r.DataNascimento.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            r.HoraNascimento?.ToString(@"hh\:mm", CultureInfo.InvariantCulture), r.Sexo.ToString(), r.IdadeGestacionalSemanas,
            r.IdadeGestacionalDias, r.MetodoIG, Data(r.DataUltimaMenstruacao), Data(r.DataProvavelParto), r.ClassificacaoIG,
            r.PesoNascimentoGr, r.ClassificacaoPN, r.AdequacaoPesoNascimento, r.ZNascimentoPeso, r.ZNascimentoComprimento,
            r.ZNascimentoPerimetro,
            c.Id.ToString(), c.DataHora.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), (c.DataHora.Date - r.DataNascimento.Date).Days,
            c.PesoKg, c.EstaturaCm, c.PerimetroCefalicoCm,
            c.ReferenciaCurva, c.TipoIdadeCalculo, c.IdadeCalculoDias, c.ZScorePeso, c.ZScoreAltura,
            c.ZScorePerimetro, PercentilDe(c.ZScorePeso), PercentilDe(c.ZScoreAltura), PercentilDe(c.ZScorePerimetro), c.ClassificacaoPeso,
            c.ClassificacaoEstatura, c.ClassificacaoPerimetro, c.PosicaoMedida, c.Imc, c.ZScoreImc, c.ZScorePesoEstatura,
            c.ClassificacaoImc, c.ClassificacaoPesoEstatura, c.VelocidadeGanhoPonderal, c.ZScoreManualEquipe, c.ClassificacaoManualEquipe,
            c.AlertaQuedaPonderal, c.AlertaRCEU
        ];
    }

    private static string? Data(DateTime? data) => data?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static decimal? PercentilDe(decimal? z) =>
        z.HasValue ? Math.Round((decimal)Percentil.DeZ((double)z.Value), 1) : null;

    /// <summary>Célula CSV (RFC 4180): números com ponto; texto entre aspas quando tem vírgula, aspas ou quebra de linha.</summary>
    public static string CelulaCsv(object? valor)
    {
        var texto = valor switch
        {
            null => "",
            bool b => b ? "True" : "False",
            IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
            _ => valor.ToString() ?? ""
        };
        return texto.IndexOfAny([',', '"', '\n', '\r']) >= 0 ? $"\"{texto.Replace("\"", "\"\"")}\"" : texto;
    }
}
