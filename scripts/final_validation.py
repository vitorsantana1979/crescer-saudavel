#!/usr/bin/env python3
"""
Validação final dos arquivos JSON INTERGROWTH com estrutura correta
Verifica se temos dados para cada semana+dia específico
"""

import json
from pathlib import Path

def validate_final_structure():
    """Valida a estrutura final dos arquivos JSON"""
    print("🔍 Validação Final dos Arquivos JSON INTERGROWTH")
    print("=" * 60)
    
    intergrowth_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    
    files_to_check = [
        "peso_m.json",
        "peso_f.json", 
        "peso_pretermo_m.json",
        "peso_pretermo_f.json"
    ]
    
    for filename in files_to_check:
        file_path = intergrowth_dir / filename
        
        if not file_path.exists():
            print(f"❌ Arquivo não encontrado: {filename}")
            continue
        
        print(f"\n📄 Analisando: {filename}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                print("   ❌ Arquivo vazio")
                continue
            
            # Verifica estrutura
            first_item = data[0]
            required_fields = ['idadeSemanas', 'idadeDias', 'z', 'valor']
            
            if not all(field in first_item for field in required_fields):
                print(f"   ❌ Estrutura inválida")
                continue
            
            # Analisa dados
            weeks = [item['idadeSemanas'] for item in data]
            days = [item['idadeDias'] for item in data]
            z_scores = [item['z'] for item in data]
            
            print(f"   ✅ Estrutura válida")
            print(f"   📊 Total de pontos: {len(data)}")
            print(f"   📅 Semanas: {min(weeks)} - {max(weeks)}")
            print(f"   📅 Dias: {min(days)} - {max(days)}")
            print(f"   📈 Z-scores: {min(z_scores)} - {max(z_scores)}")
            
            # Conta combinações únicas de semana+dia
            unique_combinations = set((item['idadeSemanas'], item['idadeDias']) for item in data)
            print(f"   🔢 Combinações semana+dia: {len(unique_combinations)}")
            
            # Mostra algumas combinações
            sorted_combinations = sorted(unique_combinations)
            print(f"   📋 Primeiras combinações:")
            for i, (week, day) in enumerate(sorted_combinations[:5]):
                count = len([item for item in data if item['idadeSemanas'] == week and item['idadeDias'] == day])
                print(f"      {week}+{day}: {count} registros")
            
            if len(sorted_combinations) > 5:
                print(f"      ... e mais {len(sorted_combinations) - 5} combinações")
            
        except Exception as e:
            print(f"   ❌ Erro: {e}")
    
    print(f"\n🎉 Validação concluída!")

if __name__ == "__main__":
    validate_final_structure()















