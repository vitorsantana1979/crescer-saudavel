#!/usr/bin/env python3
"""
Script para consolidar e verificar todos os arquivos JSON gerados dos PDFs INTERGROWTH
"""

import json
import os
from pathlib import Path

def analyze_json_file(file_path):
    """Analisa um arquivo JSON e retorna estatísticas"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            return {"status": "vazio", "count": 0}
        
        # Verifica se é uma lista de objetos com as propriedades esperadas
        if isinstance(data, list) and len(data) > 0:
            first_item = data[0]
            if all(key in first_item for key in ['idadeSemanas', 'z', 'valor']):
                # Encontra faixa de idades
                ages = [item['idadeSemanas'] for item in data]
                min_age = min(ages)
                max_age = max(ages)
                
                # Encontra faixa de Z-scores
                z_scores = [item['z'] for item in data]
                min_z = min(z_scores)
                max_z = max(z_scores)
                
                return {
                    "status": "válido",
                    "count": len(data),
                    "age_range": f"{min_age:.1f} - {max_age:.1f} semanas",
                    "z_range": f"{min_z} a {max_z}",
                    "unique_ages": len(set(ages)),
                    "unique_z_scores": len(set(z_scores))
                }
        
        return {"status": "formato_inválido", "count": len(data)}
        
    except Exception as e:
        return {"status": "erro", "error": str(e)}

def main():
    """Função principal"""
    print("🔍 Análise dos arquivos JSON gerados dos PDFs INTERGROWTH\n")
    
    intergrowth_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    
    if not intergrowth_dir.exists():
        print("❌ Diretório INTERGROWTH não encontrado")
        return
    
    # Arquivos gerados dos PDFs
    pdf_generated_files = [
        "peso_m_intergrowth.json",
        "peso_f_intergrowth.json", 
        "peso_pretermo_m_intergrowth.json",
        "peso_pretermo_f_intergrowth.json"
    ]
    
    print("📊 Arquivos gerados dos PDFs:")
    print("=" * 60)
    
    total_points = 0
    
    for filename in pdf_generated_files:
        file_path = intergrowth_dir / filename
        
        if file_path.exists():
            analysis = analyze_json_file(file_path)
            
            print(f"\n📄 {filename}")
            print(f"   Status: {analysis['status']}")
            
            if analysis['status'] == 'válido':
                print(f"   Pontos de dados: {analysis['count']}")
                print(f"   Faixa de idade: {analysis['age_range']}")
                print(f"   Faixa de Z-scores: {analysis['z_range']}")
                print(f"   Idades únicas: {analysis['unique_ages']}")
                print(f"   Z-scores únicos: {analysis['unique_z_scores']}")
                total_points += analysis['count']
            elif analysis['status'] == 'erro':
                print(f"   Erro: {analysis['error']}")
        else:
            print(f"\n📄 {filename}")
            print("   Status: arquivo não encontrado")
    
    print(f"\n🎉 Total de pontos de dados extraídos: {total_points}")
    
    # Compara com arquivos existentes
    print(f"\n📋 Comparação com arquivos existentes:")
    print("=" * 60)
    
    existing_files = [
        "peso_m.json",
        "peso_f.json",
        "peso_pretermo_m.json", 
        "peso_pretermo_f.json"
    ]
    
    for filename in existing_files:
        file_path = intergrowth_dir / filename
        
        if file_path.exists():
            analysis = analyze_json_file(file_path)
            print(f"\n📄 {filename} (existente)")
            print(f"   Status: {analysis['status']}")
            if analysis['status'] == 'válido':
                print(f"   Pontos de dados: {analysis['count']}")
                print(f"   Faixa de idade: {analysis['age_range']}")
        else:
            print(f"\n📄 {filename} (existente)")
            print("   Status: arquivo não encontrado")

if __name__ == "__main__":
    main()









