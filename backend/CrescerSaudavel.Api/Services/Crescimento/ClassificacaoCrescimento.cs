namespace CrescerSaudavel.Api.Services.Crescimento;

public enum Indicador
{
    PesoIdade,
    EstaturaIdade,
    PerimetroCefalicoIdade
}

/// <summary>Coluna "O que significa" da tabela de interpretação: ótimo, atenção ou cuidado.</summary>
public enum NivelClassificacao
{
    Otimo,
    Atencao,
    Cuidado
}

/// <summary>Faixa de z-score de um indicador antropométrico e seu significado clínico.</summary>
public record ClassificacaoZ(
    string Codigo,
    Indicador Indicador,
    NivelClassificacao Nivel,
    string Rotulo,
    string Faixa)
{
    public bool EhCuidado => Nivel == NivelClassificacao.Cuidado;
}

/// <summary>
/// Tabela "Como interpretar os gráficos para crianças menores de 5 anos" (Brasil, 2008 / curso de
/// capacitação em avaliação do crescimento infantil da OMS, 2006) para peso/idade e estatura/idade.
/// Para perímetro cefálico/idade, que não consta da tabela, usa-se o corte de ±2 DP da OMS/SBP
/// (microcefalia abaixo de −2 DP, macrocefalia acima de +2 DP).
/// Os mesmos cortes de z valem para a curva INTERGROWTH-21st (pré-termo).
/// </summary>
public static class ClassificacaoCrescimento
{
    public static readonly ClassificacaoZ PesoMuitoBaixo =
        new("PesoMuitoBaixo", Indicador.PesoIdade, NivelClassificacao.Cuidado, "Muito baixo peso para a idade", "z < −3");
    public static readonly ClassificacaoZ PesoBaixo =
        new("PesoBaixo", Indicador.PesoIdade, NivelClassificacao.Cuidado, "Baixo peso para a idade", "−3 ≤ z < −2");
    public static readonly ClassificacaoZ PesoVigilanciaBaixo =
        new("PesoVigilanciaBaixo", Indicador.PesoIdade, NivelClassificacao.Atencao, "Peso adequado — vigilância para baixo peso", "−2 ≤ z < −1");
    public static readonly ClassificacaoZ PesoAdequado =
        new("PesoAdequado", Indicador.PesoIdade, NivelClassificacao.Otimo, "Peso adequado para a idade", "−1 ≤ z ≤ +1");
    public static readonly ClassificacaoZ PesoVigilanciaElevado =
        new("PesoVigilanciaElevado", Indicador.PesoIdade, NivelClassificacao.Atencao, "Peso adequado — vigilância para peso elevado", "+1 < z ≤ +2");
    public static readonly ClassificacaoZ PesoElevado =
        new("PesoElevado", Indicador.PesoIdade, NivelClassificacao.Cuidado, "Peso elevado para a idade", "z > +2");

    public static readonly ClassificacaoZ EstaturaMuitoBaixa =
        new("EstaturaMuitoBaixa", Indicador.EstaturaIdade, NivelClassificacao.Cuidado, "Muito baixa estatura para a idade", "z < −3");
    public static readonly ClassificacaoZ EstaturaBaixa =
        new("EstaturaBaixa", Indicador.EstaturaIdade, NivelClassificacao.Cuidado, "Baixa estatura para a idade", "−3 ≤ z < −2");
    public static readonly ClassificacaoZ EstaturaAdequada =
        new("EstaturaAdequada", Indicador.EstaturaIdade, NivelClassificacao.Otimo, "Estatura adequada para a idade", "z ≥ −2");

    public static readonly ClassificacaoZ PerimetroCefalicoAbaixo =
        new("PerimetroCefalicoAbaixo", Indicador.PerimetroCefalicoIdade, NivelClassificacao.Cuidado, "Perímetro cefálico abaixo do esperado (microcefalia)", "z < −2");
    public static readonly ClassificacaoZ PerimetroCefalicoAdequado =
        new("PerimetroCefalicoAdequado", Indicador.PerimetroCefalicoIdade, NivelClassificacao.Otimo, "Perímetro cefálico adequado para a idade", "−2 ≤ z ≤ +2");
    public static readonly ClassificacaoZ PerimetroCefalicoAcima =
        new("PerimetroCefalicoAcima", Indicador.PerimetroCefalicoIdade, NivelClassificacao.Cuidado, "Perímetro cefálico acima do esperado (macrocefalia)", "z > +2");

    public static IReadOnlyList<ClassificacaoZ> Tabela { get; } =
    [
        PesoMuitoBaixo, PesoBaixo, PesoVigilanciaBaixo, PesoAdequado, PesoVigilanciaElevado, PesoElevado,
        EstaturaMuitoBaixa, EstaturaBaixa, EstaturaAdequada,
        PerimetroCefalicoAbaixo, PerimetroCefalicoAdequado, PerimetroCefalicoAcima
    ];

    private static readonly Dictionary<string, ClassificacaoZ> PorCodigoIndex = Tabela.ToDictionary(c => c.Codigo);

    /// <summary>Códigos de nível "cuidado", para filtros de alerta em consultas (traduzível pelo EF para IN).</summary>
    public static string[] CodigosCuidado { get; } = Tabela.Where(c => c.EhCuidado).Select(c => c.Codigo).ToArray();

    public static ClassificacaoZ? Classificar(Indicador indicador, decimal? z)
    {
        if (z is not { } v) return null;

        return indicador switch
        {
            Indicador.PesoIdade =>
                v < -3 ? PesoMuitoBaixo
                : v < -2 ? PesoBaixo
                : v < -1 ? PesoVigilanciaBaixo
                : v <= 1 ? PesoAdequado
                : v <= 2 ? PesoVigilanciaElevado
                : PesoElevado,
            Indicador.EstaturaIdade =>
                v < -3 ? EstaturaMuitoBaixa
                : v < -2 ? EstaturaBaixa
                : EstaturaAdequada,
            Indicador.PerimetroCefalicoIdade =>
                v < -2 ? PerimetroCefalicoAbaixo
                : v <= 2 ? PerimetroCefalicoAdequado
                : PerimetroCefalicoAcima,
            _ => throw new ArgumentOutOfRangeException(nameof(indicador), indicador, null)
        };
    }

    public static ClassificacaoZ? PorCodigo(string? codigo) =>
        codigo != null && PorCodigoIndex.TryGetValue(codigo, out var classificacao) ? classificacao : null;

    public static bool EhCuidado(string? codigo) => PorCodigo(codigo)?.EhCuidado == true;
}
