#!/usr/bin/env python3
"""
Script melhorado para extrair dados de tabelas dos PDFs INTERGROWTH
Inclui debug para entender a estrutura das tabelas
"""

import json
import sys
import os
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("❌ Dependências necessárias não encontradas.")
    print("Instale com: pip install pdfplumber")
    sys.exit(1)

def debug_table_structure(pdf_path):
    """Debug da estrutura das tabelas no PDF"""
    print(f"\n🔍 Analisando estrutura de: {os.path.basename(pdf_path)}")
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages[:2]):  # Apenas primeiras 2 páginas
            print(f"\n📄 Página {page_num + 1}:")
            
            # Extrai texto da página
            text = page.extract_text()
            if text:
                lines = text.split('\n')[:20]  # Primeiras 20 linhas
                print("Primeiras linhas de texto:")
                for i, line in enumerate(lines):
                    if line.strip():
                        print(f"  {i+1:2d}: {line}")
            
            # Extrai tabelas
            tables = page.extract_tables()
            print(f"\nTabelas encontradas: {len(tables)}")
            
            for i, table in enumerate(tables):
                if table:
                    print(f"\nTabela {i+1}:")
                    print(f"  Linhas: {len(table)}")
                    print(f"  Colunas: {len(table[0]) if table else 0}")
                    
                    # Mostra primeiras linhas da tabela
                    for j, row in enumerate(table[:5]):
                        if row:
                            print(f"  Linha {j+1}: {row}")

def extract_tables_improved(pdf_path):
    """Versão melhorada para extrair tabelas"""
    tables = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"📄 Processando página {page_num + 1}...")
            
            # Extrai tabelas da página
            page_tables = page.extract_tables()
            
            for table in page_tables:
                if table and len(table) > 1:
                    tables.append({
                        'page': page_num + 1,
                        'data': table
                    })
    
    return tables

def clean_table_data_improved(table_data):
    """Versão melhorada para limpar dados da tabela"""
    if not table_data or len(table_data) < 2:
        return []
    
    print(f"  🔧 Processando tabela com {len(table_data)} linhas")
    
    # Encontra a linha de cabeçalho
    header_row = None
    data_start_row = 0
    
    for i, row in enumerate(table_data):
        if not row or len(row) < 2:
            continue
            
        # Procura por linha que contenha números de idade/semanas
        first_col = str(row[0]).strip().lower()
        if any(keyword in first_col for keyword in ['age', 'weeks', 'idade', 'semanas', 'gestational']):
            header_row = row
            data_start_row = i + 1
            break
        elif first_col.replace('.', '').isdigit():
            # Se a primeira linha já contém números, não há cabeçalho separado
            data_start_row = i
            break
    
    if header_row:
        print(f"  📋 Cabeçalho encontrado: {header_row}")
    
    cleaned_data = []
    
    # Processa as linhas de dados
    for row_idx in range(data_start_row, len(table_data)):
        row = table_data[row_idx]
        if not row or len(row) < 2:
            continue
            
        try:
            # Primeira coluna deve conter a idade/semanas
            age_str = str(row[0]).strip()
            if not age_str or not age_str.replace('.', '').isdigit():
                continue
                
            age = float(age_str)
            
            # Processa as colunas de valores Z-score
            for col_idx in range(1, min(len(row), 8)):  # Máximo 7 colunas de Z-score
                value_str = str(row[col_idx]).strip()
                if not value_str or value_str == '':
                    continue
                    
                try:
                    value = float(value_str)
                    
                    # Determina o Z-score baseado na posição da coluna
                    z_score = col_idx - 4  # -3, -2, -1, 0, 1, 2, 3
                    
                    cleaned_data.append({
                        "idadeSemanas": age,
                        "z": z_score,
                        "valor": value
                    })
                    
                except ValueError:
                    continue
                    
        except ValueError:
            continue
    
    print(f"  ✅ {len(cleaned_data)} pontos extraídos")
    return cleaned_data

def process_intergrowth_pdf_improved(pdf_path, output_path, debug=False):
    """Versão melhorada para processar PDF INTERGROWTH"""
    print(f"\n🔄 Processando: {os.path.basename(pdf_path)}")
    
    if debug:
        debug_table_structure(pdf_path)
        return False
    
    # Extrai tabelas do PDF
    tables = extract_tables_improved(pdf_path)
    
    if not tables:
        print(f"❌ Nenhuma tabela encontrada em {pdf_path}")
        return False
    
    all_data = []
    
    for table_info in tables:
        print(f"  📊 Processando tabela da página {table_info['page']}")
        cleaned_data = clean_table_data_improved(table_info['data'])
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
        print("Uso: python pdf_to_json_improved.py <diretório_dos_pdfs> [--debug]")
        print("Exemplo: python pdf_to_json_improved.py ../docs/ --debug")
        sys.exit(1)
    
    docs_dir = Path(sys.argv[1])
    debug_mode = "--debug" in sys.argv
    
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
        
        if process_intergrowth_pdf_improved(pdf_path, output_path, debug_mode):
            success_count += 1
    
    print(f"\n🎉 Processamento concluído! {success_count}/{len(pdf_mappings)} arquivos processados com sucesso.")

if __name__ == "__main__":
    main()














