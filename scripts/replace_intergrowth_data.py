#!/usr/bin/env python3
"""
Script para substituir os arquivos JSON existentes pelos dados extraídos dos PDFs INTERGROWTH
"""

import json
import shutil
from pathlib import Path

def backup_existing_files():
    """Cria backup dos arquivos existentes"""
    intergrowth_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    backup_dir = intergrowth_dir / "backup"
    
    backup_dir.mkdir(exist_ok=True)
    
    files_to_backup = [
        "peso_m.json",
        "peso_f.json", 
        "peso_pretermo_m.json",
        "peso_pretermo_f.json"
    ]
    
    backed_up = []
    
    for filename in files_to_backup:
        original_path = intergrowth_dir / filename
        backup_path = backup_dir / filename
        
        if original_path.exists():
            shutil.copy2(original_path, backup_path)
            backed_up.append(filename)
            print(f"✅ Backup criado: {filename}")
        else:
            print(f"⚠️  Arquivo não encontrado para backup: {filename}")
    
    return backed_up

def replace_with_pdf_data():
    """Substitui os arquivos existentes pelos dados dos PDFs"""
    intergrowth_dir = Path("../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH")
    
    replacements = [
        ("peso_m_intergrowth.json", "peso_m.json"),
        ("peso_f_intergrowth.json", "peso_f.json"),
        ("peso_pretermo_m_intergrowth.json", "peso_pretermo_m.json"),
        ("peso_pretermo_f_intergrowth.json", "peso_pretermo_f.json")
    ]
    
    replaced = []
    
    for source_file, target_file in replacements:
        source_path = intergrowth_dir / source_file
        target_path = intergrowth_dir / target_file
        
        if source_path.exists():
            shutil.copy2(source_path, target_path)
            replaced.append(target_file)
            print(f"✅ Substituído: {target_file}")
        else:
            print(f"❌ Arquivo fonte não encontrado: {source_file}")
    
    return replaced

def main():
    """Função principal"""
    print("🔄 Substituindo arquivos JSON pelos dados extraídos dos PDFs INTERGROWTH\n")
    
    # Cria backup dos arquivos existentes
    print("📦 Criando backup dos arquivos existentes...")
    backed_up = backup_existing_files()
    
    print(f"\n📋 {len(backed_up)} arquivos foram salvos em backup")
    
    # Substitui pelos dados dos PDFs
    print("\n🔄 Substituindo pelos dados dos PDFs...")
    replaced = replace_with_pdf_data()
    
    print(f"\n🎉 {len(replaced)} arquivos foram substituídos com sucesso!")
    
    if replaced:
        print("\n📊 Arquivos atualizados:")
        for filename in replaced:
            print(f"   - {filename}")
    
    print(f"\n💾 Backups salvos em: ../backend/CrescerSaudavel.Api/Data/Referencias/INTERGROWTH/backup/")

if __name__ == "__main__":
    main()









