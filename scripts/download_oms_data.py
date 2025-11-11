#!/usr/bin/env python3
"""
Script para baixar dados OMS (WHO) de peso para idade e converter para JSON
Fonte: WHO Child Growth Standards
"""

import pandas as pd
import json
from pathlib import Path
import sys
import requests
from io import StringIO

def download_oms_csv(url, output_path):
    """Baixa CSV da OMS e salva localmente"""
    try:
        print(f"📥 Baixando {url}...")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"✅ Salvo em {output_path}")
        return True
    except Exception as e:
        print(f"❌ Erro ao baixar {url}: {e}")
        return False

def convert_oms_peso_to_json(csv_path, json_path, sexo):
    """
    Converte CSV OMS de peso para JSON no formato esperado
    Formato OMS: Age (days), -3SD, -2SD, -1SD, 0SD, +1SD, +2SD, +3SD
    """
    try:
        df = pd.read_csv(csv_path)
        
        # OMS usa dias, vamos converter para semanas
        # Procurar coluna de idade (pode ser "Age", "Day", "Age (days)", etc)
        age_col = None
        for col in df.columns:
            if 'age' in col.lower() or 'day' in col.lower():
                age_col = col
                break
        
        if age_col is None:
            print(f"❌ Não encontrada coluna de idade em {csv_path}")
            return False
        
        # Procurar colunas de z-scores (podem ter formatos diferentes)
        z_cols = {}
        for z in [-3, -2, -1, 0, 1, 2, 3]:
            # Tentar diferentes formatos
            patterns = [
                f'{z}SD', f'{z} SD', f'Z{z}', f'z{z}',
                f'-3SD' if z == -3 else f'+{z}SD' if z > 0 else f'{z}SD',
                f'SD{z}' if z != 0 else 'SD0',
            ]
            
            for pattern in patterns:
                for col in df.columns:
                    if pattern.lower() in col.lower() or col.strip() == pattern:
                        z_cols[z] = col
                        break
                if z in z_cols:
                    break
        
        if len(z_cols) < 7:
            print(f"⚠️  Apenas {len(z_cols)}/7 colunas z-score encontradas")
            print(f"   Colunas disponíveis: {list(df.columns)}")
        
        data = []
        for _, row in df.iterrows():
            try:
                age_days = float(row[age_col])
                age_weeks = age_days / 7.0
                
                # Filtrar até 64 semanas (448 dias)
                if age_weeks > 64:
                    continue
                
                entry = {
                    'weeks': int(age_weeks),
                    'days': int(age_days % 7),
                }
                
                # Adicionar z-scores
                for z in [-3, -2, -1, 0, 1, 2, 3]:
                    if z in z_cols:
                        try:
                            value = float(row[z_cols[z]])
                            if value > 0:
                                entry[f'z_{z}'] = round(value, 2)
                        except (ValueError, KeyError):
                            pass
                
                # Apenas adicionar se tiver pelo menos alguns z-scores
                if len([k for k in entry.keys() if k.startswith('z_')]) >= 5:
                    data.append(entry)
                    
            except (ValueError, KeyError) as e:
                continue
        
        # Salvar JSON
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Convertido: {len(data)} pontos de dados")
        print(f"   Semanas: {min([d['weeks'] for d in data])} - {max([d['weeks'] for d in data])}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao converter {csv_path}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    script_dir = Path(__file__).parent
    base_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "OMS"
    base_path.mkdir(parents=True, exist_ok=True)
    
    # URLs OMS (WHO) - podem precisar ser atualizadas
    urls = {
        'peso_m': 'https://www.who.int/tools/child-growth-standards/standards/weight-for-age-boys',
        'peso_f': 'https://www.who.int/tools/child-growth-standards/standards/weight-for-age-girls',
    }
    
    # Tentar baixar ou usar arquivos locais se já existirem
    for key, url in urls.items():
        csv_path = base_path / f"{key}.csv"
        json_path = base_path / f"{key}.json"
        
        if not csv_path.exists():
            # Tentar baixar
            if not download_oms_csv(f"{url}.csv", csv_path):
                print(f"⚠️  Não foi possível baixar {key}, usando arquivo local se existir")
                continue
        
        if csv_path.exists():
            sexo = 'm' if 'm' in key else 'f'
            convert_oms_peso_to_json(csv_path, json_path, sexo)
        else:
            print(f"⚠️  Arquivo {csv_path} não encontrado")

if __name__ == '__main__':
    main()


