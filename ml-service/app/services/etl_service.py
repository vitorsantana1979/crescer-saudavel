"""Serviço de ETL para extração e transformação de dados"""
import pandas as pd
import numpy as np
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import logging

from app.database import execute_query

logger = logging.getLogger(__name__)


class ETLService:
    """Serviço para extração e transformação de dados do banco"""
    
    @staticmethod
    def get_crianca_timeline(crianca_id: Optional[str] = None) -> pd.DataFrame:
        """
        Extrai timeline completa de uma ou todas as crianças
        
        Args:
            crianca_id: ID da criança (opcional, None = todas)
            
        Returns:
            DataFrame com timeline
        """
        where_clause = f"AND rn.Id = '{crianca_id}'" if crianca_id else ""
        
        query = f"""
        SELECT 
            rn.Id as CriancaId,
            rn.Sexo,
            rn.IdadeGestacionalSemanas,
            rn.PesoNascimentoGr,
            rn.ComprimentoCm as ComprimentoNascimento,
            rn.PerimetroCefalicoCm,
            rn.ClassificacaoIG,
            rn.ClassificacaoPN as ClassificacaoPeso,
            rn.Apgar1Minuto,
            rn.Apgar5Minuto,
            rn.DataNascimento,
            
            c.Id as ConsultaId,
            c.DataHora as DataConsulta,
            c.PesoKg * 1000 as PesoGr,
            c.EstaturaCm,
            c.PerimetroCefalicoCm,
            c.ZScorePeso,
            c.ZScoreAltura,
            c.ZScorePerimetro,
            
            d.Id as DietaId,
            d.DataInicio as DietaDataInicio,
            d.DataFim as DietaDataFim,
            d.TaxaEnergeticaKcalKg,
            d.MetaProteinaGKg,
            d.PesoReferenciaKg,
            d.FrequenciaHoras,
            d.ViaAdministracao,
            
            DATEDIFF(day, rn.DataNascimento, c.DataHora) as DiasDeVida
            
        FROM clinica.RecemNascido rn
        LEFT JOIN clinica.Consulta c ON rn.Id = c.RecemNascidoId
        LEFT JOIN nutricao.Dieta d ON rn.Id = d.RecemNascidoId 
            AND c.DataHora >= d.DataInicio 
            AND (d.DataFim IS NULL OR c.DataHora <= d.DataFim)
        WHERE c.DataHora IS NOT NULL
        {where_clause}
        ORDER BY rn.Id, c.DataHora
        """
        
        df = execute_query(query)
        return df
    
    @staticmethod
    def compute_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Computa features para ML a partir da timeline
        
        Args:
            df: DataFrame com timeline
            
        Returns:
            DataFrame com features computadas
        """
        df = df.copy()
        
        # Ordenar por criança e data
        df = df.sort_values(['CriancaId', 'DataConsulta'])
        
        # Calcular valores anteriores (lag features)
        df['PesoAnterior'] = df.groupby('CriancaId')['PesoGr'].shift(1)
        df['ZScoreAnterior'] = df.groupby('CriancaId')['ZScorePeso'].shift(1)
        df['DataConsultaAnterior'] = df.groupby('CriancaId')['DataConsulta'].shift(1)
        
        # Calcular mudanças
        df['DeltaPeso'] = df['PesoGr'] - df['PesoAnterior']
        df['DeltaZScore'] = df['ZScorePeso'] - df['ZScoreAnterior']
        
        # Calcular dias entre consultas
        df['DiasEntreConsultas'] = (
            (df['DataConsulta'] - df['DataConsultaAnterior']).dt.total_seconds() / 86400
        )
        
        # Velocidade de ganho de peso (g/dia)
        df['VelocidadePeso'] = df['DeltaPeso'] / df['DiasEntreConsultas']
        df['VelocidadeZScore'] = df['DeltaZScore'] / df['DiasEntreConsultas']
        
        # Features agregadas (janelas móveis)
        for window in [7, 14, 28]:
            # Média de energia dos últimos N dias
            df[f'EnergiaMedia_{window}d'] = df.groupby('CriancaId')['TaxaEnergeticaKcalKg'].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
            
            # Média de proteína dos últimos N dias
            df[f'ProteinaMedia_{window}d'] = df.groupby('CriancaId')['MetaProteinaGKg'].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
        
        # Converter sexo para numérico
        df['SexoNumerico'] = df['Sexo'].map({'M': 0, 'F': 1})
        
        # Classificações como one-hot encoding
        df = pd.get_dummies(df, columns=['ClassificacaoIG', 'ClassificacaoPeso'], 
                           prefix=['ClassIG', 'ClassPeso'], 
                           drop_first=False, dummy_na=True)
        
        return df
    
    @staticmethod
    def prepare_training_data(horizonte_dias: int = 14) -> pd.DataFrame:
        """
        Prepara dados para treinamento do modelo
        
        Args:
            horizonte_dias: Horizonte de predição (quantos dias à frente)
            
        Returns:
            DataFrame com features (X) e target (y)
        """
        # Extrair timeline
        df = ETLService.get_crianca_timeline()
        
        if df.empty:
            logger.warning("Nenhum dado encontrado para treinamento")
            return pd.DataFrame()
        
        # Computar features
        df = ETLService.compute_features(df)
        
        # Criar target: Z-Score daqui a N dias
        df = df.sort_values(['CriancaId', 'DataConsulta'])
        
        # Para cada linha, pegar o z-score N dias à frente
        df['DiasProximaConsulta'] = df.groupby('CriancaId')['DiasEntreConsultas'].shift(-1)
        df['ZScoreFuturo'] = df.groupby('CriancaId')['ZScorePeso'].shift(-1)
        df['DataFutura'] = df.groupby('CriancaId')['DataConsulta'].shift(-1)
        
        # Calcular dias até a próxima medida
        df['DiasAteProximaMedida'] = (
            (df['DataFutura'] - df['DataConsulta']).dt.total_seconds() / 86400
        )
        
        # Filtrar apenas medidas que estão aproximadamente no horizonte desejado
        # (aceitar margem de ±3 dias)
        margin = 3
        df_train = df[
            (df['DiasAteProximaMedida'] >= horizonte_dias - margin) & 
            (df['DiasAteProximaMedida'] <= horizonte_dias + margin)
        ].copy()
        
        # Target
        df_train['Target_DeltaZScore'] = df_train['ZScoreFuturo'] - df_train['ZScorePeso']
        
        # Remover linhas com valores nulos no target
        df_train = df_train.dropna(subset=['Target_DeltaZScore'])
        
        logger.info(f"Dados de treinamento preparados: {len(df_train)} amostras")
        
        return df_train
    
    @staticmethod
    def get_crianca_perfil(crianca_id: str) -> Optional[Dict]:
        """
        Obtém perfil completo de uma criança
        
        Args:
            crianca_id: ID da criança
            
        Returns:
            Dicionário com dados da criança
        """
        query = f"""
        SELECT 
            rn.Id,
            rn.Nome,
            rn.Sexo,
            rn.DataNascimento,
            rn.IdadeGestacionalSemanas,
            rn.PesoNascimentoGr,
            rn.ComprimentoCm,
            rn.PerimetroCefalicoCm,
            rn.ClassificacaoIG,
            rn.ClassificacaoPeso,
            rn.Apgar1Minuto,
            rn.Apgar5Minuto,
            rn.TipoParto,
            
            -- Última consulta
            c_ultima.PesoGr as PesoAtualGr,
            c_ultima.ZScorePeso as ZScoreAtual,
            c_ultima.DataHora as UltimaConsulta,
            DATEDIFF(day, rn.DataNascimento, GETDATE()) as DiasDeVida
            
        FROM clinica.RecemNascido rn
        LEFT JOIN LATERAL (
            SELECT TOP 1 PesoGr, ZScorePeso, DataHora
            FROM clinica.Consulta
            WHERE RecemNascidoId = rn.Id
            ORDER BY DataHora DESC
        ) c_ultima ON 1=1
        WHERE rn.Id = '{crianca_id}'
        """
        
        # SQL Server não suporta LATERAL, usar subquery alternativa
        query = f"""
        SELECT 
            rn.Id,
            rn.Nome,
            rn.Sexo,
            rn.DataNascimento,
            rn.IdadeGestacionalSemanas,
            rn.PesoNascimentoGr,
            rn.ComprimentoCm,
            rn.PerimetroCefalicoCm,
            rn.ClassificacaoIG,
            rn.ClassificacaoPN as ClassificacaoPeso,
            rn.Apgar1Minuto,
            rn.Apgar5Minuto,
            rn.TipoParto,
            c_ultima.PesoAtualKg * 1000 as PesoAtualGr,
            c_ultima.ZScoreAtual,
            c_ultima.UltimaConsulta,
            DATEDIFF(day, rn.DataNascimento, GETDATE()) as DiasDeVida
        FROM clinica.RecemNascido rn
        OUTER APPLY (
            SELECT TOP 1 
                PesoKg as PesoAtualKg, 
                ZScorePeso as ZScoreAtual, 
                DataHora as UltimaConsulta
            FROM clinica.Consulta
            WHERE RecemNascidoId = rn.Id
            ORDER BY DataHora DESC
        ) c_ultima
        WHERE rn.Id = '{crianca_id}'
        """
        
        df = execute_query(query)
        
        if df.empty:
            return None
        
        return df.iloc[0].to_dict()
    
    @staticmethod
    def get_statistics() -> Dict:
        """
        Obtém estatísticas gerais do sistema
        
        Returns:
            Dicionário com estatísticas
        """
        query = """
        SELECT 
            COUNT(DISTINCT rn.Id) as TotalCriancas,
            COUNT(DISTINCT c.Id) as TotalConsultas,
            COUNT(DISTINCT d.Id) as TotalDietas,
            AVG(c.ZScorePeso) as MediaZScore,
            AVG(rn.IdadeGestacionalSemanas) as MediaIG
        FROM clinica.RecemNascido rn
        LEFT JOIN clinica.Consulta c ON rn.Id = c.RecemNascidoId
        LEFT JOIN nutricao.Dieta d ON rn.Id = d.RecemNascidoId
        """
        
        df = execute_query(query)
        stats = df.iloc[0].to_dict() if not df.empty else {}
        
        # Distribuição de classificações IG
        query_ig = """
        SELECT 
            ClassificacaoIG, 
            COUNT(*) as Count
        FROM clinica.RecemNascido
        WHERE ClassificacaoIG IS NOT NULL
        GROUP BY ClassificacaoIG
        """
        
        df_ig = execute_query(query_ig)
        stats['DistribuicaoIG'] = df_ig.set_index('ClassificacaoIG')['Count'].to_dict()
        
        return stats


if __name__ == "__main__":
    """Teste do ETL Service"""
    import json
    
    print("=" * 60)
    print("TESTE DO ETL SERVICE")
    print("=" * 60)
    
    # Configurar logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Teste 1: Estatísticas gerais
    print("\n📊 1. Estatísticas Gerais:")
    print("-" * 60)
    try:
        stats = ETLService.get_statistics()
        print(json.dumps(stats, indent=2, default=str))
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # Teste 2: Extrair timeline de todas as crianças (primeiras 5)
    print("\n👶 2. Timeline (primeiras 5 linhas):")
    print("-" * 60)
    try:
        df_timeline = ETLService.get_crianca_timeline()
        print(f"Total de registros: {len(df_timeline)}")
        if not df_timeline.empty:
            print(df_timeline.head())
        else:
            print("❌ Nenhum dado encontrado")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    # Teste 3: Preparar dados de treinamento
    print("\n🧠 3. Dados de Treinamento (14 dias):")
    print("-" * 60)
    try:
        df_train = ETLService.prepare_training_data(horizonte_dias=14)
        print(f"Total de amostras: {len(df_train)}")
        if not df_train.empty:
            print(f"Colunas: {list(df_train.columns)}")
            print(f"\nTarget stats:")
            print(df_train['Target_DeltaZScore'].describe())
        else:
            print("❌ Nenhum dado de treinamento preparado")
    except Exception as e:
        print(f"❌ Erro: {e}")
    
    print("\n" + "=" * 60)
    print("TESTE CONCLUÍDO")
    print("=" * 60)
