#!/usr/bin/env python3
"""
Script para extrair dados de tabelas dos PDFs INTERGROWTH e convertê-los para JSON
"""

import json
import sys
import os
from pathlib import Path

try:
    import PyPDF2
    import pdfplumber
    import pandas as pd
except ImportError:
    print("❌ Dependências necessárias não encontradas.")
    print("Instale com: pip install PyPDF2 pdfplumber pandas")
    sys.exit(1)

def extract_tables_from_pdf(pdf_path):
    """Extrai tabelas de um PDF usando pdfplumber"""
    tables = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"📄 Processando página {page_num + 1}...")
            
            # Extrai tabelas da página
            page_tables = page.extract_tables()
            
            for table in page_tables:
                if table and len(table) > 1:  # Verifica se a tabela tem dados
                    tables.append({
                        'page': page_num + 1,
                        'data': table
                    })
    
    return tables

def clean_table_data(table_data):
    """Limpa e organiza os dados da tabela"""
    if not table_data or len(table_data) < 2:
        return []
    
    # Primeira linha geralmente contém os cabeçalhos
    headers = table_data[0]
    rows = table_data[1:]
    
    cleaned_data = []
    
    for row in rows:
        if not row or len(row) < 2:
            continue
            
        # Tenta identificar a idade/semanas na primeira coluna
        try:
            age_str = str(row[0]).strip()
            if not age_str or age_str.lower() in ['age', 'weeks', 'idade', 'semanas']:
                continue
                
            # Converte idade para float
            age = float(age_str)
            
            # Processa os valores Z-score (colunas 1-7)
            for i, header in enumerate(headers[1:8], 1):  # Pega até 7 colunas após idade
                if i >= len(row):
                    break
                    
                value_str = str(row[i]).strip()
                if not value_str or value_str == '':
                    continue
                    
                try:
                    value = float(value_str)
                    
                    # Determina o Z-score baseado na posição da coluna
                    z_score = i - 4  # -3, -2, -1, 0, 1, 2, 3
                    
                    cleaned_data.append({
                        "idadeSemanas": age,
                        "z": z_score,
                        "valor": value
                    })
                    
                except ValueError:
                    continue
                    
        except ValueError:
            continue
    
    return cleaned_data

def process_intergrowth_pdf(pdf_path, output_path):
    """Processa um PDF INTERGROWTH específico"""
    print(f"🔄 Processando: {os.path.basename(pdf_path)}")
    
    # Extrai tabelas do PDF
    tables = extract_tables_from_pdf(pdf_path)
    
    if not tables:
        print(f"❌ Nenhuma tabela encontrada em {pdf_path}")
        return False
    
    all_data = []
    
    for table_info in tables:
        print(f"  📊 Processando tabela da página {table_info['page']}")
        cleaned_data = clean_table_data(table_info['data'])
        all_data.extend(cleaned_data)
    
    if not all_data:
        print(f"❌ Nenhum dado válido extraído de {pdf_path}")
        return False
    
    # Remove duplicatas baseado em idadeSemanas e z
    unique_data = []
    seen = set()
    
    for item in all_data:
        key = (item['idadeSemanas'], item['z'])
        if key not in seen:
            seen.add(key)
            unique_data.append(item)
    
    # Ordena por idade e Z-score
    unique_data.sort(key=lambda x: (x['idadeSemanas'], x['z']))
    
    # Salva o JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Salvo: {os.path.basename(output_path)} ({len(unique_data)} pontos)")
    return True

def main():
    """Função principal"""
    if len(sys.argv) < 2:
        print("Uso: python pdf_to_json.py <diretório_dos_pdfs>")
        print("Exemplo: python pdf_to_json.py ../docs/")
        sys.exit(1)
    
    docs_dir = Path(sys.argv[1])
    
    if not docs_dir.exists():
        print(f"❌ Diretório não encontrado: {docs_dir}")
        sys.exit(1)
    
    # Mapeia os PDFs para seus arquivos JSON de saída
    pdf_mappings = {
        "INTERGROWTH-21st_Weight_Z_Scores_Boys.pdf": "peso_m_intergrowth.json",
        "INTERGROWTH-21st_Weight_Z_Scores_Girls.pdf": "peso_f_intergrowth.json", 
        "InterGrowth.Prematuros.Meninos.pdf": "peso_pretermo_m_intergrowth.json",
        "InterGrowth.Prematuros.Meninas.pdf": "peso_pretermo_f_intergrowth.json"
    }
    
    output_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    
    for pdf_name, json_name in pdf_mappings.items():
        pdf_path = docs_dir / pdf_name
        
        if not pdf_path.exists():
            print(f"⚠️  PDF não encontrado: {pdf_name}")
            continue
        
        output_path = output_dir / json_name
        
        if process_intergrowth_pdf(pdf_path, output_path):
            success_count += 1
    
    print(f"\n🎉 Processamento concluído! {success_count}/{len(pdf_mappings)} arquivos processados com sucesso.")

if __name__ == "__main__":
    main()














