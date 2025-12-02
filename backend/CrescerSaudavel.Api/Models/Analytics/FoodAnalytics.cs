using System.Text.Json.Serialization;

namespace CrescerSaudavel.Api.Models.Analytics;

/// <summary>
/// Performance agregada de um alimento
/// </summary>
public class AlimentoPerformance
{
    public Guid AlimentoId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public int TotalUsos { get; set; }
    public int TotalCriancas { get; set; }
    public double MediaGanhoPesoGrDia { get; set; }
    public double MediaDeltaZScore { get; set; }
    public double TaxaSucesso { get; set; } // % de casos com Δ Z-Score > 0
    public double MediaEnergiaKcal { get; set; }
    public double MediaProteinaG { get; set; }
    public int DiasAcompanhamentoMedio { get; set; }
    public string Confiabilidade { get; set; } = string.Empty; // alta/media/baixa
}

/// <summary>
/// Performance segmentada por perfil
/// </summary>
public class AlimentoPerformancePorPerfil
{
    public Guid AlimentoId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string PerfilCrianca { get; set; } = string.Empty; // ex: "Pré-termo 28-32sem PIG"
    public int TotalUsos { get; set; }
    public double MediaDeltaZScore { get; set; }
    public double TaxaSucesso { get; set; }
}

/// <summary>
/// Combinação de alimentos efetiva
/// </summary>
public class CombinacaoAlimentos
{
    public List<Guid> AlimentoIds { get; set; } = new();
    public List<string> NomesAlimentos { get; set; } = new();
    public int TotalUsos { get; set; }
    public double MediaDeltaZScore { get; set; }
    public double TaxaSucesso { get; set; }
    public string PerfilCrianca { get; set; } = string.Empty;
}

/// <summary>
/// Ponto de dados para timeline de um alimento
/// </summary>
public class AlimentoTimelinePoint
{
    public DateTime DataInicio { get; set; }
    public int TotalUsos { get; set; }
    public double MediaDeltaZScore { get; set; }
    public double MediaGanhoPeso { get; set; }
}

/// <summary>
/// Recomendação de alimento baseada em ML
/// </summary>
public class AlimentoRecomendacao
{
    public Guid AlimentoId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public double ProbabilidadeSucesso { get; set; }
    public double DeltaZScoreEsperado { get; set; }
    public int Ranking { get; set; }
    public string Justificativa { get; set; } = string.Empty;
    public double EnergiaKcalPor100 { get; set; }
    public double ProteinaGPor100 { get; set; }
}

/// <summary>
/// Request para filtros do dashboard
/// </summary>
public class FoodAnalyticsFilter
{
    public DateTime? DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public string? TipoCrianca { get; set; } // "pretermo", "termo", null = ambos
    public List<string>? ClassificacoesIG { get; set; }
    public List<string>? ClassificacoesPeso { get; set; }
    public int? IdadeGestacionalMin { get; set; }
    public int? IdadeGestacionalMax { get; set; }
}

/// <summary>
/// Perfil da criança para recomendação
/// </summary>
public class PerfilCriancaRecommendation
{
    [JsonPropertyName("idade_gestacional_semanas")]
    public double IdadeGestacionalSemanas { get; set; }
    
    [JsonPropertyName("peso_atual_gr")]
    public int PesoAtualGr { get; set; }
    
    [JsonPropertyName("sexo")]
    public string Sexo { get; set; } = string.Empty;
    
    [JsonPropertyName("classificacao_ig")]
    public string? ClassificacaoIG { get; set; }
    
    [JsonPropertyName("classificacao_peso")]
    public string? ClassificacaoPeso { get; set; }
    
    [JsonPropertyName("zscore_atual")]
    public double? ZScoreAtual { get; set; }
    
    [JsonPropertyName("dias_de_vida")]
    public int DiasDeVida { get; set; }
}

/// <summary>
/// Request para recomendação de alimentos
/// </summary>
public class FoodRecommendationRequest
{
    [JsonPropertyName("perfil")]
    public PerfilCriancaRecommendation Perfil { get; set; } = new();
    
    [JsonPropertyName("top_n")]
    public int TopN { get; set; } = 10;
}

/// <summary>
/// Resposta com lista de alimentos recomendados
/// </summary>
public class FoodRecommendationResponse
{
    [JsonPropertyName("crianca_perfil")]
    public Dictionary<string, object> CriancaPerfil { get; set; } = new();
    
    [JsonPropertyName("alimentos_recomendados")]
    public List<AlimentoRecomendacao> AlimentosRecomendados { get; set; } = new();
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Resposta com dados consolidados do dashboard
/// </summary>
public class FoodAnalyticsDashboard
{
    public DateTime PeriodoInicio { get; set; }
    public DateTime PeriodoFim { get; set; }
    public int TotalAlimentos { get; set; }
    public int TotalUsos { get; set; }
    public List<AlimentoPerformance> Performance { get; set; } = new();
    public List<CombinacaoAlimentos> MelhoresCombinacoes { get; set; } = new();
    public AlimentoPerformance? AlimentoMaisUsado { get; set; }
    public AlimentoPerformance? AlimentoMelhorResultado { get; set; }
}

