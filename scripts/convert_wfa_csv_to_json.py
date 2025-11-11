#!/usr/bin/env python3
"""
Script para converter o CSV wfa-boys-zscore-expanded-tables para JSON
Filtra até 64 semanas (448 dias) conforme especificação
"""

import pandas as pd
import json
from pathlib import Path
import sys
import numpy as np

def calcular_peso_lms(L, M, S, z):
    """Calcula o peso usando o modelo LMS"""
    if abs(L) < 1e-10:  # L ≈ 0
        return M * np.exp(S * z)
    else:
        termo = 1 + L * S * z
        if termo <= 0:
            return None
        return M * np.power(termo, 1.0 / L)

def main():
    script_dir = Path(__file__).parent
    csv_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH" / "wfa-boys-zscore-expanded-tables__WFA_boys_z_exp.csv"
    
    if not csv_path.exists():
        print(f"❌ Arquivo não encontrado: {csv_path}")
        sys.exit(1)
    
    print(f"📊 Carregando CSV: {csv_path}")
    
    # Carregar CSV
    df = pd.read_csv(csv_path)
    
    # Converter idade de dias para semanas
    df['idade_sem'] = df['Day'] / 7.0
    
    # Filtrar até 64 semanas (448 dias)
    df_filtered = df[df['Day'] <= 448].copy()
    
    print(f"✅ Dados carregados: {len(df_filtered)} pontos")
    print(f"   Faixa: {df_filtered['idade_sem'].min():.2f} - {df_filtered['idade_sem'].max():.2f} semanas")
    
    # Gerar JSON no formato esperado pelo backend
    # Usar valores pré-calculados do CSV (colunas SD) que são mais precisos
    # SD4neg = z=-4, SD3neg = z=-3, SD2neg = z=-2, SD1neg = z=-1, SD0 = z=0, SD1 = z=+1, SD2 = z=+2, SD3 = z=+3, SD4 = z=+4
    data = []
    
    for _, row in df_filtered.iterrows():
        # Calcular semanas e dias corretamente
        day = int(row['Day'])
        weeks = day // 7  # Divisão inteira
        days = day % 7    # Resto (0 a 6)
        
        # Usar valores pré-calculados do CSV (mais confiáveis que cálculo LMS)
        # Mapeamento: SD3neg=z-3, SD2neg=z-2, SD1neg=z-1, SD0=z0, SD1=z+1, SD2=z+2, SD3=z+3
        try:
            entry = {
                'weeks': weeks,
                'days': days,
                'z_-3': round(float(row['SD3neg']), 2),
                'z_-2': round(float(row['SD2neg']), 2),
                'z_-1': round(float(row['SD1neg']), 2),
                'z_0': round(float(row['SD0']), 2),
                'z_1': round(float(row['SD1']), 2),
                'z_2': round(float(row['SD2']), 2),
                'z_3': round(float(row['SD3']), 2),
            }
            
            # Validar que todos os valores são válidos (não NaN, não infinito, > 0)
            valid = True
            for key, value in entry.items():
                if key not in ['weeks', 'days']:
                    if pd.isna(value) or np.isinf(value) or value <= 0:
                        valid = False
                        break
            
            if valid:
                data.append(entry)
        except (ValueError, KeyError) as e:
            print(f"⚠️  Erro ao processar linha Day={day}: {e}")
            continue
    
    # Salvar JSON
    output_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH" / "peso_padrao_m.json"
    
    # Criar backup do arquivo original se existir
    if output_path.exists():
        backup_path = output_path.with_suffix('.json.backup')
        import shutil
        shutil.copy2(output_path, backup_path)
        print(f"📦 Backup criado: {backup_path}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 JSON salvo: {output_path}")
    print(f"✅ Total de registros: {len(data)}")
    
    # Estatísticas
    semanas_unicas = set(d['weeks'] for d in data)
    print(f"📈 Semanas únicas: {min(semanas_unicas)} - {max(semanas_unicas)}")
    
    # Verificar dados até 64 semanas
    dados_ate_64 = [d for d in data if d['weeks'] <= 64]
    print(f"✅ Dados até 64 semanas: {len(dados_ate_64)} registros")

if __name__ == '__main__':
    main()

