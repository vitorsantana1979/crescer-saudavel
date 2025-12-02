"""Router para analytics de alimentos"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from app.models.food_recommender import get_food_recommender

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== SCHEMAS ====================

class PerfilCrianca(BaseModel):
    idade_gestacional_semanas: float
    peso_atual_gr: int
    sexo: str
    classificacao_ig: Optional[str] = None
    classificacao_peso: Optional[str] = None
    zscore_atual: Optional[float] = None
    dias_de_vida: int = 0


class FoodRecommendationRequest(BaseModel):
    perfil: PerfilCrianca
    top_n: int = Field(default=10, ge=1, le=50)


class AlimentoRecomendado(BaseModel):
    alimento_id: str
    nome: str
    categoria: str
    probabilidade_sucesso: float
    energia_kcal_por_100: float
    proteina_g_por_100: float
    ranking: int
    justificativa: str


class FoodRecommendationResponse(BaseModel):
    crianca_perfil: Dict[str, Any]
    alimentos_recomendados: List[AlimentoRecomendado]
    timestamp: datetime


class FoodEffectivenessRequest(BaseModel):
    alimento_id: str
    perfil_filter: Optional[Dict[str, Any]] = None


# ==================== ENDPOINTS ====================

@router.post("/food-recommendation", response_model=FoodRecommendationResponse)
async def recommend_foods(request: FoodRecommendationRequest):
    """
    Recomenda alimentos baseado em perfil da criança usando ML
    
    - **perfil**: Características da criança (IG, peso, sexo, etc)
    - **top_n**: Número de alimentos a recomendar (padrão: 10)
    
    Retorna lista ranqueada de alimentos com probabilidade de sucesso
    """
    try:
        recommender = get_food_recommender()
        
        # Se modelo não foi treinado, treinar agora
        if recommender.model is None:
            logger.info("Modelo não encontrado, treinando...")
            metrics = recommender.train()
            logger.info(f"Modelo treinado: {metrics}")
        
        # Converter para dict
        perfil_dict = request.perfil.dict()
        
        # Obter recomendações
        recomendacoes = recommender.recommend_foods(
            crianca_perfil=perfil_dict,
            top_n=request.top_n
        )
        
        # Converter para modelos Pydantic
        alimentos_recomendados = [
            AlimentoRecomendado(**rec) for rec in recomendacoes
        ]
        
        return FoodRecommendationResponse(
            crianca_perfil=perfil_dict,
            alimentos_recomendados=alimentos_recomendados,
            timestamp=datetime.now()
        )
        
    except ValueError as e:
        logger.error(f"Erro de validação: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao recomendar alimentos: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar recomendação: {str(e)}"
        )


@router.post("/food-effectiveness")
async def analyze_food_effectiveness(request: FoodEffectivenessRequest):
    """
    Analisa efetividade de um alimento específico para um perfil
    
    - **alimento_id**: ID do alimento a analisar
    - **perfil_filter**: Filtros de perfil (opcional)
    
    Retorna métricas de performance do alimento
    """
    try:
        recommender = get_food_recommender()
        
        result = recommender.analyze_food_effectiveness(
            alimento_id=request.alimento_id,
            perfil_filter=request.perfil_filter
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Erro ao analisar efetividade: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar análise: {str(e)}"
        )


@router.post("/train-food-recommender")
async def train_food_recommender():
    """
    Treina o modelo de recomendação de alimentos
    
    Deve ser executado periodicamente ou após acúmulo de novos dados
    """
    try:
        recommender = get_food_recommender()
        
        logger.info("Iniciando treinamento do recomendador de alimentos...")
        metrics = recommender.train()
        
        return {
            "status": "success",
            "message": "Modelo de recomendação treinado com sucesso",
            "metrics": metrics,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Erro ao treinar modelo: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao treinar modelo: {str(e)}"
        )


@router.get("/food-recommender-status")
async def get_recommender_status():
    """
    Retorna status do modelo de recomendação
    """
    try:
        recommender = get_food_recommender()
        
        return {
            "model_loaded": recommender.model is not None,
            "trained_at": recommender.trained_at.isoformat() if recommender.trained_at else None,
            "metrics": recommender.metrics,
            "n_alimentos": len(recommender.alimento_decoder),
            "n_features": len(recommender.feature_columns)
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        return {
            "model_loaded": False,
            "error": str(e)
        }

