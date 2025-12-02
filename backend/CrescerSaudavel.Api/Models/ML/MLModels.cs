using System.Text.Json.Serialization;

namespace CrescerSaudavel.Api.Models.ML;

/// <summary>
/// Cenário de dieta para predição
/// </summary>
public class DietScenario
{
    public double TaxaEnergeticaKcalKg { get; set; }
    public double MetaProteinaGKg { get; set; }
    public double FrequenciaHoras { get; set; }
    public double? PesoReferenciaKg { get; set; }
}

/// <summary>
/// Intervalo de confiança
/// </summary>
public class IntervalConfidence
{
    [JsonPropertyName("lower")]
    public double Lower { get; set; }

    [JsonPropertyName("upper")]
    public double Upper { get; set; }

    [JsonPropertyName("confidence_level")]
    public double ConfidenceLevel { get; set; } = 0.95;
}

/// <summary>
/// Predição de crescimento
/// </summary>
public class GrowthPrediction
{
    [JsonPropertyName("delta_zscore_pred")]
    public double DeltaZscorePred { get; set; }

    [JsonPropertyName("intervalo_confianca")]
    public IntervalConfidence IntervaloConfianca { get; set; } = new();

    [JsonPropertyName("probabilidade_melhora")]
    public double ProbabilidadeMelhora { get; set; }

    [JsonPropertyName("zscore_final_esperado")]
    public double? ZscoreFinalEsperado { get; set; }

    [JsonPropertyName("dias_para_objetivo")]
    public int? DiasParaObjetivo { get; set; }

    [JsonPropertyName("confiabilidade")]
    public string Confiabilidade { get; set; } = string.Empty;

    [JsonPropertyName("horizonte_dias")]
    public int HorizonteDias { get; set; }
}

/// <summary>
/// Perfil resumido de uma criança
/// </summary>
public class CriancaPerfil
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("nome")]
    public string Nome { get; set; } = string.Empty;

    [JsonPropertyName("sexo")]
    public string Sexo { get; set; } = string.Empty;

    [JsonPropertyName("data_nascimento")]
    public DateTime DataNascimento { get; set; }

    [JsonPropertyName("idade_gestacional_semanas")]
    public double IdadeGestacionalSemanas { get; set; }

    [JsonPropertyName("peso_nascimento_gr")]
    public int PesoNascimentoGr { get; set; }

    [JsonPropertyName("peso_atual_gr")]
    public int? PesoAtualGr { get; set; }

    [JsonPropertyName("zscore_peso_atual")]
    public double? ZscorePesoAtual { get; set; }

    [JsonPropertyName("classificacao_ig")]
    public string? ClassificacaoIg { get; set; }

    [JsonPropertyName("classificacao_peso")]
    public string? ClassificacaoPeso { get; set; }

    [JsonPropertyName("dias_de_vida")]
    public int DiasDeVida { get; set; }
}

/// <summary>
/// Caso similar encontrado
/// </summary>
public class SimilarCase
{
    [JsonPropertyName("crianca_id")]
    public Guid CriancaId { get; set; }

    [JsonPropertyName("idade_gestacional_semanas")]
    public double IdadeGestacionalSemanas { get; set; }

    [JsonPropertyName("peso_nascimento_gr")]
    public int PesoNascimentoGr { get; set; }

    [JsonPropertyName("sexo")]
    public string Sexo { get; set; } = string.Empty;

    [JsonPropertyName("classificacao_ig")]
    public string? ClassificacaoIg { get; set; }

    [JsonPropertyName("classificacao_peso")]
    public string? ClassificacaoPeso { get; set; }

    // Dieta usada
    [JsonPropertyName("taxa_energetica_kcal_kg")]
    public double TaxaEnergeticaKcalKg { get; set; }

    [JsonPropertyName("meta_proteina_g_kg")]
    public double MetaProteinaGKg { get; set; }

    // Desfecho
    [JsonPropertyName("delta_zscore_real")]
    public double DeltaZscoreReal { get; set; }

    [JsonPropertyName("dias_acompanhamento")]
    public int DiasAcompanhamento { get; set; }

    [JsonPropertyName("zscore_inicial")]
    public double ZscoreInicial { get; set; }

    [JsonPropertyName("zscore_final")]
    public double ZscoreFinal { get; set; }

    [JsonPropertyName("sucesso")]
    public bool Sucesso { get; set; }

    // Similaridade
    [JsonPropertyName("similarity_score")]
    public double SimilarityScore { get; set; }
}

/// <summary>
/// Resposta completa de predição
/// </summary>
public class PredictionResponse
{
    [JsonPropertyName("crianca")]
    public CriancaPerfil Crianca { get; set; } = new();

    [JsonPropertyName("predicao")]
    public GrowthPrediction Predicao { get; set; } = new();

    [JsonPropertyName("casos_similares")]
    public List<SimilarCase> CasosSimilares { get; set; } = new();

    [JsonPropertyName("recomendacao")]
    public string Recomendacao { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Comparação entre cenários de dieta
/// </summary>
public class DietComparison
{
    public DietScenario Cenario { get; set; } = new();
    public GrowthPrediction Predicao { get; set; } = new();
    public int Ranking { get; set; }
    public double Score { get; set; }
}

/// <summary>
/// Resposta de comparação de dietas
/// </summary>
public class ComparisonResponse
{
    public CriancaPerfil Crianca { get; set; } = new();
    public List<DietComparison> Comparacoes { get; set; } = new();
    public DietScenario? MelhorCenario { get; set; }
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Estatísticas gerais do sistema
/// </summary>
public class AnalyticsStats
{
    public int TotalCriancas { get; set; }
    public int TotalConsultas { get; set; }
    public int TotalDietas { get; set; }
    public double MediaZscore { get; set; }
    public double MedianaIdadeGestacional { get; set; }
    public Dictionary<string, int> DistribuicaoClassificacaoIg { get; set; } = new();
    public DateTime UpdatedAt { get; set; }
}

// ==================== REQUEST MODELS ====================

public record GrowthPredictionRequest(
    Guid CriancaId,
    DietScenario DietaCenario,
    int HorizonteDias = 14
);

public record CompareDietsRequest(
    Guid CriancaId,
    List<DietScenario> Cenarios
);

