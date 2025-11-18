namespace CrescerSaudavel.Api.Services;

public static class RecemNascidoClassificacaoService
{
    /// <summary>
    /// Classifica o recém-nascido segundo a idade gestacional
    /// </summary>
    /// <param name="semanasIG">Idade gestacional em semanas</param>
    /// <returns>Classificação: RNPTE, RNPTM, RNPTT, RNPT, RNT ou RNP</returns>
    public static string ClassificarIdadeGestacional(decimal semanasIG)
    {
        if (semanasIG < 28) return "RNPTE"; // Recém-nascido pré-termo extremo
        if (semanasIG >= 28 && semanasIG < 34) return "RNPTM"; // Recém-nascido pré-termo moderado
        if (semanasIG >= 34 && semanasIG < 37) return "RNPTT"; // Recém-nascido pré-termo tardio
        if (semanasIG >= 37 && semanasIG < 42) return "RNT";   // Recém-nascido a termo
        if (semanasIG >= 42) return "RNP";                      // Recém-nascido pós-termo
        return "RNT"; // Default: a termo
    }

    /// <summary>
    /// Retorna a descrição completa da classificação por IG
    /// </summary>
    public static string ObterDescricaoClassificacaoIG(string? classificacao)
    {
        return classificacao switch
        {
            "RNPTE" => "Recém-Nascido Pré-Termo Extremo",
            "RNPTM" => "Recém-Nascido Pré-Termo Moderado",
            "RNPTT" => "Recém-Nascido Pré-Termo Tardio",
            "RNPT" => "Recém-Nascido Pré-Termo",
            "RNT" => "Recém-Nascido a Termo",
            "RNP" => "Recém-Nascido Pós-Termo",
            _ => "Não classificado"
        };
    }

    /// <summary>
    /// Classifica o recém-nascido segundo o peso ao nascer (em gramas)
    /// </summary>
    /// <param name="pesoGr">Peso ao nascer em gramas</param>
    /// <returns>Classificação do peso</returns>
    public static string ClassificarPesoNascimento(int pesoGr)
    {
        if (pesoGr >= 4000) return "Macrossomia";
        if (pesoGr >= 3000 && pesoGr <= 3999) return "Peso Adequado";
        if (pesoGr >= 2500 && pesoGr <= 2999) return "Peso Insuficiente";
        if (pesoGr >= 1500 && pesoGr < 2500) return "Baixo Peso";
        if (pesoGr >= 1000 && pesoGr < 1500) return "Muito Baixo Peso";
        if (pesoGr < 1000) return "Extremo Baixo Peso";
        return "Não classificado";
    }

    /// <summary>
    /// Retorna a descrição completa da classificação por PN
    /// </summary>
    public static string ObterDescricaoClassificacaoPN(string? classificacao)
    {
        return classificacao switch
        {
            "Macrossomia" => "Macrossomia (≥ 4.000g)",
            "Peso Adequado" => "Peso Adequado (3.000g - 3.999g)",
            "Peso Insuficiente" => "Peso Insuficiente (2.500g - 2.999g)",
            "Baixo Peso" => "Baixo Peso (1.500g - 2.499g)",
            "Muito Baixo Peso" => "Muito Baixo Peso (1.000g - 1.499g)",
            "Extremo Baixo Peso" => "Extremo Baixo Peso (< 1.000g)",
            _ => "Não classificado"
        };
    }

    /// <summary>
    /// Retorna a faixa de idade gestacional da classificação
    /// </summary>
    public static string ObterFaixaIG(string? classificacao)
    {
        return classificacao switch
        {
            "RNPTE" => "IG < 28 semanas",
            "RNPTM" => "IG ≥ 28 < 34 semanas",
            "RNPTT" => "IG ≥ 34 < 37 semanas",
            "RNT" => "IG ≥ 37 < 42 semanas",
            "RNP" => "IG ≥ 42 semanas",
            _ => ""
        };
    }

    /// <summary>
    /// Retorna a faixa de peso da classificação
    /// </summary>
    public static string ObterFaixaPN(string? classificacao)
    {
        return classificacao switch
        {
            "Macrossomia" => "PN ≥ 4.000g",
            "Peso Adequado" => "PN ≥ 3.000g E ≤ 3.999g",
            "Peso Insuficiente" => "PN ≥ 2.500g E ≤ 2.999g",
            "Baixo Peso" => "PN ≥ 1.500g E < 2.500g",
            "Muito Baixo Peso" => "PN ≥ 1.000g E < 1.500g",
            "Extremo Baixo Peso" => "PN < 1.000g",
            _ => ""
        };
    }
}

