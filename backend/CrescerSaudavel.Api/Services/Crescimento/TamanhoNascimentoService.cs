using System.Text.Json;
using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Crescimento;

/// <summary>Resultado da avaliação de uma medida ao nascer pela INTERGROWTH-21st.</summary>
/// <param name="Z">z-score (2 casas).</param>
/// <param name="Percentil">Percentil 0-100 (1 casa).</param>
/// <param name="Adequacao">PIG (&lt; P10), AIG ou GIG (&gt; P90).</param>
/// <param name="Padrao">true de 33+0 a 42+6 semanas (padrão); false de 24+0 a 32+6 (referência para muito pré-termo).</param>
public sealed record AvaliacaoNascimento(decimal Z, decimal Percentil, string Adequacao, bool Padrao);

public interface ITamanhoNascimentoService
{
    /// <summary>Avalia uma medida ao nascer; null fora de 24+0 a 42+6 semanas ou sem valor.</summary>
    AvaliacaoNascimento? Avaliar(Medida medida, char sexo, int idadeGestacionalDias, double valor);

    /// <summary>Grava no recém-nascido os z-scores ao nascer e a adequação do peso à idade gestacional.</summary>
    void Aplicar(RecemNascido recemNascido);
}

/// <summary>
/// Tamanho ao nascer pela INTERGROWTH-21st: International Newborn Size Standards (33+0-42+6 semanas,
/// Villar 2014) e References for Very Preterm Infants (24+0-32+6, Villar 2016), um registro por dia de
/// idade gestacional com as linhas z −3..+3 e os centis 3, 5, 10, 50, 90, 95, 97.
/// O z é interpolado linearmente entre esses 13 nós; como os centis 10 e 90 publicados são nós,
/// PIG (&lt; P10) e GIG (&gt; P90) coincidem com a tabela oficial de centis.
/// </summary>
public sealed class TamanhoNascimentoService : ITamanhoNascimentoService
{
    public const int IdadeGestacionalMinimaDias = 24 * 7;
    public const int IdadeGestacionalMaximaDias = 42 * 7 + 6;
    public const int InicioPadraoDias = 33 * 7;

    private readonly Dictionary<string, Dictionary<int, (double Z, double Valor)[]>> _nos = new();

    public TamanhoNascimentoService(string basePath)
    {
        var opcoes = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        foreach (var medida in new[] { Medida.Peso, Medida.Estatura, Medida.PerimetroCefalico })
        foreach (var sexo in new[] { 'f', 'm' })
        {
            var arquivo = Path.Combine(basePath, "INTERGROWTH", $"nascimento_{NomeArquivo(medida)}_{sexo}.json");
            if (!File.Exists(arquivo)) continue;

            var linhas = JsonSerializer.Deserialize<List<LinhaNascimento>>(File.ReadAllText(arquivo), opcoes) ?? new();
            _nos[Chave(medida, sexo)] = linhas.ToDictionary(l => l.IgDias, Nos);
        }
    }

    public bool PossuiReferencia(Medida medida, char sexo) => _nos.ContainsKey(Chave(medida, char.ToLowerInvariant(sexo)));

    public AvaliacaoNascimento? Avaliar(Medida medida, char sexo, int idadeGestacionalDias, double valor)
    {
        if (valor <= 0 || idadeGestacionalDias < IdadeGestacionalMinimaDias || idadeGestacionalDias > IdadeGestacionalMaximaDias)
            return null;
        if (!_nos.TryGetValue(Chave(medida, char.ToLowerInvariant(sexo)), out var tabela)) return null;
        if (!tabela.TryGetValue(idadeGestacionalDias, out var nos)) return null;

        var z = Interpolar(nos, valor);
        var adequacao = z < Percentil.ZP10 ? "PIG" : z > Percentil.ZP90 ? "GIG" : "AIG";
        return new AvaliacaoNascimento(
            Math.Round((decimal)z, 2),
            Math.Round((decimal)Percentil.DeZ(z), 1),
            adequacao,
            idadeGestacionalDias >= InicioPadraoDias);
    }

    public void Aplicar(RecemNascido recemNascido)
    {
        var ig = ReferenciaCrescimentoService.IdadeGestacionalDias(recemNascido);
        var sexo = recemNascido.Sexo;

        var peso = recemNascido.PesoNascimentoGr is > 0 ? Avaliar(Medida.Peso, sexo, ig, recemNascido.PesoNascimentoGr.Value / 1000.0) : null;
        var comprimento = recemNascido.ComprimentoCm is > 0 ? Avaliar(Medida.Estatura, sexo, ig, (double)recemNascido.ComprimentoCm.Value) : null;
        var perimetro = recemNascido.PerimetroCefalicoCm is > 0 ? Avaliar(Medida.PerimetroCefalico, sexo, ig, (double)recemNascido.PerimetroCefalicoCm.Value) : null;

        recemNascido.ZNascimentoPeso = peso?.Z;
        recemNascido.ZNascimentoComprimento = comprimento?.Z;
        recemNascido.ZNascimentoPerimetro = perimetro?.Z;
        recemNascido.AdequacaoPesoNascimento = peso?.Adequacao;
    }

    private static double Interpolar((double Z, double Valor)[] nos, double valor)
    {
        // Abaixo do primeiro nó e acima do último, extrapola com a inclinação do segmento vizinho
        var i = 0;
        while (i < nos.Length - 2 && valor > nos[i + 1].Valor) i++;
        var (z0, v0) = nos[i];
        var (z1, v1) = nos[i + 1];
        // valor igual a um nó devolve o z exato do nó (P10 tem de dar exatamente ZP10, sem erro de arredondamento)
        if (valor == v0) return z0;
        if (valor == v1) return z1;
        return z0 + (valor - v0) / (v1 - v0) * (z1 - z0);
    }

    private static (double Z, double Valor)[] Nos(LinhaNascimento l)
    {
        var nos = new List<(double Z, double Valor)>
        {
            (-3, l.ZN3), (-2, l.ZN2), (-1, l.ZN1), (0, l.Z0), (1, l.ZP1), (2, l.ZP2), (3, l.ZP3),
            (Percentil.ZP3, l.P3), (Percentil.ZP5, l.P5), (Percentil.ZP10, l.P10),
            (Percentil.ZP90, l.P90), (Percentil.ZP95, l.P95), (Percentil.ZP97, l.P97),
        };
        var ordenados = nos.OrderBy(n => n.Z).ToArray();
        for (var k = 1; k < ordenados.Length; k++)
        {
            if (ordenados[k].Valor <= ordenados[k - 1].Valor)
                throw new InvalidDataException($"Tamanho ao nascer INTERGROWTH: nós não crescentes na IG {l.IgDias / 7}+{l.IgDias % 7}");
        }
        return ordenados;
    }

    private static string NomeArquivo(Medida medida) => ZScoreService.NomeArquivo(medida);

    private static string Chave(Medida medida, char sexo) => $"{NomeArquivo(medida)}_{sexo}";

    private sealed record LinhaNascimento(
        int IgDias,
        double ZN3, double ZN2, double ZN1, double Z0, double ZP1, double ZP2, double ZP3,
        double P3, double P5, double P10, double P50, double P90, double P95, double P97);
}
