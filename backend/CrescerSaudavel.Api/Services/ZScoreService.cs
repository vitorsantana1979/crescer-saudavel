using System.Text.Json;
using System.Text.Json.Serialization;

namespace CrescerSaudavel.Api.Services;

public enum TipoReferencia
{
    OMS,
    INTERGROWTH
}

public enum Medida
{
    Peso,
    Estatura,
    PerimetroCefalico
}

/// <summary>
/// Cálculo de z-scores e curvas de referência.
/// OMS: tabelas expandidas diárias (0-1856 dias) com parâmetros LMS, z pelo método LMS com o ajuste
/// da OMS além de ±3 para o peso. INTERGROWTH-21st: tabela semanal (27-64 semanas pós-menstruais)
/// de valores por z, com interpolação linear entre semanas e entre linhas de z.
/// </summary>
public class ZScoreService
{
    public const int OmsDiaMaximo = 1856;
    public const int IntergrowthSemanaMinima = 27;
    public const int IntergrowthSemanaMaxima = 64;
    private static readonly int[] ZsCurva = { -3, -2, -1, 0, 1, 2, 3 };

    private sealed class PontoLms
    {
        [JsonPropertyName("dia")] public int Dia { get; set; }
        [JsonPropertyName("l")] public double L { get; set; }
        [JsonPropertyName("m")] public double M { get; set; }
        [JsonPropertyName("s")] public double S { get; set; }
    }

    private sealed class PontoSemanal
    {
        [JsonPropertyName("semana")] public int Semana { get; set; }
        [JsonPropertyName("zN3")] public double ZN3 { get; set; }
        [JsonPropertyName("zN2")] public double ZN2 { get; set; }
        [JsonPropertyName("zN1")] public double ZN1 { get; set; }
        [JsonPropertyName("z0")] public double Z0 { get; set; }
        [JsonPropertyName("zP1")] public double ZP1 { get; set; }
        [JsonPropertyName("zP2")] public double ZP2 { get; set; }
        [JsonPropertyName("zP3")] public double ZP3 { get; set; }

        public double[] Valores => new[] { ZN3, ZN2, ZN1, Z0, ZP1, ZP2, ZP3 };
    }

    public record CurvaReferencia(
        int Semanas,
        double ZN3,
        double ZN2,
        double ZN1,
        double Z0,
        double ZP1,
        double ZP2,
        double ZP3
    );

    public record PontoCurvaDiaria(
        int Dia,
        double ZN3,
        double ZN2,
        double ZN1,
        double Z0,
        double ZP1,
        double ZP2,
        double ZP3
    );

    private readonly Dictionary<string, PontoLms[]> _oms = new();
    private readonly Dictionary<string, PontoSemanal[]> _intergrowth = new();

    public ZScoreService(string basePath)
    {
        Carregar(basePath);
    }

    public static string NomeArquivo(Medida medida) => medida switch
    {
        Medida.Peso => "peso",
        Medida.Estatura => "estatura",
        Medida.PerimetroCefalico => "perimetro",
        _ => throw new ArgumentOutOfRangeException(nameof(medida))
    };

    public static bool TryParseMedida(string? texto, out Medida medida)
    {
        switch (texto?.Trim().ToLowerInvariant())
        {
            case "peso": medida = Medida.Peso; return true;
            case "estatura":
            case "comprimento":
            case "altura": medida = Medida.Estatura; return true;
            case "perimetro":
            case "pc":
            case "perimetrocefalico": medida = Medida.PerimetroCefalico; return true;
            default: medida = default; return false;
        }
    }

    private static string Chave(Medida medida, char sexo) => $"{NomeArquivo(medida)}_{char.ToLowerInvariant(sexo)}";

    private void Carregar(string basePath)
    {
        var opcoes = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        foreach (var medida in Enum.GetValues<Medida>())
        {
            foreach (var sexo in new[] { 'f', 'm' })
            {
                var arquivoOms = Path.Combine(basePath, "OMS", $"{Chave(medida, sexo)}.json");
                if (File.Exists(arquivoOms))
                {
                    var pontos = JsonSerializer.Deserialize<List<PontoLms>>(File.ReadAllText(arquivoOms), opcoes);
                    if (pontos is { Count: > 0 })
                    {
                        var porDia = new PontoLms[OmsDiaMaximo + 1];
                        foreach (var p in pontos.Where(p => p.Dia >= 0 && p.Dia <= OmsDiaMaximo))
                            porDia[p.Dia] = p;
                        if (porDia.All(p => p != null))
                            _oms[Chave(medida, sexo)] = porDia;
                        else
                            Console.WriteLine($"Referência OMS incompleta ignorada: {arquivoOms}");
                    }
                }

                var arquivoIg = Path.Combine(basePath, "INTERGROWTH", $"{Chave(medida, sexo)}.json");
                if (File.Exists(arquivoIg))
                {
                    var pontos = JsonSerializer.Deserialize<List<PontoSemanal>>(File.ReadAllText(arquivoIg), opcoes);
                    if (pontos is { Count: > 0 })
                        _intergrowth[Chave(medida, sexo)] = pontos.OrderBy(p => p.Semana).ToArray();
                }
            }
        }
    }

