using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Crescimento;

/// <summary>Uma linha de atendimento vinda de planilha (CSV/TSV colado ou arquivo).</summary>
public sealed record LinhaImportacao(
    int Linha,
    DateTime DataHora,
    decimal PesoKg,
    decimal? EstaturaCm,
    decimal? PerimetroCefalicoCm,
    string? PosicaoMedida);

public sealed record LinhaRejeitada(int Linha, string Motivo);

/// <summary>
/// Faixas plausíveis das medidas (as mesmas do formulário de consulta) e o plano de importação em lote:
/// valida cada linha, recusa duplicatas (mesma data e hora, no minuto) e devolve as consultas a criar.
/// </summary>
public static class ImportacaoConsultas
{
    public const int MaximoLinhas = 2000;

    /// <summary>Motivo da recusa, ou null. Comprimento e PC podem faltar (0/null = não medido).</summary>
    public static string? ValidarMedidas(RecemNascido crianca, DateTime dataHora, decimal pesoKg, decimal? estaturaCm,
        decimal? perimetroCefalicoCm, string? posicaoMedida, DateTime agora)
    {
        if (dataHora.Date < crianca.DataNascimento.Date) return "Data anterior ao nascimento";
        if (dataHora > agora.AddDays(1)) return "Data no futuro";
        if (pesoKg < 0.3m || pesoKg > 35m) return "Peso fora de 0,3 a 35 kg (informe em kg)";
        if (estaturaCm is > 0 and (< 20m or > 130m)) return "Comprimento/estatura fora de 20 a 130 cm";
        if (perimetroCefalicoCm is > 0 and (< 15m or > 60m)) return "Perímetro cefálico fora de 15 a 60 cm";
        if (!PosicaoMedida.Valida(posicaoMedida)) return "Posição da medida deve ser Deitado ou EmPe";
        return null;
    }

    public static (List<Consulta> Aceitas, List<LinhaRejeitada> Rejeitadas) Planejar(
        RecemNascido crianca, IEnumerable<DateTime> datasExistentes, IEnumerable<LinhaImportacao> linhas, DateTime agora)
    {
        var ocupadas = datasExistentes.Select(Minuto).ToHashSet();
        var aceitas = new List<Consulta>();
        var rejeitadas = new List<LinhaRejeitada>();

        foreach (var linha in linhas.OrderBy(l => l.Linha))
        {
            var motivo = ValidarMedidas(crianca, linha.DataHora, linha.PesoKg, linha.EstaturaCm, linha.PerimetroCefalicoCm,
                linha.PosicaoMedida, agora);
            if (motivo == null && !ocupadas.Add(Minuto(linha.DataHora)))
                motivo = "Já existe atendimento nesta data e hora";

            if (motivo != null)
            {
                rejeitadas.Add(new LinhaRejeitada(linha.Linha, motivo));
                continue;
            }

            aceitas.Add(new Consulta
            {
                RecemNascidoId = crianca.Id,
                DataHora = linha.DataHora,
                PesoKg = linha.PesoKg,
                EstaturaCm = linha.EstaturaCm ?? 0m,
                PerimetroCefalicoCm = linha.PerimetroCefalicoCm ?? 0m,
                PosicaoMedida = linha.PosicaoMedida
            });
        }

        return (aceitas, rejeitadas);
    }

    private static DateTime Minuto(DateTime data) => new(data.Year, data.Month, data.Day, data.Hour, data.Minute, 0);
}
