"""Router para endpoints de predições"""
from fastapi import APIRouter, HTTPException, status
from typing import List
import logging

from app.schemas import (
    GrowthPredictionRequest,
    CompareDietsRequest,
    PredictionResponse,
    ComparisonResponse
)
from app.services.prediction_service import get_prediction_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/growth", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
async def predict_growth(request: GrowthPredictionRequest):
    """
    Prediz crescimento para um cenário de dieta
    
    - **crianca_id**: ID da criança
    - **dieta_cenario**: Cenário de dieta a avaliar
    - **horizonte_dias**: Horizonte de predição em dias (padrão: 14)
    
    Retorna predição de Δ z-score, intervalo de confiança e casos similares
    """
    try:
        prediction_service = get_prediction_service()
        
        # Converter modelo Pydantic para dict
        cenario_dict = {
            'TaxaEnergeticaKcalKg': request.dieta_cenario.taxa_energetica_kcal_kg,
            'MetaProteinaGKg': request.dieta_cenario.meta_proteina_g_kg,
            'FrequenciaHoras': request.dieta_cenario.frequencia_horas,
        }
        
        if request.dieta_cenario.peso_referencia_kg:
            cenario_dict['PesoReferenciaKg'] = request.dieta_cenario.peso_referencia_kg
        
        result = prediction_service.predict_growth_for_crianca(
            crianca_id=str(request.crianca_id),
            dieta_cenario=cenario_dict,
            horizonte_dias=request.horizonte_dias
        )
        
        return result
        
    except ValueError as e:
        logger.error(f"Erro de validação: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao fazer predição: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar predição: {str(e)}"
        )


@router.post("/compare-diets", response_model=ComparisonResponse, status_code=status.HTTP_200_OK)
async def compare_diet_scenarios(request: CompareDietsRequest):
    """
    Compara múltiplos cenários de dieta para uma criança
    
    - **crianca_id**: ID da criança
    - **cenarios**: Lista de 2 a 10 cenários de dieta para comparar
    
    Retorna comparação ranqueada dos cenários
    """
    try:
        prediction_service = get_prediction_service()
        
        # Converter cenários para formato dict
        cenarios_list = []
        for cenario in request.cenarios:
            cenario_dict = {
                'TaxaEnergeticaKcalKg': cenario.taxa_energetica_kcal_kg,
                'MetaProteinaGKg': cenario.meta_proteina_g_kg,
                'FrequenciaHoras': cenario.frequencia_horas,
            }
            if cenario.peso_referencia_kg:
                cenario_dict['PesoReferenciaKg'] = cenario.peso_referencia_kg
            
            cenarios_list.append(cenario_dict)
        
        result = prediction_service.compare_diets_for_crianca(
            crianca_id=str(request.crianca_id),
            cenarios=cenarios_list
        )
        
        return result
        
    except ValueError as e:
        logger.error(f"Erro de validação: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao comparar dietas: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar comparação: {str(e)}"
        )


@router.get("/quick-predict/{crianca_id}")
async def quick_predict(crianca_id: str, taxa_energia: float = 120, meta_proteina: float = 3.0):
    """
    Predição rápida com parâmetros default
    
    - **crianca_id**: ID da criança
    - **taxa_energia**: Taxa energética (kcal/kg/dia) - padrão: 120
    - **meta_proteina**: Meta proteica (g/kg/dia) - padrão: 3.0
    
    Retorna predição simplificada
    """
    try:
        prediction_service = get_prediction_service()
        
        cenario = {
            'TaxaEnergeticaKcalKg': taxa_energia,
            'MetaProteinaGKg': meta_proteina,
            'FrequenciaHoras': 3.0,
        }
        
        result = prediction_service.predict_growth_for_crianca(
            crianca_id=crianca_id,
            dieta_cenario=cenario,
            horizonte_dias=14
        )
        
        # Retornar versão simplificada
        return {
            'crianca_id': crianca_id,
            'delta_zscore_previsto': result['predicao']['delta_zscore_pred'],
            'probabilidade_melhora': result['predicao']['probabilidade_melhora'],
            'confiabilidade': result['predicao']['confiabilidade'],
            'recomendacao': result['recomendacao']
        }
        
    except Exception as e:
        logger.error(f"Erro na predição rápida: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