    public bool PossuiReferencia(TipoReferencia tipo, Medida medida, char sexo) => tipo switch
    {
        TipoReferencia.OMS => _oms.ContainsKey(Chave(medida, sexo)),
        TipoReferencia.INTERGROWTH => _intergrowth.ContainsKey(Chave(medida, sexo)),
        _ => false
    };

    /// <summary>
    /// Z-score de uma medida. Para OMS, <paramref name="idadeDias"/> é a idade (cronológica ou corrigida)
    /// em dias; para INTERGROWTH, é a idade pós-menstrual em dias. Retorna null fora da faixa da referência.
    /// </summary>
    public double? CalcularZ(TipoReferencia tipo, Medida medida, char sexo, double idadeDias, double valor)
    {
        if (valor <= 0 || double.IsNaN(idadeDias) || double.IsInfinity(idadeDias)) return null;

        var z = tipo switch
        {
            TipoReferencia.OMS => CalcularZOms(medida, sexo, idadeDias, valor),
            TipoReferencia.INTERGROWTH => CalcularZIntergrowth(medida, sexo, idadeDias, valor),
            _ => null
        };

        return z.HasValue ? Math.Round(z.Value, 2) : null;
    }

    private double? CalcularZOms(Medida medida, char sexo, double idadeDias, double valor)
    {
        if (!_oms.TryGetValue(Chave(medida, sexo), out var tabela)) return null;
        if (idadeDias < 0 || idadeDias > OmsDiaMaximo) return null;

        var (l, m, s) = ParametrosLms(tabela, idadeDias);
        // A OMS restringe as caudas além de ±3 apenas nos indicadores baseados em peso.
        return ZLms(valor, l, m, s, ajustarCaudas: medida == Medida.Peso);
    }

    private static (double L, double M, double S) ParametrosLms(PontoLms[] tabela, double idadeDias)
    {
        var inferior = (int)Math.Floor(idadeDias);
        var superior = Math.Min(inferior + 1, OmsDiaMaximo);
        var fracao = idadeDias - inferior;
        var a = tabela[inferior];
        var b = tabela[superior];
        return (
            a.L + (b.L - a.L) * fracao,
            a.M + (b.M - a.M) * fracao,
            a.S + (b.S - a.S) * fracao
        );
    }

    public static double ValorLms(double l, double m, double s, double z) =>
        Math.Abs(l) < 1e-9 ? m * Math.Exp(s * z) : m * Math.Pow(1 + l * s * z, 1 / l);

    public static double ZLms(double valor, double l, double m, double s, bool ajustarCaudas)
    {
        var z = Math.Abs(l) < 1e-9
            ? Math.Log(valor / m) / s
            : (Math.Pow(valor / m, l) - 1) / (l * s);

        if (!ajustarCaudas) return z;

        if (z > 3)
        {
            var sd3 = ValorLms(l, m, s, 3);
            var sd2 = ValorLms(l, m, s, 2);
            return 3 + (valor - sd3) / (sd3 - sd2);
        }

        if (z < -3)
        {
            var sd3n = ValorLms(l, m, s, -3);
            var sd2n = ValorLms(l, m, s, -2);
            return -3 + (valor - sd3n) / (sd2n - sd3n);
        }

        return z;
    }

    private double? CalcularZIntergrowth(Medida medida, char sexo, double idadePosMenstrualDias, double valor)
    {
        if (!_intergrowth.TryGetValue(Chave(medida, sexo), out var tabela)) return null;

        var semanas = idadePosMenstrualDias / 7.0;
        if (semanas < IntergrowthSemanaMinima || semanas > IntergrowthSemanaMaxima) return null;

        var valores = ValoresIntergrowth(tabela, semanas);
        if (valores == null) return null;

        return ZPorInterpolacao(valor, valores);
    }

    private static double[]? ValoresIntergrowth(PontoSemanal[] tabela, double semanas)
    {
        var semanaInferior = (int)Math.Floor(semanas);
        var a = tabela.FirstOrDefault(p => p.Semana == semanaInferior);
        if (a == null) return null;
        var b = tabela.FirstOrDefault(p => p.Semana == semanaInferior + 1) ?? a;
        var fracao = semanas - semanaInferior;
        var va = a.Valores;
        var vb = b.Valores;
        return va.Select((v, i) => v + (vb[i] - v) * fracao).ToArray();
    }

    // Interpolação linear entre as linhas de z (-3..+3); além das extremas, extrapola com a largura da
    // banda vizinha, no mesmo espírito do ajuste de caudas da OMS.
    private static double ZPorInterpolacao(double valor, double[] valoresPorZ)
    {
        var n = ZsCurva.Length;
        if (valor <= valoresPorZ[0])
            return ZsCurva[0] + (valor - valoresPorZ[0]) / (valoresPorZ[1] - valoresPorZ[0]);
        if (valor >= valoresPorZ[n - 1])
            return ZsCurva[n - 1] + (valor - valoresPorZ[n - 1]) / (valoresPorZ[n - 1] - valoresPorZ[n - 2]);

        for (var i = 0; i < n - 1; i++)
        {
            if (valor <= valoresPorZ[i + 1])
                return ZsCurva[i] + (valor - valoresPorZ[i]) / (valoresPorZ[i + 1] - valoresPorZ[i]);
        }

        return ZsCurva[n - 1];
    }

