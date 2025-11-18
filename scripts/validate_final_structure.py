#!/usr/bin/env python3
"""
Script de validação final dos arquivos JSON INTERGROWTH
Verifica se a nova estrutura com idadeSemanas e idadeDias está correta
"""

import json
from pathlib import Path

def validate_json_structure(file_path):
    """Valida a estrutura de um arquivo JSON"""
    print(f"\n🔍 Validando: {file_path.name}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            print("   ❌ Arquivo vazio")
            return False
        
        # Verifica estrutura do primeiro item
        first_item = data[0]
        required_fields = ['idadeSemanas', 'idadeDias', 'z', 'valor']
        
        if not all(field in first_item for field in required_fields):
            print(f"   ❌ Campos obrigatórios ausentes. Encontrados: {list(first_item.keys())}")
            return False
        
        # Valida tipos de dados
        weeks = [item['idadeSemanas'] for item in data]
        days = [item['idadeDias'] for item in data]
        z_scores = [item['z'] for item in data]
        values = [item['valor'] for item in data]
        
        # Verifica se semanas são inteiros
        if not all(isinstance(w, int) for w in weeks):
            print("   ❌ idadeSemanas deve ser inteiro")
            return False
        
        # Verifica se dias são inteiros e estão no range 0-6
        if not all(isinstance(d, int) and 0 <= d <= 6 for d in days):
            print("   ❌ idadeDias deve ser inteiro entre 0 e 6")
            return False
        
        # Verifica se Z-scores são inteiros
        if not all(isinstance(z, int) for z in z_scores):
            print("   ❌ z deve ser inteiro")
            return False
        
        # Verifica se valores são números
        if not all(isinstance(v, (int, float)) for v in values):
            print("   ❌ valor deve ser numérico")
            return False
        
        # Estatísticas
        print(f"   ✅ Estrutura válida")
        print(f"   📊 Pontos de dados: {len(data)}")
        print(f"   📅 Semanas: {min(weeks)} - {max(weeks)}")
        print(f"   📅 Dias: {min(days)} - {max(days)}")
        print(f"   📈 Z-scores: {min(z_scores)} - {max(z_scores)}")
        print(f"   📊 Valores: {min(values):.3f} - {max(values):.3f}")
        
        # Mostra alguns exemplos
        print(f"   📋 Exemplos:")
        for i, item in enumerate(data[:3]):
            print(f"      {i+1}: {item['idadeSemanas']}+{item['idadeDias']} semanas, Z={item['z']}, valor={item['valor']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False

def main():
    """Função principal"""
    print("🔍 Validação Final dos Arquivos JSON INTERGROWTH")
    print("=" * 60)
    
    intergrowth_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    
    if not intergrowth_dir.exists():
        print("❌ Diretório INTERGROWTH não encontrado")
        return
    
    # Arquivos para validar
    files_to_validate = [
        "peso_m.json",
        "peso_f.json",
        "peso_pretermo_m.json",
        "peso_pretermo_f.json"
    ]
    
    valid_count = 0
    total_count = len(files_to_validate)
    
    for filename in files_to_validate:
        file_path = intergrowth_dir / filename
        
        if file_path.exists():
            if validate_json_structure(file_path):
                valid_count += 1
        else:
            print(f"\n⚠️  Arquivo não encontrado: {filename}")
    
    print(f"\n🎉 Validação concluída!")
    print(f"📊 {valid_count}/{total_count} arquivos válidos")
    
    if valid_count == total_count:
        print("✅ Todos os arquivos estão com a estrutura correta!")
        print("📋 Nova estrutura: idadeSemanas (int), idadeDias (int), z (int), valor (float)")
    else:
        print("❌ Alguns arquivos precisam de correção")

if __name__ == "__main__":
    main()














