#!/usr/bin/env python3
"""
Script para corrigir a estrutura dos arquivos JSON INTERGROWTH
Separando idadeSemanas em idadeSemanas e idadeDias
"""

import json
import shutil
from pathlib import Path

def convert_age_structure(data):
    """Converte a estrutura de idade de semanas decimais para semanas + dias"""
    converted_data = []
    
    for item in data:
        # Converte idadeSemanas (decimal) para semanas e dias
        age_weeks_decimal = item['idadeSemanas']
        
        # Separa semanas inteiras e dias
        weeks = int(age_weeks_decimal)
        days = int((age_weeks_decimal - weeks) * 7)
        
        # Garante que os dias estejam no range 0-6
        if days >= 7:
            weeks += 1
            days = 0
        
        converted_item = {
            "idadeSemanas": weeks,
            "idadeDias": days,
            "z": item['z'],
            "valor": item['valor']
        }
        
        converted_data.append(converted_item)
    
    return converted_data

def process_json_file(file_path):
    """Processa um arquivo JSON e converte a estrutura de idade"""
    print(f"🔄 Processando: {file_path.name}")
    
    try:
        # Lê o arquivo JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            print(f"⚠️  Arquivo vazio: {file_path.name}")
            return False
        
        # Converte a estrutura
        converted_data = convert_age_structure(data)
        
        # Cria backup
        backup_path = file_path.with_suffix('.json.backup')
        shutil.copy2(file_path, backup_path)
        print(f"📦 Backup criado: {backup_path.name}")
        
        # Salva o arquivo convertido
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(converted_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Convertido: {len(converted_data)} pontos de dados")
        print(f"   Estrutura: idadeSemanas, idadeDias, z, valor")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao processar {file_path.name}: {e}")
        return False

def analyze_converted_file(file_path):
    """Analisa um arquivo convertido"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            return
        
        # Analisa a estrutura
        first_item = data[0]
        print(f"\n📊 Análise de {file_path.name}:")
        print(f"   Campos: {list(first_item.keys())}")
        
        # Encontra faixas de idade
        weeks = [item['idadeSemanas'] for item in data]
        days = [item['idadeDias'] for item in data]
        
        print(f"   Semanas: {min(weeks)} - {max(weeks)}")
        print(f"   Dias: {min(days)} - {max(days)}")
        print(f"   Total de pontos: {len(data)}")
        
        # Mostra alguns exemplos
        print(f"   Exemplos:")
        for i, item in enumerate(data[:3]):
            print(f"     {i+1}: {item['idadeSemanas']}+{item['idadeDias']} semanas, Z={item['z']}, valor={item['valor']}")
        
    except Exception as e:
        print(f"❌ Erro ao analisar {file_path.name}: {e}")

def main():
    """Função principal"""
    print("🔄 Convertendo estrutura dos arquivos JSON INTERGROWTH")
    print("📋 Separando idadeSemanas em idadeSemanas + idadeDias\n")
    
    intergrowth_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    
    if not intergrowth_dir.exists():
        print("❌ Diretório INTERGROWTH não encontrado")
        return
    
    # Arquivos para converter
    files_to_convert = [
        "peso_m.json",
        "peso_f.json",
        "peso_pretermo_m.json",
        "peso_pretermo_f.json"
    ]
    
    success_count = 0
    
    for filename in files_to_convert:
        file_path = intergrowth_dir / filename
        
        if file_path.exists():
            if process_json_file(file_path):
                success_count += 1
                analyze_converted_file(file_path)
        else:
            print(f"⚠️  Arquivo não encontrado: {filename}")
    
    print(f"\n🎉 Conversão concluída! {success_count}/{len(files_to_convert)} arquivos processados com sucesso.")
    
    if success_count > 0:
        print(f"\n📁 Backups salvos com extensão .backup")
        print(f"📋 Nova estrutura: idadeSemanas (int), idadeDias (int), z (int), valor (float)")

if __name__ == "__main__":
    main()














