namespace CrescerSaudavel.Api.Services.Crescimento;

/// <summary>Conversão de z-score em percentil pela normal padrão (OMS e INTERGROWTH-21st publicam em z).</summary>
public static class Percentil
{
    /// <summary>z dos centis publicados pela INTERGROWTH-21st (3, 5, 10, 90, 95, 97).</summary>
    public const double ZP3 = -1.8807936081512509;
    public const double ZP5 = -1.6448536269514729;
    public const double ZP10 = -1.2815515655446004;
    public const double ZP90 = 1.2815515655446004;
    public const double ZP95 = 1.6448536269514729;
    public const double ZP97 = 1.8807936081512509;

    /// <summary>Percentil (0-100) correspondente ao z.</summary>
    public static double DeZ(double z) => 50.0 * (1.0 + Erf(z / Math.Sqrt(2.0)));

    // Série de Taylor para |x| < 2,5 e fração contínua de erfc na cauda (erro < 1e-12 nas duas faixas).
    private static double Erf(double x)
    {
        var sinal = Math.Sign(x);
        x = Math.Abs(x);
        if (x < 2.5)
        {
            double soma = x, termo = x;
            for (var n = 1; n < 80; n++)
            {
                termo *= -x * x / n;
                var parcela = termo / (2 * n + 1);
                soma += parcela;
                if (Math.Abs(parcela) < 1e-17) break;
            }
            return sinal * 2.0 / Math.Sqrt(Math.PI) * soma;
        }

        double f = 0;
        for (var k = 80; k >= 1; k--) f = k / 2.0 / (x + f);
        var erfc = Math.Exp(-x * x) / Math.Sqrt(Math.PI) / (x + f);
        return sinal * (1.0 - erfc);
    }
}
