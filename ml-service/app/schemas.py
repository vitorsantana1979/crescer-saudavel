"""Schemas Pydantic para validação de dados"""
from pydantic import BaseModel, Field, UUID4
from typing import Optional, List
from datetime import datetime


# ==================== REQUEST MODELS ====================

class DietScenario(BaseModel):
    """Cenário de dieta para predição"""
    taxa_energetica_kcal_kg: float = Field(..., ge=80, le=200, description="Taxa energética em kcal/kg/dia")
    meta_proteina_g_kg: float = Field(..., ge=1.5, le=5.0, description="Meta proteica em g/kg/dia")
    frequencia_horas: float = Field(..., ge=1, le=24, description="Frequência em horas")
    peso_referencia_kg: Optional[float] = Field(None, ge=0.3, le=10, description="Peso de referência em kg")
    

class GrowthPredictionRequest(BaseModel):
    """Request para predição de crescimento"""
    crianca_id: UUID4
    dieta_cenario: DietScenario
    horizonte_dias: int = Field(14, ge=1, le=90, description="Horizonte de predição em dias")


class CompareDietsRequest(BaseModel):
    """Request para comparação de múltiplos cenários de dieta"""
    crianca_id: UUID4
    cenarios: List[DietScenario] = Field(..., min_length=2, max_length=10)


class ChatRequest(BaseModel):
    """Request para chat com LLM"""
    message: str = Field(..., min_length=3, max_length=1000)
    crianca_id: Optional[UUID4] = None
    conversation_id: Optional[UUID4] = None


# ==================== RESPONSE MODELS ====================

class IntervalConfidence(BaseModel):
    """Intervalo de confiança"""
    lower: float
    upper: float
    confidence_level: float = 0.95


class GrowthPrediction(BaseModel):
    """Predição de crescimento"""
    delta_zscore_pred: float = Field(..., description="Mudança prevista no z-score")
    intervalo_confianca: IntervalConfidence
    probabilidade_melhora: float = Field(..., ge=0, le=1, description="Probabilidade de melhora")
    zscore_final_esperado: Optional[float] = None
    dias_para_objetivo: Optional[int] = None
    confiabilidade: str = Field(..., description="alta, media, baixa")


class DietComparison(BaseModel):
    """Comparação entre cenários de dieta"""
    cenario: DietScenario
    predicao: GrowthPrediction
    ranking: int = Field(..., ge=1, description="Posição no ranking (1 = melhor)")
    score: float = Field(..., ge=0, le=100, description="Score de adequação")


class SimilarCase(BaseModel):
    """Caso similar encontrado no histórico"""
    crianca_id: UUID4
    idade_gestacional_semanas: float
    peso_nascimento_gr: int
    sexo: str
    classificacao_ig: Optional[str] = None
    classificacao_peso: Optional[str] = None
    
    # Dieta usada
    taxa_energetica_kcal_kg: float
    meta_proteina_g_kg: float
    
    # Desfecho
    delta_zscore_real: float
    dias_acompanhamento: int
    zscore_inicial: float
    zscore_final: float
    sucesso: bool
    
    # Similaridade
    similarity_score: float = Field(..., ge=0, le=1)


class CriancaPerfil(BaseModel):
    """Perfil resumido de uma criança"""
    id: UUID4
    nome: str
    sexo: str
    data_nascimento: datetime
    idade_gestacional_semanas: float
    peso_nascimento_gr: int
    peso_atual_gr: Optional[int] = None
    zscore_peso_atual: Optional[float] = None
    classificacao_ig: Optional[str] = None
    classificacao_peso: Optional[str] = None
    dias_de_vida: int


class PredictionResponse(BaseModel):
    """Resposta completa de predição"""
    crianca: CriancaPerfil
    predicao: GrowthPrediction
    casos_similares: List[SimilarCase]
    recomendacao: str
    timestamp: datetime


class ComparisonResponse(BaseModel):
    """Resposta de comparação de dietas"""
    crianca: CriancaPerfil
    comparacoes: List[DietComparison]
    melhor_cenario: DietScenario
    timestamp: datetime


class AnalyticsStats(BaseModel):
    """Estatísticas gerais do sistema"""
    total_criancas: int
    total_consultas: int
    total_dietas: int
    media_zscore: float
    mediana_idade_gestacional: float
    distribuicao_classificacao_ig: dict
    updated_at: datetime


class ChatMessage(BaseModel):
    """Mensagem no chat"""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    timestamp: datetime
    function_calls: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    """Resposta do chat"""
    message: ChatMessage
    conversation_id: UUID4
    model_used: str


# ==================== HEALTH CHECK ====================

class HealthCheck(BaseModel):
    """Status de saúde do serviço"""
    status: str
    database_connected: bool
    models_loaded: bool
    version: str
    timestamp: datetime

