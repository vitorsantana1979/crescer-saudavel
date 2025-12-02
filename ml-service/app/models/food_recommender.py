"""
Modelo de ML para recomendação de alimentos baseado em perfil da criança
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Optional
import logging
import joblib
import os
from datetime import datetime

from app.database import execute_query

logger = logging.getLogger(__name__)


class FoodRecommender:
    """
    Modelo para recomendar alimentos baseado em características da criança
    e histórico de resultados
    """
    
    def __init__(self, model_path: str = "./models/food_recommender.joblib"):
        self.model_path = model_path
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.alimento_encoder = {}  # Mapa: alimentoId -> índice
        self.alimento_decoder = {}  # Mapa: índice -> alimentoId
        self.metrics = {}
        self.trained_at = None
        
        # Tentar carregar modelo existente
        if os.path.exists(model_path):
            try:
                self.load_model()
                logger.info("Modelo de recomendação carregado do disco")
            except Exception as e:
                logger.warning(f"Não foi possível carregar modelo: {e}")
    
    def get_food_usage_data(self) -> pd.DataFrame:
        """
        Extrai dados de uso de alimentos com resultados
        """
        query = """
        SELECT 
            a.Id as AlimentoId,
            a.Nome as AlimentoNome,
            a.Categoria,
            a.EnergiaKcalPor100,
            a.ProteinaGPor100,
            a.EhPreTermo,
            
            rn.Sexo,
            rn.IdadeGestacionalSemanas,
            rn.PesoNascimentoGr,
            rn.ClassificacaoIG,
            rn.ClassificacaoPN as ClassificacaoPeso,
            
            di.Quantidade,
            d.DataInicio,
            d.TaxaEnergeticaKcalKg,
            d.MetaProteinaGKg,
            
            c_inicial.DataHora as DataInicial,
            c_inicial.PesoKg * 1000 as PesoInicial,
            c_inicial.ZScorePeso as ZScoreInicial,
            
            c_final.DataHora as DataFinal,
            c_final.PesoKg * 1000 as PesoFinal,
            c_final.ZScorePeso as ZScoreFinal,
            
            DATEDIFF(day, rn.DataNascimento, c_inicial.DataHora) as DiasDeVida,
            DATEDIFF(day, c_inicial.DataHora, c_final.DataHora) as DiasAcompanhamento
            
        FROM nutricao.Alimento a
        INNER JOIN nutricao.DietaItem di ON a.Id = di.AlimentoId
        INNER JOIN nutricao.Dieta d ON di.DietaId = d.Id
        INNER JOIN clinica.RecemNascido rn ON d.RecemNascidoId = rn.Id
        
        -- Primeira consulta após início da dieta
        CROSS APPLY (
            SELECT TOP 1 * FROM clinica.Consulta
            WHERE RecemNascidoId = rn.Id 
            AND DataHora >= d.DataInicio
            AND ZScorePeso IS NOT NULL
            ORDER BY DataHora
        ) c_inicial
        
        -- Consulta 7-21 dias depois
        CROSS APPLY (
            SELECT TOP 1 * FROM clinica.Consulta
            WHERE RecemNascidoId = rn.Id 
            AND DataHora > c_inicial.DataHora
            AND DATEDIFF(day, c_inicial.DataHora, DataHora) BETWEEN 7 AND 21
            AND ZScorePeso IS NOT NULL
            ORDER BY DataHora
        ) c_final
        
        WHERE c_final.ZScorePeso IS NOT NULL
        """
        
        df = execute_query(query)
        return df
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepara features para treinamento ou predição
        """
        df = df.copy()
        
        # Calcular delta Z-Score
        if 'ZScoreFinal' in df.columns and 'ZScoreInicial' in df.columns:
            df['DeltaZScore'] = df['ZScoreFinal'] - df['ZScoreInicial']
            df['Sucesso'] = (df['DeltaZScore'] > 0).astype(int)
        
        # Velocidade de ganho de peso
        if 'PesoFinal' in df.columns and 'PesoInicial' in df.columns and 'DiasAcompanhamento' in df.columns:
            df['VelocidadeGanhoPeso'] = (df['PesoFinal'] - df['PesoInicial']) / df['DiasAcompanhamento'].replace(0, 1)
        
        # Converter sexo para numérico
        df['SexoNumerico'] = df['Sexo'].map({'M': 0, 'F': 1})
        
        # One-hot encoding para classificações
        if 'ClassificacaoIG' in df.columns:
            df = pd.get_dummies(df, columns=['ClassificacaoIG'], prefix='ClassIG', drop_first=False, dummy_na=True)
        
        if 'ClassificacaoPeso' in df.columns:
            df = pd.get_dummies(df, columns=['ClassificacaoPeso'], prefix='ClassPeso', drop_first=False, dummy_na=True)
        
        # One-hot encoding para categoria de alimento
        if 'Categoria' in df.columns:
            df = pd.get_dummies(df, columns=['Categoria'], prefix='Cat', drop_first=False, dummy_na=True)
        
        # Features finais
        feature_cols = [
            'IdadeGestacionalSemanas', 'PesoNascimentoGr', 'SexoNumerico',
            'DiasDeVida', 'ZScoreInicial',
            'EnergiaKcalPor100', 'ProteinaGPor100', 'Quantidade',
            'TaxaEnergeticaKcalKg', 'MetaProteinaGKg',
            'EhPreTermo'
        ]
        
        # Adicionar colunas de classificação (one-hot)
        for col in df.columns:
            if col.startswith('ClassIG_') or col.startswith('ClassPeso_') or col.startswith('Cat_'):
                feature_cols.append(col)
        
        # Filtrar apenas colunas que existem
        feature_cols = [c for c in feature_cols if c in df.columns]
        self.feature_columns = feature_cols
        
        # Preencher valores faltantes
        for col in feature_cols:
            if df[col].dtype in [np.float64, np.int64]:
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna(0)
        
        return df
    
    def train(self, horizonte_dias: int = 14) -> Dict:
        """
        Treina modelo de classificação: alimento X + perfil Y -> sucesso?
        """
        logger.info("Iniciando treinamento do recomendador de alimentos")
        
        # Carregar dados
        df = self.get_food_usage_data()
        
        if df.empty or len(df) < 50:
            logger.warning(f"Dados insuficientes para treinamento: {len(df)} amostras")
            return {"status": "insufficient_data", "samples": len(df)}
        
        logger.info(f"Dados carregados: {len(df)} amostras, {df['AlimentoId'].nunique()} alimentos únicos")
        
        # Preparar features
        df = self.prepare_features(df)
        
        # Criar encoder de alimentos
        alimentos_unicos = df['AlimentoId'].unique()
        self.alimento_encoder = {str(alimento): idx for idx, alimento in enumerate(alimentos_unicos)}
        self.alimento_decoder = {idx: str(alimento) for alimento, idx in self.alimento_encoder.items()}
        
        # Preparar X e y
        X = df[self.feature_columns].values
        y = df['Sucesso'].values  # 1 = sucesso (Δ Z-Score > 0), 0 = não sucesso
        
        # Treinar modelo
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X, y)
        self.scaler.fit(X)
        
        # Calcular métricas
        from sklearn.model_selection import cross_val_score
        cv_scores = cross_val_score(self.model, X, y, cv=5, scoring='accuracy')
        
        self.metrics = {
            'accuracy': float(self.model.score(X, y)),
            'cv_accuracy_mean': float(cv_scores.mean()),
            'cv_accuracy_std': float(cv_scores.std()),
            'n_samples': len(X),
            'n_alimentos': len(alimentos_unicos),
            'n_features': len(self.feature_columns)
        }
        
        self.trained_at = datetime.now()
        
        logger.info(f"Modelo treinado - Accuracy: {self.metrics['accuracy']:.3f}, "
                   f"CV Accuracy: {self.metrics['cv_accuracy_mean']:.3f}")
        
        # Salvar modelo
        self.save_model()
        
        return self.metrics
    
    def recommend_foods(
        self,
        crianca_perfil: Dict,
        top_n: int = 10
    ) -> List[Dict]:
        """
        Recomenda alimentos para um perfil específico de criança
        
        Args:
            crianca_perfil: Características da criança
            top_n: Número de alimentos a recomendar
            
        Returns:
            Lista de alimentos ranqueados por probabilidade de sucesso
        """
        if self.model is None:
            raise ValueError("Modelo não treinado. Execute train() primeiro.")
        
        # Buscar todos os alimentos disponíveis
        query = """
        SELECT 
            Id as AlimentoId,
            Nome,
            Categoria,
            EnergiaKcalPor100,
            ProteinaGPor100,
            EhPreTermo
        FROM nutricao.Alimento
        WHERE Ativo = 1 AND Excluido = 0
        """
        
        alimentos_df = execute_query(query)
        
        if alimentos_df.empty:
            logger.warning("Nenhum alimento encontrado para recomendação")
            return []
        
        # Criar features para cada alimento com o perfil da criança
        recomendacoes = []
        
        for _, alimento in alimentos_df.iterrows():
            # Combinar perfil da criança com características do alimento
            features = {
                'IdadeGestacionalSemanas': crianca_perfil.get('idade_gestacional_semanas', 37),
                'PesoNascimentoGr': crianca_perfil.get('peso_atual_gr', 3000),
                'SexoNumerico': 0 if crianca_perfil.get('sexo', 'M') == 'M' else 1,
                'DiasDeVida': crianca_perfil.get('dias_de_vida', 0),
                'ZScoreInicial': crianca_perfil.get('zscore_atual', 0),
                'EnergiaKcalPor100': float(alimento['EnergiaKcalPor100']),
                'ProteinaGPor100': float(alimento['ProteinaGPor100']),
                'Quantidade': 100.0,  # Quantidade padrão
                'TaxaEnergeticaKcalKg': 120.0,  # Padrão
                'MetaProteinaGKg': 3.0,  # Padrão
                'EhPreTermo': int(alimento['EhPreTermo'])
            }
            
            # Criar DataFrame com features
            X = pd.DataFrame([features])
            
            # Adicionar colunas de classificação que faltam (preencher com 0)
            for col in self.feature_columns:
                if col not in X.columns:
                    X[col] = 0
            
            # Garantir ordem correta das colunas
            X = X[self.feature_columns]
            
            # Predizer probabilidade de sucesso
            try:
                prob_sucesso = self.model.predict_proba(X)[0][1]  # Probabilidade da classe "sucesso"
            except Exception as e:
                logger.warning(f"Erro ao predizer para alimento {alimento['Nome']}: {e}")
                prob_sucesso = 0.5  # Fallback
            
            recomendacoes.append({
                'alimento_id': str(alimento['AlimentoId']),
                'nome': alimento['Nome'],
                'categoria': alimento['Categoria'],
                'probabilidade_sucesso': float(prob_sucesso),
                'energia_kcal_por_100': float(alimento['EnergiaKcalPor100']),
                'proteina_g_por_100': float(alimento['ProteinaGPor100']),
                'eh_pre_termo': bool(alimento['EhPreTermo'])
            })
        
        # Ordenar por probabilidade e retornar top N
        recomendacoes.sort(key=lambda x: x['probabilidade_sucesso'], reverse=True)
        
        # Adicionar ranking e justificativa
        for idx, rec in enumerate(recomendacoes[:top_n]):
            rec['ranking'] = idx + 1
            
            # Justificativa baseada em características
            justificativa = []
            if rec['probabilidade_sucesso'] > 0.7:
                justificativa.append("Alta probabilidade de sucesso baseada em casos similares")
            elif rec['probabilidade_sucesso'] > 0.5:
                justificativa.append("Probabilidade moderada de sucesso")
            else:
                justificativa.append("Probabilidade baixa - considerar outras opções")
            
            if rec['eh_pre_termo'] and crianca_perfil.get('idade_gestacional_semanas', 37) < 37:
                justificativa.append("Indicado para pré-termo")
            
            if rec['energia_kcal_por_100'] > 70:
                justificativa.append("Alto teor energético")
            
            if rec['proteina_g_por_100'] > 2:
                justificativa.append("Alto teor proteico")
            
            rec['justificativa'] = ". ".join(justificativa) + "."
        
        return recomendacoes[:top_n]
    
    def analyze_food_effectiveness(
        self,
        alimento_id: str,
        perfil_filter: Optional[Dict] = None
    ) -> Dict:
        """
        Analisa efetividade de um alimento específico para um perfil
        """
        # Buscar histórico de uso do alimento
        filter_clause = f"AND a.Id = '{alimento_id}'"
        
        if perfil_filter:
            if perfil_filter.get('classificacao_ig'):
                filter_clause += f" AND rn.ClassificacaoIG = '{perfil_filter['classificacao_ig']}'"
            if perfil_filter.get('sexo'):
                filter_clause += f" AND rn.Sexo = '{perfil_filter['sexo']}'"
        
        query = f"""
        SELECT 
            COUNT(*) as TotalUsos,
            AVG((c_final.ZScorePeso - c_inicial.ZScorePeso)) as MediaDeltaZScore,
            AVG((c_final.PesoKg - c_inicial.PesoKg) * 1000 / 
                DATEDIFF(day, c_inicial.DataHora, c_final.DataHora)) as MediaGanhoPeso,
            SUM(CASE WHEN (c_final.ZScorePeso - c_inicial.ZScorePeso) > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as TaxaSucesso
            
        FROM nutricao.Alimento a
        INNER JOIN nutricao.DietaItem di ON a.Id = di.AlimentoId
        INNER JOIN nutricao.Dieta d ON di.DietaId = d.Id
        INNER JOIN clinica.RecemNascido rn ON d.RecemNascidoId = rn.Id
        
        CROSS APPLY (
            SELECT TOP 1 * FROM clinica.Consulta
            WHERE RecemNascidoId = rn.Id 
            AND DataHora >= d.DataInicio
            AND ZScorePeso IS NOT NULL
            ORDER BY DataHora
        ) c_inicial
        
        CROSS APPLY (
            SELECT TOP 1 * FROM clinica.Consulta
            WHERE RecemNascidoId = rn.Id 
            AND DataHora > c_inicial.DataHora
            AND DATEDIFF(day, c_inicial.DataHora, DataHora) BETWEEN 7 AND 21
            AND ZScorePeso IS NOT NULL
            ORDER BY DataHora
        ) c_final
        
        WHERE a.Id = '{alimento_id}'
        {filter_clause}
        """
        
        result = execute_query(query)
        
        if result.empty:
            return {
                'alimento_id': alimento_id,
                'total_usos': 0,
                'media_delta_zscore': 0,
                'media_ganho_peso': 0,
                'taxa_sucesso': 0
            }
        
        row = result.iloc[0]
        return {
            'alimento_id': alimento_id,
            'total_usos': int(row['TotalUsos']),
            'media_delta_zscore': float(row['MediaDeltaZScore']),
            'media_ganho_peso': float(row['MediaGanhoPeso']),
            'taxa_sucesso': float(row['TaxaSucesso'])
        }
    
    def save_model(self):
        """Salva modelo em disco"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'alimento_encoder': self.alimento_encoder,
            'alimento_decoder': self.alimento_decoder,
            'metrics': self.metrics,
            'trained_at': self.trained_at
        }
        
        joblib.dump(model_data, self.model_path)
        logger.info(f"Modelo de recomendação salvo em {self.model_path}")
    
    def load_model(self):
        """Carrega modelo do disco"""
        model_data = joblib.load(self.model_path)
        self.model = model_data['model']
        self.scaler = model_data.get('scaler', StandardScaler())
        self.feature_columns = model_data['feature_columns']
        self.alimento_encoder = model_data.get('alimento_encoder', {})
        self.alimento_decoder = model_data.get('alimento_decoder', {})
        self.metrics = model_data.get('metrics', {})
        self.trained_at = model_data.get('trained_at')
        logger.info(f"Modelo de recomendação carregado de {self.model_path}")


# Singleton global
_food_recommender = None

def get_food_recommender() -> FoodRecommender:
    """Retorna instância singleton do recomendador"""
    global _food_recommender
    if _food_recommender is None:
        _food_recommender = FoodRecommender()
    return _food_recommender

