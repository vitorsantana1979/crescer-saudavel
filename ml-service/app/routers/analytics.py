"""Router para endpoints de analytics"""
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
import logging

from app.schemas import SimilarCase, AnalyticsStats
from app.services.prediction_service import get_prediction_service
from app.models.diet_analyzer import get_diet_analyzer
from app.services.etl_service import ETLService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/similar-cases/{crianca_id}", response_model=List[SimilarCase])
async def get_similar_cases(
    crianca_id: str,
    limit: int = Query(10, ge=1, le=50, description="Número de casos a retornar")
):
    """
    Busca casos similares com bons resultados
    
    - **crianca_id**: ID da criança de referência
    - **limit**: Número máximo de casos a retornar (1-50)
    
    Retorna lista de casos similares ordenados por similaridade e sucesso
    """
    try:
        prediction_service = get_prediction_service()
        
        casos = prediction_service.get_similar_cases(
            crianca_id=crianca_id,
            top_n=limit
        )
        
        return casos
        
    except ValueError as e:
        logger.error(f"Erro de validação: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao buscar casos similares: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar busca: {str(e)}"
        )


@router.get("/stats", response_model=AnalyticsStats)
async def get_statistics():
    """
    Retorna estatísticas gerais do sistema
    
    - Total de crianças, consultas e dietas
    - Média de z-score
    - Distribuições
    """
    try:
        prediction_service = get_prediction_service()
        stats = prediction_service.get_analytics_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar estatísticas: {str(e)}"
        )


@router.get("/diet-patterns")
async def get_diet_patterns(
    classificacao_ig: Optional[str] = Query(None, description="Filtrar por classificação IG")
):
    """
    Analisa padrões de dieta associados a bons resultados
    
    - **classificacao_ig**: Filtrar por classificação específica (opcional)
    
    Retorna padrões agregados de energia, proteína e resultados
    """
    try:
        diet_analyzer = get_diet_analyzer()
        patterns = diet_analyzer.get_diet_patterns(classification_ig=classificacao_ig)
        
        return {
            'classificacao_ig': classificacao_ig or 'todas',
            'patterns': patterns
        }
        
    except Exception as e:
        logger.error(f"Erro ao analisar padrões: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar padrões: {str(e)}"
        )


@router.get("/crianca/{crianca_id}/profile")
async def get_crianca_profile(crianca_id: str):
    """
    Retorna perfil completo de uma criança
    
    - **crianca_id**: ID da criança
    
    Retorna dados demográficos, antropométricos e histórico resumido
    """
    try:
        etl_service = ETLService()
        perfil = etl_service.get_crianca_perfil(crianca_id)
        
        if not perfil:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Criança {crianca_id} não encontrada"
            )
        
        return perfil
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter perfil: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar perfil: {str(e)}"
        )


@router.get("/crianca/{crianca_id}/timeline")
async def get_crianca_timeline(crianca_id: str):
    """
    Retorna timeline completa de uma criança
    
    - **crianca_id**: ID da criança
    
    Retorna todas as consultas e dietas em ordem cronológica
    """
    try:
        etl_service = ETLService()
        df_timeline = etl_service.get_crianca_timeline(crianca_id)
        
        if df_timeline.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nenhum dado encontrado para criança {crianca_id}"
            )
        
        # Converter DataFrame para lista de dicts
        timeline = df_timeline.to_dict('records')
        
        return {
            'crianca_id': crianca_id,
            'total_registros': len(timeline),
            'timeline': timeline
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter timeline: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar timeline: {str(e)}"
        )


@router.post("/retrain")
async def retrain_models(horizonte_dias: int = Query(14, ge=7, le=90)):
    """
    Re-treina os modelos de ML com dados atualizados
    
    - **horizonte_dias**: Horizonte de predição para treinamento
    
    ⚠️ Esta operação pode demorar alguns minutos
    """
    try:
        from app.models.growth_predictor import get_growth_predictor
        from app.services.etl_service import ETLService
        
        logger.info(f"Iniciando re-treinamento dos modelos (horizonte: {horizonte_dias} dias)")
        
        # Preparar dados de treinamento
        etl_service = ETLService()
        df_train = etl_service.prepare_training_data(horizonte_dias=horizonte_dias)
        
        if df_train.empty or len(df_train) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dados insuficientes para treinamento. Mínimo: 10 amostras, encontrado: {len(df_train)}"
            )
        
        # Treinar modelo
        predictor = get_growth_predictor()
        metrics = predictor.train(df_train)
        
        logger.info(f"Modelo re-treinado com sucesso. Métricas: {metrics}")
        
        return {
            'status': 'success',
            'message': 'Modelo re-treinado com sucesso',
            'metrics': metrics,
            'n_samples': len(df_train),
            'horizonte_dias': horizonte_dias
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao re-treinar modelos: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao re-treinar: {str(e)}"
        )

