"""Serviço de predições - orquestra modelos e ETL"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

from app.models.growth_predictor import get_growth_predictor
from app.models.diet_analyzer import get_diet_analyzer
from app.services.etl_service import ETLService

logger = logging.getLogger(__name__)


class PredictionService:
    """Serviço principal para predições e análises"""
    
    def __init__(self):
        """Inicializa o serviço"""
        self.growth_predictor = get_growth_predictor()
        self.diet_analyzer = get_diet_analyzer()
        self.etl_service = ETLService()
    
    def predict_growth_for_crianca(
        self, 
        crianca_id: str,
        dieta_cenario: Dict,
        horizonte_dias: int = 14
    ) -> Dict:
        """
        Faz predição de crescimento para uma criança
        
        Args:
            crianca_id: ID da criança
            dieta_cenario: Cenário de dieta
            horizonte_dias: Horizonte em dias
            
        Returns:
            Dicionário com predição completa
        """
        # Obter perfil da criança
        crianca_perfil = self.etl_service.get_crianca_perfil(crianca_id)
        
        if not crianca_perfil:
            raise ValueError(f"Criança {crianca_id} não encontrada")
        
        # Obter timeline para calcular features
        df_timeline = self.etl_service.get_crianca_timeline(crianca_id)
        
        if df_timeline.empty:
            raise ValueError(f"Nenhum dado de timeline encontrado para criança {crianca_id}")
        
        # Computar features
        df_timeline = self.etl_service.compute_features(df_timeline)
        
        # Pegar última medida
        ultima_medida = df_timeline.iloc[-1].to_dict()
        
        # Combinar com cenário de dieta
        features = {
            **ultima_medida,
            **dieta_cenario
        }
        
        # Fazer predição
        predicao = self.growth_predictor.predict_zscore_change(
            crianca_features=features,
            dieta_features=dieta_cenario,
            horizonte_dias=horizonte_dias
        )
        
        # Buscar casos similares
        casos_similares = self.diet_analyzer.find_similar_cases(
            crianca_perfil=features,
            top_n=5
        )
        
        # Gerar recomendação
        recomendacao = self._gerar_recomendacao(predicao, casos_similares)
        
        return {
            'crianca': self._format_crianca_perfil(crianca_perfil),
            'predicao': predicao,
            'casos_similares': casos_similares,
            'recomendacao': recomendacao,
            'timestamp': datetime.now()
        }
    
    def compare_diets_for_crianca(
        self, 
        crianca_id: str,
        cenarios: List[Dict]
    ) -> Dict:
        """
        Compara múltiplos cenários de dieta para uma criança
        
        Args:
            crianca_id: ID da criança
            cenarios: Lista de cenários de dieta
            
        Returns:
            Dicionário com comparações
        """
        # Obter perfil da criança
        crianca_perfil = self.etl_service.get_crianca_perfil(crianca_id)
        
        if not crianca_perfil:
            raise ValueError(f"Criança {crianca_id} não encontrada")
        
        # Obter timeline
        df_timeline = self.etl_service.get_crianca_timeline(crianca_id)
        
        if df_timeline.empty:
            raise ValueError(f"Nenhum dado de timeline encontrado para criança {crianca_id}")
        
        # Computar features
        df_timeline = self.etl_service.compute_features(df_timeline)
        ultima_medida = df_timeline.iloc[-1].to_dict()
        
        # Comparar cenários
        comparacoes = self.diet_analyzer.compare_diet_scenarios(
            crianca_perfil=ultima_medida,
            dietas_cenarios=cenarios,
            growth_predictor=self.growth_predictor
        )
        
        # Melhor cenário
        melhor_cenario = comparacoes[0]['cenario'] if comparacoes else None
        
        return {
            'crianca': self._format_crianca_perfil(crianca_perfil),
            'comparacoes': comparacoes,
            'melhor_cenario': melhor_cenario,
            'timestamp': datetime.now()
        }
    
    def get_similar_cases(self, crianca_id: str, top_n: int = 10) -> List[Dict]:
        """
        Busca casos similares
        
        Args:
            crianca_id: ID da criança
            top_n: Número de casos
            
        Returns:
            Lista de casos similares
        """
        # Obter perfil da criança
        crianca_perfil = self.etl_service.get_crianca_perfil(crianca_id)
        
        if not crianca_perfil:
            raise ValueError(f"Criança {crianca_id} não encontrada")
        
        # Obter timeline
        df_timeline = self.etl_service.get_crianca_timeline(crianca_id)
        
        if not df_timeline.empty:
            df_timeline = self.etl_service.compute_features(df_timeline)
            ultima_medida = df_timeline.iloc[-1].to_dict()
        else:
            ultima_medida = crianca_perfil
        
        # Buscar similares
        casos = self.diet_analyzer.find_similar_cases(
            crianca_perfil=ultima_medida,
            top_n=top_n
        )
        
        return casos
    
    def get_analytics_stats(self) -> Dict:
        """Retorna estatísticas gerais do sistema"""
        stats = self.etl_service.get_statistics()
        stats['updated_at'] = datetime.now()
        return stats
    
    def _format_crianca_perfil(self, crianca_dict: Dict) -> Dict:
        """Formata perfil da criança para resposta"""
        return {
            'id': str(crianca_dict.get('Id', '')),
            'nome': crianca_dict.get('Nome', ''),
            'sexo': crianca_dict.get('Sexo', ''),
            'data_nascimento': crianca_dict.get('DataNascimento'),
            'idade_gestacional_semanas': float(crianca_dict.get('IdadeGestacionalSemanas', 0)),
            'peso_nascimento_gr': int(crianca_dict.get('PesoNascimentoGr', 0)),
            'peso_atual_gr': int(crianca_dict.get('PesoAtualGr', 0)) if crianca_dict.get('PesoAtualGr') else None,
            'zscore_peso_atual': float(crianca_dict.get('ZScoreAtual', 0)) if crianca_dict.get('ZScoreAtual') else None,
            'classificacao_ig': crianca_dict.get('ClassificacaoIG'),
            'classificacao_peso': crianca_dict.get('ClassificacaoPeso'),
            'dias_de_vida': int(crianca_dict.get('DiasDeVida', 0))
        }
    
    def _gerar_recomendacao(self, predicao: Dict, casos_similares: List[Dict]) -> str:
        """Gera recomendação baseada na predição e casos similares"""
        delta_esperado = predicao['delta_zscore_pred']
        prob_melhora = predicao['probabilidade_melhora']
        confiabilidade = predicao['confiabilidade']
        
        recomendacao = []
        
        # Análise da predição
        if delta_esperado > 0.3:
            recomendacao.append("✅ Cenário promissor: Previsão indica boa evolução do crescimento.")
        elif delta_esperado > 0:
            recomendacao.append("⚠️ Cenário moderado: Previsão indica melhora leve no crescimento.")
        else:
            recomendacao.append("❌ Atenção: Previsão indica possível estagnação ou piora.")
        
        # Probabilidade
        if prob_melhora > 0.7:
            recomendacao.append(f"Alta probabilidade de melhora ({prob_melhora*100:.0f}%).")
        elif prob_melhora > 0.4:
            recomendacao.append(f"Probabilidade moderada de melhora ({prob_melhora*100:.0f}%).")
        else:
            recomendacao.append(f"Baixa probabilidade de melhora ({prob_melhora*100:.0f}%).")
        
        # Confiabilidade
        if confiabilidade == 'baixa':
            recomendacao.append("⚠️ Aviso: Modelo tem baixa confiabilidade para este perfil.")
        
        # Casos similares
        if casos_similares:
            media_delta = sum(c['delta_zscore_real'] for c in casos_similares) / len(casos_similares)
            recomendacao.append(
                f"Em {len(casos_similares)} casos similares, "
                f"a média de melhora foi {media_delta:+.2f} no z-score."
            )
        
        return " ".join(recomendacao)


# Instância global
_prediction_service = None


def get_prediction_service() -> PredictionService:
    """Retorna instância singleton do serviço"""
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionService()
    return _prediction_service

