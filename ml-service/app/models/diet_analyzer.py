"""Analisador de padrões de dieta e casos similares"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import logging

from app.services.etl_service import ETLService

logger = logging.getLogger(__name__)


class DietAnalyzer:
    """Analisador para encontrar padrões de dieta e casos similares"""
    
    # Features usadas para similaridade
    SIMILARITY_FEATURES = [
        'IdadeGestacionalSemanas',
        'PesoNascimentoGr',
        'SexoNumerico',
        'Apgar1Minuto',
        'Apgar5Minuto',
        'ZScorePeso',
    ]
    
    def __init__(self):
        """Inicializa o analisador"""
        self.scaler = StandardScaler()
        self.knn_model = NearestNeighbors(n_neighbors=20, metric='euclidean')
        self.dataset = None
        self.is_fitted = False
    
    def fit(self, df: pd.DataFrame):
        """
        Treina o modelo de similaridade com dados históricos
        
        Args:
            df: DataFrame com histórico de crianças
        """
        if df.empty:
            logger.warning("DataFrame vazio, não é possível fazer fit")
            return
        
        # Preparar features para similaridade
        features_for_similarity = []
        for col in self.SIMILARITY_FEATURES:
            if col in df.columns:
                features_for_similarity.append(col)
        
        if not features_for_similarity:
            logger.error("Nenhuma feature de similaridade encontrada no DataFrame")
            return
        
        # Preencher valores nulos
        df_clean = df[features_for_similarity].fillna(df[features_for_similarity].median())
        
        # Normalizar features
        X_scaled = self.scaler.fit_transform(df_clean)
        
        # Treinar KNN
        self.knn_model.fit(X_scaled)
        self.dataset = df.copy()
        self.is_fitted = True
        
        logger.info(f"DietAnalyzer treinado com {len(df)} casos")
    
    def find_similar_cases(
        self, 
        crianca_perfil: Dict, 
        top_n: int = 10,
        min_delta_zscore: float = 0.1
    ) -> List[Dict]:
        """
        Encontra casos similares no histórico com bons desfechos
        
        Args:
            crianca_perfil: Dicionário com perfil da criança
            top_n: Número de casos a retornar
            min_delta_zscore: Mínimo de melhora no z-score para considerar sucesso
            
        Returns:
            Lista de casos similares com suas dietas e desfechos
        """
        if not self.is_fitted or self.dataset is None:
            # Se não tiver treinado, treinar agora
            df_all = ETLService.get_crianca_timeline()
            if not df_all.empty:
                df_all = ETLService.compute_features(df_all)
                self.fit(df_all)
            else:
                logger.warning("Não há dados para encontrar casos similares")
                return []
        
        # Preparar features do perfil atual
        features = []
        for col in self.SIMILARITY_FEATURES:
            if col in crianca_perfil:
                features.append(crianca_perfil[col])
            else:
                # Usar valor médio se não disponível
                if col in self.dataset.columns:
                    features.append(self.dataset[col].median())
                else:
                    features.append(0)
        
        # Normalizar
        X_query = self.scaler.transform([features])
        
        # Encontrar vizinhos mais próximos
        distances, indices = self.knn_model.kneighbors(X_query, n_neighbors=min(top_n * 3, len(self.dataset)))
        
        # Coletar casos
        similar_cases = []
        for dist, idx in zip(distances[0], indices[0]):
            caso = self.dataset.iloc[idx]
            
            # Verificar se teve melhora significativa
            delta_zscore = caso.get('DeltaZScore', 0)
            if delta_zscore < min_delta_zscore:
                continue  # Pular casos sem sucesso
            
            # Calcular score de similaridade (0-1, onde 1 é idêntico)
            similarity_score = 1.0 / (1.0 + dist)
            
            similar_case = {
                'crianca_id': str(caso.get('CriancaId', '')),
                'idade_gestacional_semanas': float(caso.get('IdadeGestacionalSemanas', 0)),
                'peso_nascimento_gr': int(caso.get('PesoNascimentoGr', 0)) if not pd.isna(caso.get('PesoNascimentoGr')) else 0,
                'sexo': caso.get('Sexo', 'M'),
                'classificacao_ig': caso.get('ClassificacaoIG', None) if 'ClassificacaoIG' in caso else None,
                'classificacao_peso': caso.get('ClassificacaoPeso', None) if 'ClassificacaoPeso' in caso else None,
                
                # Dieta usada
                'taxa_energetica_kcal_kg': float(caso.get('TaxaEnergeticaKcalKg', 0)) if not pd.isna(caso.get('TaxaEnergeticaKcalKg')) else 0.0,
                'meta_proteina_g_kg': float(caso.get('MetaProteinaGKg', 0)) if not pd.isna(caso.get('MetaProteinaGKg')) else 0.0,
                
                # Desfecho
                'delta_zscore_real': float(delta_zscore),
                'dias_acompanhamento': int(caso.get('DiasEntreConsultas', 14)) if not pd.isna(caso.get('DiasEntreConsultas')) else 14,
                'zscore_inicial': float(caso.get('ZScoreAnterior', caso.get('ZScorePeso', 0))) if not pd.isna(caso.get('ZScoreAnterior')) else float(caso.get('ZScorePeso', 0)),
                'zscore_final': float(caso.get('ZScorePeso', 0)) if not pd.isna(caso.get('ZScorePeso')) else 0.0,
                'sucesso': delta_zscore >= min_delta_zscore,
                
                # Similaridade
                'similarity_score': float(similarity_score)
            }
            
            similar_cases.append(similar_case)
            
            if len(similar_cases) >= top_n:
                break
        
        # Ordenar por combinação de similaridade e sucesso
        similar_cases.sort(
            key=lambda x: (x['similarity_score'] * 0.5 + x['delta_zscore_real'] * 0.5),
            reverse=True
        )
        
        return similar_cases[:top_n]
    
    def compare_diet_scenarios(
        self, 
        crianca_perfil: Dict,
        dietas_cenarios: List[Dict],
        growth_predictor
    ) -> List[Dict]:
        """
        Compara múltiplos cenários de dieta
        
        Args:
            crianca_perfil: Perfil da criança
            dietas_cenarios: Lista de cenários de dieta
            growth_predictor: Instância do GrowthPredictor para fazer predições
            
        Returns:
            Lista de comparações ranqueadas
        """
        comparisons = []
        
        for idx, cenario in enumerate(dietas_cenarios):
            # Fazer predição para este cenário
            try:
                predicao = growth_predictor.predict_zscore_change(
                    crianca_features=crianca_perfil,
                    dieta_features=cenario,
                    horizonte_dias=14
                )
                
                # Calcular score de adequação (0-100)
                # Baseado em:
                # - Delta z-score esperado
                # - Probabilidade de melhora
                # - Confiabilidade do modelo
                
                delta_score = min(max(predicao['delta_zscore_pred'] * 20, 0), 50)
                prob_score = predicao['probabilidade_melhora'] * 30
                
                confiabilidade_scores = {'alta': 20, 'media': 10, 'baixa': 5}
                conf_score = confiabilidade_scores.get(predicao['confiabilidade'], 10)
                
                score = delta_score + prob_score + conf_score
                
                comparison = {
                    'cenario': cenario,
                    'predicao': predicao,
                    'score': float(score),
                    'ranking': 0  # Será preenchido depois
                }
                
                comparisons.append(comparison)
                
            except Exception as e:
                logger.error(f"Erro ao fazer predição para cenário {idx}: {e}")
                continue
        
        # Ordenar por score e atribuir ranking
        comparisons.sort(key=lambda x: x['score'], reverse=True)
        for rank, comp in enumerate(comparisons, 1):
            comp['ranking'] = rank
        
        return comparisons
    
    def get_diet_patterns(self, classification_ig: Optional[str] = None) -> Dict:
        """
        Analisa padrões de dieta por classificação IG
        
        Args:
            classification_ig: Filtrar por classificação específica
            
        Returns:
            Dicionário com padrões encontrados
        """
        # Buscar dados originais (sem transformações)
        df = ETLService.get_crianca_timeline()
        if df.empty:
            return {}
        
        # Computar apenas as features necessárias (DeltaZScore)
        df = df.sort_values(['CriancaId', 'DataConsulta'])
        df['ZScoreAnterior'] = df.groupby('CriancaId')['ZScorePeso'].shift(1)
        df['DeltaZScore'] = df['ZScorePeso'] - df['ZScoreAnterior']
        
        if classification_ig:
            df = df[df['ClassificacaoIG'] == classification_ig]
        
        if df.empty:
            return {}
        
        # Filtrar apenas casos com sucesso (delta z-score positivo)
        df_sucesso = df[df['DeltaZScore'] > 0.1]
        
        patterns = {
            'total_casos': len(df),
            'casos_sucesso': len(df_sucesso),
            'taxa_sucesso': len(df_sucesso) / len(df) if len(df) > 0 else 0,
            'energia': {
                'media': float(df_sucesso['TaxaEnergeticaKcalKg'].mean()) if len(df_sucesso) > 0 else 0,
                'mediana': float(df_sucesso['TaxaEnergeticaKcalKg'].median()) if len(df_sucesso) > 0 else 0,
                'q25': float(df_sucesso['TaxaEnergeticaKcalKg'].quantile(0.25)) if len(df_sucesso) > 0 else 0,
                'q75': float(df_sucesso['TaxaEnergeticaKcalKg'].quantile(0.75)) if len(df_sucesso) > 0 else 0,
            },
            'proteina': {
                'media': float(df_sucesso['MetaProteinaGKg'].mean()) if len(df_sucesso) > 0 else 0,
                'mediana': float(df_sucesso['MetaProteinaGKg'].median()) if len(df_sucesso) > 0 else 0,
                'q25': float(df_sucesso['MetaProteinaGKg'].quantile(0.25)) if len(df_sucesso) > 0 else 0,
                'q75': float(df_sucesso['MetaProteinaGKg'].quantile(0.75)) if len(df_sucesso) > 0 else 0,
            },
            'delta_zscore_medio': float(df_sucesso['DeltaZScore'].mean()) if len(df_sucesso) > 0 else 0,
        }
        
        return patterns


# Instância global (singleton)
_diet_analyzer = None


def get_diet_analyzer() -> DietAnalyzer:
    """Retorna instância singleton do analisador"""
    global _diet_analyzer
    if _diet_analyzer is None:
        _diet_analyzer = DietAnalyzer()
    return _diet_analyzer


if __name__ == "__main__":
    """Script de teste do Diet Analyzer"""
    import json
    import sys
    import os
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
    
    from app.models.growth_predictor import get_growth_predictor
    
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("=" * 70)
    print("TESTE DO DIET ANALYZER")
    print("=" * 70)
    
    # 1. Preparar dados e treinar
    print("\n📊 1. Carregando dados históricos...")
    print("-" * 70)
    
    try:
        df_timeline = ETLService.get_crianca_timeline()
        
        if df_timeline.empty:
            print("❌ Erro: Nenhum dado disponível.")
            sys.exit(1)
        
        print(f"✅ Timeline carregada: {len(df_timeline)} registros")
        
        # Computar features
        df_features = ETLService.compute_features(df_timeline)
        print(f"✅ Features computadas: {len(df_features.columns)} colunas")
        
        # Treinar analyzer
        analyzer = DietAnalyzer()
        analyzer.fit(df_features)
        print(f"✅ Analyzer treinado com {len(df_features)} casos")
        
    except Exception as e:
        print(f"❌ Erro ao preparar dados: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # 2. Teste: Encontrar casos similares
    print("\n🔍 2. Teste: Encontrar Casos Similares")
    print("-" * 70)
    
    try:
        # Perfil exemplo de uma criança pré-termo
        perfil_exemplo = {
            'IdadeGestacionalSemanas': 32.0,
            'PesoNascimentoGr': 1500,
            'SexoNumerico': 0,  # Masculino
            'Apgar1Minuto': 7,
            'Apgar5Minuto': 9,
            'ZScorePeso': 50.0,
        }
        
        print("   Perfil de busca:")
        print(f"     - IG: {perfil_exemplo['IdadeGestacionalSemanas']} semanas")
        print(f"     - Peso nascimento: {perfil_exemplo['PesoNascimentoGr']} g")
        print(f"     - Z-Score: {perfil_exemplo['ZScorePeso']}")
        
        casos_similares = analyzer.find_similar_cases(
            perfil_exemplo,
            top_n=5,
            min_delta_zscore=0.1
        )
        
        if casos_similares:
            print(f"\n   ✅ Encontrados {len(casos_similares)} casos similares com sucesso:")
            print()
            for i, caso in enumerate(casos_similares, 1):
                print(f"   {i}. Caso {caso['crianca_id'][:8]}...")
                print(f"      IG: {caso['idade_gestacional_semanas']:.1f}sem, "
                      f"PN: {caso['peso_nascimento_gr']}g, "
                      f"Sexo: {caso['sexo']}")
                print(f"      Dieta: {caso['taxa_energetica_kcal_kg']:.1f} kcal/kg, "
                      f"{caso['meta_proteina_g_kg']:.1f} g/kg")
                print(f"      Resultado: Δ Z-Score = {caso['delta_zscore_real']:.2f} "
                      f"({caso['dias_acompanhamento']} dias)")
                print(f"      Similaridade: {caso['similarity_score']*100:.1f}%")
                print()
        else:
            print("   ⚠️  Nenhum caso similar encontrado.")
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    # 3. Teste: Comparar cenários de dieta
    print("\n🧪 3. Teste: Comparação de Cenários de Dieta")
    print("-" * 70)
    
    try:
        # Carregar modelo de predição
        predictor = get_growth_predictor()
        
        if predictor.model is None:
            print("   ⚠️  Modelo de predição não disponível. Pulando teste.")
        else:
            perfil_crianca = {
                'IdadeGestacionalSemanas': 32.0,
                'PesoNascimentoGr': 1500,
                'SexoNumerico': 0,
                'Apgar1Minuto': 7,
                'Apgar5Minuto': 9,
                'DiasDeVida': 10,
                'PesoGr': 1600,
                'ZScorePeso': 50.0,
                'VelocidadePeso': 10.0,
            }
            
            # Diferentes cenários de dieta
            cenarios = [
                {
                    'nome': 'Conservadora',
                    'TaxaEnergeticaKcalKg': 100,
                    'MetaProteinaGKg': 3.0,
                    'FrequenciaHoras': 3,
                    'EnergiaMedia_7d': 100,
                    'EnergiaMedia_14d': 100,
                    'ProteinaMedia_7d': 3.0,
                    'ProteinaMedia_14d': 3.0,
                },
                {
                    'nome': 'Moderada',
                    'TaxaEnergeticaKcalKg': 120,
                    'MetaProteinaGKg': 3.5,
                    'FrequenciaHoras': 3,
                    'EnergiaMedia_7d': 120,
                    'EnergiaMedia_14d': 120,
                    'ProteinaMedia_7d': 3.5,
                    'ProteinaMedia_14d': 3.5,
                },
                {
                    'nome': 'Agressiva',
                    'TaxaEnergeticaKcalKg': 140,
                    'MetaProteinaGKg': 4.0,
                    'FrequenciaHoras': 2,
                    'EnergiaMedia_7d': 140,
                    'EnergiaMedia_14d': 140,
                    'ProteinaMedia_7d': 4.0,
                    'ProteinaMedia_14d': 4.0,
                },
            ]
            
            # Remover campo 'nome' para predição
            cenarios_para_pred = []
            for c in cenarios:
                c_copy = c.copy()
                nome = c_copy.pop('nome')
                cenarios_para_pred.append(c_copy)
            
            comparacoes = analyzer.compare_diet_scenarios(
                perfil_crianca,
                cenarios_para_pred,
                predictor
            )
            
            print("   Cenários ranqueados:")
            print()
            for comp in comparacoes:
                # Recuperar nome
                idx = comparacoes.index(comp)
                nome = cenarios[idx]['nome']
                cenario = comp['cenario']
                predicao = comp['predicao']
                
                print(f"   #{comp['ranking']} - {nome} (Score: {comp['score']:.1f})")
                print(f"      Dieta: {cenario['TaxaEnergeticaKcalKg']:.0f} kcal/kg, "
                      f"{cenario['MetaProteinaGKg']:.1f} g/kg, "
                      f"{cenario['FrequenciaHoras']:.0f}h/h")
                print(f"      Predição: Δ Z-Score = {predicao['delta_zscore_pred']:.2f}")
                print(f"      Prob. melhora: {predicao['probabilidade_melhora']*100:.0f}%")
                print(f"      Confiabilidade: {predicao['confiabilidade']}")
                print()
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    # 4. Análise de padrões por classificação IG
    print("\n📈 4. Padrões de Dieta por Classificação IG")
    print("-" * 70)
    
    try:
        classificacoes = ['RNPTE', 'RNPTM', 'RNPTMO', 'RNPTT', 'RNT']
        
        for classificacao in classificacoes:
            padroes = analyzer.get_diet_patterns(classificacao)
            
            if padroes and padroes.get('total_casos', 0) > 0:
                print(f"\n   {classificacao}:")
                print(f"     Casos: {padroes['total_casos']} "
                      f"(Sucesso: {padroes['casos_sucesso']}, "
                      f"Taxa: {padroes['taxa_sucesso']*100:.1f}%)")
                
                if padroes['casos_sucesso'] > 0:
                    print(f"     Energia: {padroes['energia']['media']:.1f} kcal/kg "
                          f"(Q25-Q75: {padroes['energia']['q25']:.1f}-{padroes['energia']['q75']:.1f})")
                    print(f"     Proteína: {padroes['proteina']['media']:.1f} g/kg "
                          f"(Q25-Q75: {padroes['proteina']['q25']:.1f}-{padroes['proteina']['q75']:.1f})")
                    print(f"     Δ Z-Score médio: {padroes['delta_zscore_medio']:.2f}")
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    # 5. Resumo final
    print("\n" + "=" * 70)
    print("✅ TESTE DO DIET ANALYZER CONCLUÍDO!")
    print("=" * 70)
    print("\n🚀 O analisador está pronto para:")
    print("   - Encontrar casos similares")
    print("   - Comparar cenários de dieta")
    print("   - Identificar padrões de sucesso")
    print("=" * 70)
