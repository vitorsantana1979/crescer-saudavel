"""Modelo preditivo de crescimento (Δ Z-Score)"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib
import os
from typing import Dict, Tuple, Optional
import logging
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


class GrowthPredictor:
    """Modelo para predição de mudança no z-score"""
    
    # Features usadas para predição
    FEATURE_COLUMNS = [
        'IdadeGestacionalSemanas',
        'PesoNascimentoGr',
        'SexoNumerico',
        'Apgar1Minuto',
        'Apgar5Minuto',
        'DiasDeVida',
        'PesoGr',
        'ZScorePeso',
        'TaxaEnergeticaKcalKg',
        'MetaProteinaGKg',
        'FrequenciaHoras',
        'EnergiaMedia_7d',
        'EnergiaMedia_14d',
        'ProteinaMedia_7d',
        'ProteinaMedia_14d',
        'VelocidadePeso',
    ]
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Inicializa o preditor
        
        Args:
            model_path: Caminho para modelo salvo (opcional)
        """
        self.model = None
        self.feature_columns = self.FEATURE_COLUMNS.copy()
        self.model_path = model_path or os.path.join(settings.MODEL_PATH, 'growth_predictor.joblib')
        self.metrics = {}
        self.trained_at = None
        
        # Tentar carregar modelo existente
        if os.path.exists(self.model_path):
            self.load_model()
        else:
            logger.info("Nenhum modelo treinado encontrado. Criando novo modelo.")
            self.model = xgb.XGBRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1
            )
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepara features para o modelo
        
        Args:
            df: DataFrame com dados brutos
            
        Returns:
            DataFrame com features preparadas
        """
        X = df.copy()
        
        # Garantir que todas as features existam
        for col in self.feature_columns:
            if col not in X.columns:
                logger.warning(f"Feature {col} não encontrada, preenchendo com 0")
                X[col] = 0
        
        # Substituir infinitos por NaN
        X[self.feature_columns] = X[self.feature_columns].replace([np.inf, -np.inf], np.nan)
        
        # Preencher valores nulos com mediana (ou 0 se mediana for NaN)
        for col in self.feature_columns:
            median_val = X[col].median()
            if pd.isna(median_val):
                X[col] = X[col].fillna(0)
            else:
                X[col] = X[col].fillna(median_val)
        
        # Remover outliers extremos (opcional)
        for col in self.feature_columns:
            q1 = X[col].quantile(0.01)
            q3 = X[col].quantile(0.99)
            # Verificar se q1 e q3 são válidos
            if not pd.isna(q1) and not pd.isna(q3) and q3 > q1:
                X[col] = X[col].clip(q1, q3)
        
        # Garantir que não há mais valores infinitos ou NaN
        X[self.feature_columns] = X[self.feature_columns].replace([np.inf, -np.inf], 0)
        X[self.feature_columns] = X[self.feature_columns].fillna(0)
        
        return X[self.feature_columns]
    
    def train(self, df_train: pd.DataFrame, test_size: float = 0.2) -> Dict:
        """
        Treina o modelo
        
        Args:
            df_train: DataFrame com dados de treinamento (deve ter coluna 'Target_DeltaZScore')
            test_size: Proporção de dados para teste
            
        Returns:
            Dicionário com métricas de avaliação
        """
        if 'Target_DeltaZScore' not in df_train.columns:
            raise ValueError("DataFrame deve conter coluna 'Target_DeltaZScore'")
        
        # Preparar features e target
        X = self.prepare_features(df_train)
        y = df_train['Target_DeltaZScore'].values
        
        # Dividir em treino e teste
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        logger.info(f"Treinando modelo com {len(X_train)} amostras de treino e {len(X_test)} de teste")
        
        # Treinar modelo
        self.model.fit(X_train, y_train)
        
        # Avaliar modelo
        y_pred_train = self.model.predict(X_train)
        y_pred_test = self.model.predict(X_test)
        
        # Calcular métricas
        self.metrics = {
            'train': {
                'mae': mean_absolute_error(y_train, y_pred_train),
                'rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
                'r2': r2_score(y_train, y_pred_train)
            },
            'test': {
                'mae': mean_absolute_error(y_test, y_pred_test),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
                'r2': r2_score(y_test, y_pred_test)
            },
            'n_samples': len(X_train) + len(X_test),
            'n_features': len(self.feature_columns)
        }
        
        # Cross-validation score
        cv_scores = cross_val_score(
            self.model, X_train, y_train, 
            cv=5, scoring='neg_mean_absolute_error', n_jobs=-1
        )
        self.metrics['cv_mae'] = -cv_scores.mean()
        self.metrics['cv_mae_std'] = cv_scores.std()
        
        self.trained_at = datetime.now()
        
        logger.info(f"Modelo treinado - Test MAE: {self.metrics['test']['mae']:.4f}, "
                   f"Test RMSE: {self.metrics['test']['rmse']:.4f}, "
                   f"Test R²: {self.metrics['test']['r2']:.4f}")
        
        # Salvar modelo
        self.save_model()
        
        return self.metrics
    
    def predict_zscore_change(
        self, 
        crianca_features: Dict,
        dieta_features: Dict,
        horizonte_dias: int = 14
    ) -> Dict:
        """
        Prediz mudança no z-score para um cenário de dieta
        
        Args:
            crianca_features: Dicionário com características da criança
            dieta_features: Dicionário com características da dieta
            horizonte_dias: Horizonte de predição em dias
            
        Returns:
            Dicionário com predição e intervalo de confiança
        """
        if self.model is None:
            raise ValueError("Modelo não treinado. Execute train() primeiro.")
        
        # Combinar features
        features = {**crianca_features, **dieta_features}
        
        # Criar DataFrame com uma linha
        X = pd.DataFrame([features])
        X = self.prepare_features(X)
        
        # Fazer predição
        delta_zscore_pred = self.model.predict(X)[0]
        
        # Estimar intervalo de confiança usando erro do modelo
        # (método simples - pode ser melhorado com quantile regression)
        std_error = self.metrics.get('test', {}).get('rmse', 0.5)
        confidence = 1.96  # 95% de confiança
        
        intervalo_confianca = {
            'lower': delta_zscore_pred - (confidence * std_error),
            'upper': delta_zscore_pred + (confidence * std_error),
            'confidence_level': 0.95
        }
        
        # Calcular probabilidade de melhora (z-score aumentar)
        probabilidade_melhora = 1.0 / (1.0 + np.exp(-delta_zscore_pred * 2))
        
        # Avaliar confiabilidade da predição
        if self.metrics.get('test', {}).get('r2', 0) > 0.7:
            confiabilidade = 'alta'
        elif self.metrics.get('test', {}).get('r2', 0) > 0.4:
            confiabilidade = 'media'
        else:
            confiabilidade = 'baixa'
        
        result = {
            'delta_zscore_pred': float(delta_zscore_pred),
            'intervalo_confianca': intervalo_confianca,
            'probabilidade_melhora': float(probabilidade_melhora),
            'confiabilidade': confiabilidade,
            'horizonte_dias': horizonte_dias
        }
        
        # Se temos z-score atual, calcular z-score final esperado
        if 'ZScorePeso' in features:
            result['zscore_final_esperado'] = features['ZScorePeso'] + delta_zscore_pred
        
        return result
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Retorna importância das features"""
        if self.model is None:
            return {}
        
        importances = self.model.feature_importances_
        return dict(zip(self.feature_columns, importances))
    
    def save_model(self):
        """Salva modelo em disco"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'feature_columns': self.feature_columns,
            'metrics': self.metrics,
            'trained_at': self.trained_at
        }
        
        joblib.dump(model_data, self.model_path)
        logger.info(f"Modelo salvo em {self.model_path}")
    
    def load_model(self):
        """Carrega modelo do disco"""
        try:
            model_data = joblib.load(self.model_path)
            self.model = model_data['model']
            self.feature_columns = model_data['feature_columns']
            self.metrics = model_data.get('metrics', {})
            self.trained_at = model_data.get('trained_at')
            logger.info(f"Modelo carregado de {self.model_path}")
        except Exception as e:
            logger.error(f"Erro ao carregar modelo: {e}")
            raise


# Instância global (singleton)
_growth_predictor = None


def get_growth_predictor() -> GrowthPredictor:
    """Retorna instância singleton do preditor"""
    global _growth_predictor
    if _growth_predictor is None:
        _growth_predictor = GrowthPredictor()
    return _growth_predictor


if __name__ == "__main__":
    """Script de treinamento do modelo"""
    import json
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
    
    from app.services.etl_service import ETLService
    
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("=" * 70)
    print("TREINAMENTO DO MODELO DE PREDIÇÃO DE CRESCIMENTO")
    print("=" * 70)
    
    # 1. Preparar dados de treinamento
    print("\n📊 1. Preparando dados de treinamento...")
    print("-" * 70)
    
    try:
        df_train = ETLService.prepare_training_data(horizonte_dias=14)
        
        if df_train.empty:
            print("❌ Erro: Nenhum dado de treinamento disponível.")
            sys.exit(1)
        
        print(f"✅ Dados preparados: {len(df_train)} amostras")
        print(f"   Features: {len(df_train.columns)} colunas")
        print(f"   Target (Delta Z-Score):")
        print(f"     - Média: {df_train['Target_DeltaZScore'].mean():.4f}")
        print(f"     - Mediana: {df_train['Target_DeltaZScore'].median():.4f}")
        print(f"     - Std: {df_train['Target_DeltaZScore'].std():.4f}")
        print(f"     - Min: {df_train['Target_DeltaZScore'].min():.4f}")
        print(f"     - Max: {df_train['Target_DeltaZScore'].max():.4f}")
        
    except Exception as e:
        print(f"❌ Erro ao preparar dados: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # 2. Treinar modelo
    print("\n🧠 2. Treinando modelo...")
    print("-" * 70)
    
    try:
        predictor = GrowthPredictor()
        metrics = predictor.train(df_train, test_size=0.2)
        
        print("✅ Modelo treinado com sucesso!")
        print(f"\n📈 Métricas de Avaliação:")
        print(f"   Treino:")
        print(f"     - MAE:  {metrics['train']['mae']:.4f}")
        print(f"     - RMSE: {metrics['train']['rmse']:.4f}")
        print(f"     - R²:   {metrics['train']['r2']:.4f}")
        print(f"   Teste:")
        print(f"     - MAE:  {metrics['test']['mae']:.4f}")
        print(f"     - RMSE: {metrics['test']['rmse']:.4f}")
        print(f"     - R²:   {metrics['test']['r2']:.4f}")
        print(f"   Cross-Validation:")
        print(f"     - MAE: {metrics['cv_mae']:.4f} ± {metrics['cv_mae_std']:.4f}")
        print(f"   Amostras: {metrics['n_samples']}")
        print(f"   Features: {metrics['n_features']}")
        
    except Exception as e:
        print(f"❌ Erro ao treinar modelo: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # 3. Feature Importance
    print("\n🔍 3. Importância das Features:")
    print("-" * 70)
    
    try:
        importances = predictor.get_feature_importance()
        # Ordenar por importância
        sorted_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)
        
        print("   Top 10 features mais importantes:")
        for i, (feature, importance) in enumerate(sorted_features[:10], 1):
            bar = "█" * int(importance * 50)
            print(f"   {i:2d}. {feature:25s} {importance:6.4f} {bar}")
        
    except Exception as e:
        print(f"⚠️  Erro ao calcular importância: {e}")
    
    # 4. Teste de predição
    print("\n🧪 4. Teste de Predição (exemplo):")
    print("-" * 70)
    
    try:
        # Pegar primeira amostra dos dados de teste para exemplo
        sample = df_train.iloc[0]
        
        crianca_features = {
            'IdadeGestacionalSemanas': float(sample['IdadeGestacionalSemanas']),
            'PesoNascimentoGr': float(sample['PesoNascimentoGr']),
            'SexoNumerico': float(sample['SexoNumerico']),
            'Apgar1Minuto': float(sample['Apgar1Minuto']),
            'Apgar5Minuto': float(sample['Apgar5Minuto']),
            'DiasDeVida': float(sample['DiasDeVida']),
            'PesoGr': float(sample['PesoGr']),
            'ZScorePeso': float(sample['ZScorePeso']),
            'VelocidadePeso': float(sample.get('VelocidadePeso', 0)),
        }
        
        dieta_features = {
            'TaxaEnergeticaKcalKg': float(sample.get('TaxaEnergeticaKcalKg', 0)),
            'MetaProteinaGKg': float(sample.get('MetaProteinaGKg', 0)),
            'FrequenciaHoras': float(sample.get('FrequenciaHoras', 3)),
            'EnergiaMedia_7d': float(sample.get('EnergiaMedia_7d', 0)),
            'EnergiaMedia_14d': float(sample.get('EnergiaMedia_14d', 0)),
            'ProteinaMedia_7d': float(sample.get('ProteinaMedia_7d', 0)),
            'ProteinaMedia_14d': float(sample.get('ProteinaMedia_14d', 0)),
        }
        
        prediction = predictor.predict_zscore_change(
            crianca_features,
            dieta_features,
            horizonte_dias=14
        )
        
        print(f"   Entrada:")
        print(f"     - Z-Score atual: {crianca_features['ZScorePeso']:.4f}")
        print(f"     - Peso atual: {crianca_features['PesoGr']/1000:.3f} kg")
        print(f"     - Dias de vida: {crianca_features['DiasDeVida']}")
        print(f"     - Taxa energética: {dieta_features['TaxaEnergeticaKcalKg']:.1f} kcal/kg/dia")
        print(f"   Predição (14 dias):")
        print(f"     - Δ Z-Score: {prediction['delta_zscore_pred']:.4f}")
        print(f"     - Z-Score final esperado: {prediction.get('zscore_final_esperado', 'N/A')}")
        print(f"     - Intervalo 95%: [{prediction['intervalo_confianca']['lower']:.4f}, "
              f"{prediction['intervalo_confianca']['upper']:.4f}]")
        print(f"     - Probabilidade melhora: {prediction['probabilidade_melhora']*100:.1f}%")
        print(f"     - Confiabilidade: {prediction['confiabilidade']}")
        print(f"   Real:")
        print(f"     - Δ Z-Score: {sample['Target_DeltaZScore']:.4f}")
        print(f"     - Erro: {abs(prediction['delta_zscore_pred'] - sample['Target_DeltaZScore']):.4f}")
        
    except Exception as e:
        print(f"⚠️  Erro ao testar predição: {e}")
        import traceback
        traceback.print_exc()
    
    # 5. Resumo final
    print("\n" + "=" * 70)
    print("✅ TREINAMENTO CONCLUÍDO COM SUCESSO!")
    print("=" * 70)
    print(f"\nModelo salvo em: {predictor.model_path}")
    print(f"Performance (Teste): R² = {metrics['test']['r2']:.4f}, MAE = {metrics['test']['mae']:.4f}")
    print(f"Treinado em: {predictor.trained_at}")
    print("\n🚀 O modelo está pronto para fazer predições!")
    print("=" * 70)