    /// <summary>
    /// Valor da medida no z dado (inverso de <see cref="CalcularZ"/>), com a mesma convenção de idade.
    /// Retorna null fora da faixa da referência.
    /// </summary>
    public double? ValorNoZ(TipoReferencia tipo, Medida medida, char sexo, double idadeDias, double z)
    {
        if (double.IsNaN(z) || double.IsInfinity(z) || double.IsNaN(idadeDias)) return null;

        if (tipo == TipoReferencia.OMS)
        {
            if (!_oms.TryGetValue(Chave(medida, sexo), out var tabela)) return null;
            if (idadeDias < 0 || idadeDias > OmsDiaMaximo) return null;
            var (l, m, s) = ParametrosLms(tabela, idadeDias);
            if (medida == Medida.Peso && z > 3)
            {
                var sd3 = ValorLms(l, m, s, 3);
                return sd3 + (z - 3) * (sd3 - ValorLms(l, m, s, 2));
            }
            if (medida == Medida.Peso && z < -3)
            {
                var sd3n = ValorLms(l, m, s, -3);
                return sd3n + (z + 3) * (ValorLms(l, m, s, -2) - sd3n);
            }
            return ValorLms(l, m, s, z);
        }

        if (!_intergrowth.TryGetValue(Chave(medida, sexo), out var semanal)) return null;
        var semanas = idadeDias / 7.0;
        if (semanas < IntergrowthSemanaMinima || semanas > IntergrowthSemanaMaxima) return null;
        var v = ValoresIntergrowth(semanal, semanas);
        if (v == null) return null;
        if (z <= -3) return v[0] + (z + 3) * (v[1] - v[0]);
        if (z >= 3) return v[6] + (z - 3) * (v[6] - v[5]);
        var i = Math.Min((int)Math.Floor(z + 3), 5);
        return v[i] + (z + 3 - i) * (v[i + 1] - v[i]);
    }

    /// <summary>Última idade (em dias, na convenção da referência) coberta pela tabela.</summary>
    public static int IdadeMaximaDias(TipoReferencia tipo) =>
        tipo == TipoReferencia.OMS ? OmsDiaMaximo : IntergrowthSemanaMaxima * 7;

    // ---------- Curvas para os gráficos ----------

    public List<CurvaReferencia>? ObterCurvasPesoPretermo(string sexo) =>
        ObterCurvasReferencia(TipoReferencia.INTERGROWTH, Medida.Peso, SexoChar(sexo));

    public List<CurvaReferencia>? ObterCurvasPesoPadrao(string sexo) =>
        ObterCurvasReferencia(TipoReferencia.OMS, Medida.Peso, SexoChar(sexo));

    /// <summary>Um ponto por semana (OMS: semanas 0-265; INTERGROWTH: 27-64).</summary>
    public List<CurvaReferencia>? ObterCurvasReferencia(TipoReferencia tipo, Medida medida, char sexo)
    {
        if (tipo == TipoReferencia.INTERGROWTH)
        {
            if (!_intergrowth.TryGetValue(Chave(medida, sexo), out var tabela)) return null;
            return tabela
                .Select(p => new CurvaReferencia(p.Semana, p.ZN3, p.ZN2, p.ZN1, p.Z0, p.ZP1, p.ZP2, p.ZP3))
                .ToList();
        }

        var diaria = ObterCurvaDiaria(medida, sexo);
        if (diaria == null) return null;
        return diaria
            .Where(p => p.Dia % 7 == 0)
            .Select(p => new CurvaReferencia(p.Dia / 7, p.ZN3, p.ZN2, p.ZN1, p.Z0, p.ZP1, p.ZP2, p.ZP3))
            .ToList();
    }

    /// <summary>Curva OMS dia a dia (0-1856), valores nas linhas z = -3..+3.</summary>
    public List<PontoCurvaDiaria>? ObterCurvaDiaria(Medida medida, char sexo)
    {
        if (!_oms.TryGetValue(Chave(medida, sexo), out var tabela)) return null;
        return tabela
            .Select(p => new PontoCurvaDiaria(
                p.Dia,
                Arredondar(ValorLms(p.L, p.M, p.S, -3)),
                Arredondar(ValorLms(p.L, p.M, p.S, -2)),
                Arredondar(ValorLms(p.L, p.M, p.S, -1)),
                Arredondar(ValorLms(p.L, p.M, p.S, 0)),
                Arredondar(ValorLms(p.L, p.M, p.S, 1)),
                Arredondar(ValorLms(p.L, p.M, p.S, 2)),
                Arredondar(ValorLms(p.L, p.M, p.S, 3))))
            .ToList();
    }

    private static double Arredondar(double valor) => Math.Round(valor, 3);

    private static char SexoChar(string sexo) => string.IsNullOrEmpty(sexo) ? 'f' : char.ToLowerInvariant(sexo[0]);
}
