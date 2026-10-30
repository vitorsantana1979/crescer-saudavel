using CrescerSaudavel.Api.Models;

namespace CrescerSaudavel.Api.Services.Crescimento;

/// <summary>
/// Datas da gestação: DPP pela regra de Naegele (DUM + 280 dias) e idade gestacional ao nascer pela DUM
/// ou pela DPP. A IG gravada continua sendo a informada pela equipe (o método diz de onde veio); estas
/// funções só calculam e conferem.
/// </summary>
public static class DatasGestacao
{
    public const int DiasGestacaoTermo = 280;
    public const int IgMinimaPlausivelDias = 20 * 7;
    public const int IgMaximaPlausivelDias = 45 * 7;

    /// <summary>Métodos de datação da IG da Caderneta (p. 69): DUM, ultrassom ou exame do recém-nascido.</summary>
    public static readonly string[] Metodos = ["DUM", "USG", "ExameRN"];

    public static DateTime DppPelaDum(DateTime dum) => dum.Date.AddDays(DiasGestacaoTermo);

    public static int IgPelaDum(DateTime dum, DateTime nascimento) => (nascimento.Date - dum.Date).Days;

    public static int IgPelaDpp(DateTime dpp, DateTime nascimento) => DiasGestacaoTermo - (dpp.Date - nascimento.Date).Days;

    /// <summary>Mensagem de erro, ou null se as datas e o método forem coerentes.</summary>
    public static string? Validar(RecemNascido rn)
    {
        if (rn.MetodoIG != null && !Metodos.Contains(rn.MetodoIG))
            return "Método da IG deve ser DUM, USG ou ExameRN.";

        if (rn.HoraNascimento is { } hora && (hora < TimeSpan.Zero || hora >= TimeSpan.FromDays(1)))
            return "Hora do nascimento inválida.";

        if (rn.DataUltimaMenstruacao is { } dum && !Plausivel(IgPelaDum(dum, rn.DataNascimento)))
            return "DUM incompatível com a data de nascimento (IG fora de 20 a 45 semanas).";

        if (rn.DataProvavelParto is { } dpp && !Plausivel(IgPelaDpp(dpp, rn.DataNascimento)))
            return "DPP incompatível com a data de nascimento (IG fora de 20 a 45 semanas).";

        return null;
    }

    private static bool Plausivel(int igDias) => igDias >= IgMinimaPlausivelDias && igDias <= IgMaximaPlausivelDias;
}
