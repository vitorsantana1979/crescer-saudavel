#!/usr/bin/env python3
"""
Script corrigido para extrair dados dos PDFs INTERGROWTH
Processando corretamente semanas+dias específicos de cada linha
"""

import json
import sys
import os
import re
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("❌ Dependências necessárias não encontradas.")
    print("Instale com: pip install pdfplumber")
    sys.exit(1)

def extract_data_from_text_corrected(text):
    """Extrai dados das linhas de texto do PDF com semanas+dias específicos"""
    data = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Procura por padrão: idade+semanas seguido de valores Z-score
        # Exemplo: "24+0 0.36 0.43 0.53 0.64 0.77 0.94 1.14"
        pattern = r'^(\d+)\+(\d+)\s+([\d\.\s]+)$'
        match = re.match(pattern, line)
        
        if match:
            weeks = int(match.group(1))
            days = int(match.group(2))
            
            # Extrai os valores Z-score
            values_str = match.group(3)
            values = [float(v) for v in values_str.split() if v]
            
            # Associa cada valor ao seu Z-score correspondente
            z_scores = [-3, -2, -1, 0, 1, 2, 3]
            
            for i, value in enumerate(values):
                if i < len(z_scores):
                    data.append({
                        "idadeSemanas": weeks,
                        "idadeDias": days,
                        "z": z_scores[i],
                        "valor": value
                    })
    
    return data

def process_intergrowth_pdf_corrected(pdf_path, output_path):
    """Processa PDF INTERGROWTH extraindo dados do texto com semanas+dias corretos"""
    print(f"🔄 Processando: {os.path.basename(pdf_path)}")
    
    all_data = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"📄 Processando página {page_num + 1}...")
            
            # Extrai texto da página
            text = page.extract_text()
            if text:
                page_data = extract_data_from_text_corrected(text)
                all_data.extend(page_data)
                print(f"  ✅ {len(page_data)} pontos extraídos da página {page_num + 1}")
    
    if not all_data:
        print(f"❌ Nenhum dado válido extraído de {pdf_path}")
        return False
    
    # Remove duplicatas baseado em idadeSemanas, idadeDias e z
    unique_data = []
    seen = set()
    
    for item in all_data:
        key = (item['idadeSemanas'], item['idadeDias'], item['z'])
        if key not in seen:
            seen.add(key)
            unique_data.append(item)
    
    # Ordena por idade (semanas, dias) e Z-score
    unique_data.sort(key=lambda x: (x['idadeSemanas'], x['idadeDias'], x['z']))
    
    # Salva o JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Salvo: {os.path.basename(output_path)} ({len(unique_data)} pontos)")
    return True

def main():
    """Função principal"""
    if len(sys.argv) < 2:
        print("Uso: python pdf_text_to_json_corrected.py <diretório_dos_pdfs>")
        print("Exemplo: python pdf_text_to_json_corrected.py ../docs/")
        sys.exit(1)
    
    docs_dir = Path(sys.argv[1])
    
    if not docs_dir.exists():
        print(f"❌ Diretório não encontrado: {docs_dir}")
        sys.exit(1)
    
    # Mapeia os PDFs para seus arquivos JSON de saída
    pdf_mappings = {
        "INTERGROWTH-21st_Weight_Z_Scores_Boys.pdf": "peso_m_corrected.json",
        "INTERGROWTH-21st_Weight_Z_Scores_Girls.pdf": "peso_f_corrected.json", 
        "InterGrowth.Prematuros.Meninos.pdf": "peso_pretermo_m_corrected.json",
        "InterGrowth.Prematuros.Meninas.pdf": "peso_pretermo_f_corrected.json"
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
        
        if process_intergrowth_pdf_corrected(pdf_path, output_path):
            success_count += 1
    
    print(f"\n🎉 Processamento concluído! {success_count}/{len(pdf_mappings)} arquivos processados com sucesso.")

if __name__ == "__main__":
    main()














