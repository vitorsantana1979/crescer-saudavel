#!/usr/bin/env python3
"""
Script para converter CSV OMS (WHO) de peso para JSON
Formato esperado: semanas, z_-3, z_-2, z_-1, z_0, z_1, z_2, z_3
"""

import pandas as pd
import json
from pathlib import Path
import sys
import numpy as np

def convert_oms_peso_csv_to_json(csv_path, json_path, sexo):
    """
    Converte CSV OMS de peso para JSON no formato esperado
    """
    try:
        print(f"📊 Processando {csv_path}...")
        
        # Tentar diferentes encodings e delimitadores
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        delimiters = [',', ';', '\t']
        
        df = None
        for encoding in encodings:
            for delimiter in delimiters:
                try:
                    df = pd.read_csv(csv_path, encoding=encoding, delimiter=delimiter, skipinitialspace=True)
                    if len(df.columns) > 3:  # Verificar se parece um CSV válido
                        print(f"✅ CSV lido com encoding={encoding}, delimiter='{delimiter}'")
                        break
                except:
                    continue
            if df is not None and len(df.columns) > 3:
                break
        
        if df is None or len(df.columns) < 3:
            print(f"❌ Não foi possível ler o CSV {csv_path}")
            print(f"   Tentando ler como texto...")
            with open(csv_path, 'rb') as f:
                content = f.read(500)
                print(f"   Primeiros bytes: {content[:200]}")
            return False
        
        print(f"   Colunas encontradas: {list(df.columns)}")
        print(f"   Primeiras linhas:")
        print(df.head())
        
        # Procurar coluna de idade
        age_col = None
        for col in df.columns:
            col_lower = col.lower().strip()
            if 'age' in col_lower or 'idade' in col_lower or 'day' in col_lower or 'dia' in col_lower or 'week' in col_lower or 'seman' in col_lower:
                age_col = col
                break
        
        if age_col is None:
            # Tentar primeira coluna numérica
            for col in df.columns:
                try:
                    float(df[col].iloc[0])
                    age_col = col
                    break
                except:
                    continue
        
        if age_col is None:
            print(f"❌ Não encontrada coluna de idade")
            return False
        
        print(f"   Usando coluna de idade: {age_col}")
        
        # Procurar colunas de z-scores
        z_cols = {}
        possible_patterns = {
            -3: ['-3', '-3sd', '-3 sd', 'sd3neg', 'z-3', 'z_-3'],
            -2: ['-2', '-2sd', '-2 sd', 'sd2neg', 'z-2', 'z_-2'],
            -1: ['-1', '-1sd', '-1 sd', 'sd1neg', 'z-1', 'z_-1'],
            0: ['0', '0sd', '0 sd', 'sd0', 'median', 'z0', 'z_0'],
            1: ['+1', '1', '+1sd', '+1 sd', '1sd', '1 sd', 'sd1', 'z1', 'z_1', 'z+1'],
            2: ['+2', '2', '+2sd', '+2 sd', '2sd', '2 sd', 'sd2', 'z2', 'z_2', 'z+2'],
            3: ['+3', '3', '+3sd', '+3 sd', '3sd', '3 sd', 'sd3', 'z3', 'z_3', 'z+3'],
        }
        
        for z, patterns in possible_patterns.items():
            for col in df.columns:
                col_lower = col.lower().strip()
                for pattern in patterns:
                    if pattern.lower() in col_lower or col_lower == pattern.lower():
                        z_cols[z] = col
                        break
                if z in z_cols:
                    break
        
        print(f"   Colunas z-score encontradas: {z_cols}")
        
        if len(z_cols) < 5:
            print(f"⚠️  Apenas {len(z_cols)}/7 colunas z-score encontradas")
            print(f"   Tentando padrão alternativo...")
            # Tentar padrão numérico (colunas podem ser apenas números)
            numeric_cols = [col for col in df.columns if col != age_col and str(df[col].dtype) in ['float64', 'int64', 'float', 'int']]
            if len(numeric_cols) >= 7:
                # Assumir ordem: -3, -2, -1, 0, +1, +2, +3
                for i, z in enumerate([-3, -2, -1, 0, 1, 2, 3]):
                    if i < len(numeric_cols):
                        z_cols[z] = numeric_cols[i]
        
        if len(z_cols) < 5:
            print(f"❌ Não foi possível identificar colunas z-score suficientes")
            return False
        
        data = []
        for _, row in df.iterrows():
            try:
                age_value = row[age_col]
                
                # Converter para float
                if isinstance(age_value, str):
                    age_value = age_value.replace(',', '.').strip()
                
                age_days = float(age_value)
                age_weeks = age_days / 7.0
                
                # Filtrar até 64 semanas (448 dias) ou até onde os dados vão
                if age_weeks > 64:
                    continue
                
                weeks = int(age_weeks)
                days = int(age_days % 7)
                
                entry = {
                    'weeks': weeks,
                    'days': days,
                }
                
                # Adicionar z-scores
                for z in [-3, -2, -1, 0, 1, 2, 3]:
                    if z in z_cols:
                        try:
                            value = row[z_cols[z]]
                            if pd.isna(value):
                                continue
                            if isinstance(value, str):
                                value = value.replace(',', '.').strip()
                            value = float(value)
                            if value > 0 and not np.isnan(value) and not np.isinf(value):
                                entry[f'z_{z}'] = round(value, 2)
                        except (ValueError, KeyError, TypeError):
                            pass
                
                # Apenas adicionar se tiver pelo menos alguns z-scores
                z_count = len([k for k in entry.keys() if k.startswith('z_')])
                if z_count >= 5:
                    data.append(entry)
                    
            except (ValueError, KeyError, TypeError) as e:
                continue
        
        if len(data) == 0:
            print(f"❌ Nenhum dado válido encontrado")
            return False
        
        # Ordenar por semanas e dias
        data.sort(key=lambda x: (x['weeks'], x['days']))
        
        # Salvar JSON
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        semanas_unicas = set(d['weeks'] for d in data)
        print(f"✅ Convertido: {len(data)} pontos de dados")
        print(f"   Semanas: {min(semanas_unicas)} - {max(semanas_unicas)}")
        print(f"   Semanas únicas: {len(semanas_unicas)}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao converter {csv_path}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    script_dir = Path(__file__).parent
    base_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "OMS"
    
    for sexo in ['m', 'f']:
        csv_path = base_path / f"peso_{sexo}.csv"
        json_path = base_path / f"peso_{sexo}.json"
        
        if csv_path.exists():
            convert_oms_peso_csv_to_json(csv_path, json_path, sexo)
        else:
            print(f"⚠️  Arquivo {csv_path} não encontrado")

if __name__ == '__main__':
    main()


