#!/usr/bin/env python3
"""
Converte o CSV de peso ao nascer do INTERGROWTH-21st para JSON
Dividindo a primeira coluna (semanas+dias) em semanas e dias separados
"""

import json
import re
import sys
from pathlib import Path

def parse_csv_to_json(csv_path, output_path=None):
    """
    Converte o CSV de peso ao nascer para JSON
    
    Args:
        csv_path: Caminho para o arquivo CSV
        output_path: Caminho de saída do JSON (opcional)
    """
    data = []
    z_scores = [-3, -2, -1, 0, 1, 2, 3]
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            
            # Remove aspas externas se existirem
            if line.startswith('"') and line.endswith('"'):
                line_clean = line[1:-1]
            else:
                line_clean = line
            
            # Procura por linhas que começam com formato "XX+Y" (semanas+dias)
            match = re.match(r'^(\d+)\+(\d+)', line_clean)
            if match:
                weeks = int(match.group(1))
                days = int(match.group(2))
                
                # Remove a parte "XX+Y" e divide o restante por espaços múltiplos
                # O formato é: "33+0                0.63    1.13   1.55     1.95     2.39   2.88      3.47"
                remaining = line_clean[match.end():].strip()
                parts = re.split(r'\s+', remaining)
                
                # Extrai os 7 valores de peso (um para cada z-score)
                if len(parts) >= 7:
                    weights = {}
                    valid = True
                    for i, z_score in enumerate(z_scores):
                        try:
                            weight_value = float(parts[i])
                            weights[str(z_score)] = weight_value
                        except (ValueError, IndexError):
                            print(f"Erro ao processar linha: {line}")
                            print(f"  Parts encontrados: {parts}")
                            valid = False
                            break
                    
                    if valid:
                        # Adiciona ao array de dados
                        data.append({
                            "weeks": weeks,
                            "days": days,
                            "weights": weights
                        })
    
    # Estrutura final do JSON
    result = {
        "standard": "INTERGROWTH-21st",
        "type": "Birth weight",
        "gender": "Boys",
        "data": data
    }
    
    # Salva o JSON
    if output_path is None:
        output_path = str(Path(csv_path).with_suffix('.json'))
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Conversão concluída!")
    print(f"📊 Total de registros: {len(data)}")
    print(f"💾 Arquivo salvo em: {output_path}")
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python convert_weight_csv_to_json.py <arquivo_csv> [arquivo_json_saida]")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    json_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    parse_csv_to_json(csv_file, json_file)
