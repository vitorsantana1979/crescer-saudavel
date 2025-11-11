#!/usr/bin/env python3
"""
Script para gerar dados completos de pré-termo de 27 a 64 semanas
Interpola/extrapola dos dados existentes ou usa dados padrão ajustados
"""

import json
import numpy as np
from pathlib import Path

def gerar_pretermo_completo():
    """Gera dados completos de pré-termo de 27 a 64 semanas"""
    
    # Dados pré-termo conhecidos (de 27 a 32 semanas)
    # CORRIGIDO: z-3 na semana 27 deve começar entre 0,3-0,4kg (não 0,53kg)
    # Ajustando apenas semana 27, mantendo semanas 28-32 originais (conforme imagem)
    # Calcular proporções da semana 28 e aplicar à semana 27 com z-3 = 0.35kg
    semana_28_original = {"z-3": 0.60, "z-2": 0.73, "z-1": 0.88, "z0": 1.07, "z+1": 1.30, "z+2": 1.58, "z+3": 1.92}
    # Proporções relativas ao z-3 na semana 28
    proporcoes_28 = {
        k: v / semana_28_original["z-3"] for k, v in semana_28_original.items()
    }
    # Aplicar proporções à semana 27 com z-3 = 0.35kg
    z3_semana_27 = 0.35
    dados_previos = [
        {
            "week": 27,
            "z-3": z3_semana_27,
            "z-2": round(z3_semana_27 * proporcoes_28["z-2"], 2),
            "z-1": round(z3_semana_27 * proporcoes_28["z-1"], 2),
            "z0": round(z3_semana_27 * proporcoes_28["z0"], 2),
            "z+1": round(z3_semana_27 * proporcoes_28["z+1"], 2),
            "z+2": round(z3_semana_27 * proporcoes_28["z+2"], 2),
            "z+3": round(z3_semana_27 * proporcoes_28["z+3"], 2),
        },
        {"week": 28, "z-3": 0.60, "z-2": 0.73, "z-1": 0.88, "z0": 1.07, "z+1": 1.30, "z+2": 1.58, "z+3": 1.92},
        {"week": 29, "z-3": 0.68, "z-2": 0.83, "z-1": 1.00, "z0": 1.21, "z+1": 1.47, "z+2": 1.79, "z+3": 2.17},
        {"week": 30, "z-3": 0.77, "z-2": 0.93, "z-1": 1.13, "z0": 1.37, "z+1": 1.66, "z+2": 2.02, "z+3": 2.45},
        {"week": 31, "z-3": 0.87, "z-2": 1.05, "z-1": 1.28, "z0": 1.55, "z+1": 1.88, "z+2": 2.28, "z+3": 2.76},
        {"week": 32, "z-3": 0.98, "z-2": 1.18, "z-1": 1.44, "z0": 1.74, "z+1": 2.11, "z+2": 2.56, "z+3": 3.11},
    ]
    
    # Carregar dados padrão para usar como base de 33-64 semanas
    script_dir = Path(__file__).parent
    padrao_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH" / "peso_padrao_m.json"
    
    dados_padrao = {}
    semana_33_padrao = None
    if padrao_path.exists():
        with open(padrao_path) as f:
            padrao = json.load(f)
            for item in padrao:
                if item.get('days') == 0:
                    semana = item['weeks']
                    if 33 <= semana <= 64:
                        dados_padrao[semana] = item
                    if semana == 33:
                        semana_33_padrao = item
    
    # Calcular proporção de ajuste entre semana 32 pré-termo e semana 33 padrão
    semana_32_pretermo = dados_previos[-1]
    semana_32_z0 = semana_32_pretermo["z0"]
    
    # Gerar dados completos de 27 a 64 semanas
    resultado = []
    
    # 1. Adicionar dados pré-termo conhecidos (27-32) com todos os dias
    for semana_idx, semana_dados in enumerate(dados_previos):
        semana = semana_dados["week"]
        for day in range(7):
            if day == 0:
                # Início da semana: usar valores exatos
                entry = {
                    "weeks": semana,
                    "days": day,
                    "z_-3": round(semana_dados["z-3"], 2),
                    "z_-2": round(semana_dados["z-2"], 2),
                    "z_-1": round(semana_dados["z-1"], 2),
                    "z_0": round(semana_dados["z0"], 2),
                    "z_1": round(semana_dados["z+1"], 2),
                    "z_2": round(semana_dados["z+2"], 2),
                    "z_3": round(semana_dados["z+3"], 2),
                }
            else:
                # Dias intermediários: interpolar com próxima semana
                if semana_idx < len(dados_previos) - 1:
                    next_semana = dados_previos[semana_idx + 1]
                    progress = day / 7.0
                    entry = {
                        "weeks": semana,
                        "days": day,
                        "z_-3": round(semana_dados["z-3"] + (next_semana["z-3"] - semana_dados["z-3"]) * progress, 2),
                        "z_-2": round(semana_dados["z-2"] + (next_semana["z-2"] - semana_dados["z-2"]) * progress, 2),
                        "z_-1": round(semana_dados["z-1"] + (next_semana["z-1"] - semana_dados["z-1"]) * progress, 2),
                        "z_0": round(semana_dados["z0"] + (next_semana["z0"] - semana_dados["z0"]) * progress, 2),
                        "z_1": round(semana_dados["z+1"] + (next_semana["z+1"] - semana_dados["z+1"]) * progress, 2),
                        "z_2": round(semana_dados["z+2"] + (next_semana["z+2"] - semana_dados["z+2"]) * progress, 2),
                        "z_3": round(semana_dados["z+3"] + (next_semana["z+3"] - semana_dados["z+3"]) * progress, 2),
                    }
                else:
                    # Última semana conhecida: usar mesmo valor
                    entry = {
                        "weeks": semana,
                        "days": day,
                        "z_-3": round(semana_dados["z-3"], 2),
                        "z_-2": round(semana_dados["z-2"], 2),
                        "z_-1": round(semana_dados["z-1"], 2),
                        "z_0": round(semana_dados["z0"], 2),
                        "z_1": round(semana_dados["z+1"], 2),
                        "z_2": round(semana_dados["z+2"], 2),
                        "z_3": round(semana_dados["z+3"], 2),
                    }
            resultado.append(entry)
    
    # 2. Gerar dados de 33-64 semanas usando APENAS a taxa de crescimento observada
    # NÃO usar dados de bebês a termo - apenas extrapolar a partir dos dados pré-termo conhecidos
    
    # Calcular taxa de crescimento semanal média de 27-32
    semana_27 = dados_previos[0]
    semana_32 = dados_previos[-1]
    
    # Taxa de crescimento semanal (exponencial)
    num_semanas = len(dados_previos) - 1
    taxa_crescimento_z0 = (semana_32["z0"] / semana_27["z0"]) ** (1.0 / num_semanas)
    taxa_crescimento_z3 = (semana_32["z-3"] / semana_27["z-3"]) ** (1.0 / num_semanas)
    taxa_crescimento_zP3 = (semana_32["z+3"] / semana_27["z+3"]) ** (1.0 / num_semanas)
    
    # Calcular proporções relativas na semana 32 (manter essas proporções)
    proporcao_z_n3 = semana_32["z-3"] / semana_32["z0"]
    proporcao_z_n2 = semana_32["z-2"] / semana_32["z0"]
    proporcao_z_n1 = semana_32["z-1"] / semana_32["z0"]
    proporcao_z_p1 = semana_32["z+1"] / semana_32["z0"]
    proporcao_z_p2 = semana_32["z+2"] / semana_32["z0"]
    proporcao_z_p3 = semana_32["z+3"] / semana_32["z0"]
    
    print(f"📈 Taxa de crescimento pré-termo (27-32):")
    print(f"   z0: {taxa_crescimento_z0:.4f} por semana")
    print(f"   z-3: {taxa_crescimento_z3:.4f} por semana")
    print(f"   z+3: {taxa_crescimento_zP3:.4f} por semana")
    
    # Estender de 33 a 64 semanas usando crescimento LINEAR mais conservador
    # A taxa exponencial de 27-32 é muito alta para manter por 32 semanas
    # Usar crescimento linear mais suave baseado na diferença média semanal de 27-32
    
    # Calcular incremento médio semanal (linear) de 27-32
    incremento_z0 = (semana_32["z0"] - semana_27["z0"]) / num_semanas
    incremento_z3 = (semana_32["z-3"] - semana_27["z-3"]) / num_semanas
    incremento_zP3 = (semana_32["z+3"] - semana_27["z+3"]) / num_semanas
    
    print(f"📈 Incremento médio semanal (linear, 27-32):")
    print(f"   z0: {incremento_z0:.4f}kg/semana")
    print(f"   z-3: {incremento_z3:.4f}kg/semana")
    print(f"   z+3: {incremento_zP3:.4f}kg/semana")
    
    # Reduzir incremento gradualmente após semana 40 (crescimento mais lento)
    z0_atual = semana_32["z0"]
    z3_atual = semana_32["z-3"]
    zP3_atual = semana_32["z+3"]
    
    for semana in range(33, 65):
        semanas_desde_32 = semana - 32
        
        # Reduzir incremento gradualmente após semana 40
        if semana <= 40:
            fator_incremento = 1.0  # Incremento completo até semana 40
        else:
            # Reduzir incremento após semana 40 (crescimento mais lento)
            progresso = (semana - 40) / (64 - 40)  # 0.0 a 1.0
            fator_incremento = 1.0 - (progresso * 0.5)  # Reduzir até 50% do incremento original
        
        # Aplicar incremento linear ajustado
        z0_atual = z0_atual + (incremento_z0 * fator_incremento)
        z3_atual = z3_atual + (incremento_z3 * fator_incremento)
        zP3_atual = zP3_atual + (incremento_zP3 * fator_incremento)
        
        # Garantir que z-3 não seja maior que z0
        if z3_atual >= z0_atual:
            z3_atual = z0_atual * 0.95
        
        # Manter proporções relativas (mas ajustar se necessário)
        z0_final = z0_atual
        entry = {
            "weeks": semana,
            "days": 0,
            "z_-3": round(z0_final * proporcao_z_n3, 2),
            "z_-2": round(z0_final * proporcao_z_n2, 2),
            "z_-1": round(z0_final * proporcao_z_n1, 2),
            "z_0": round(z0_final, 2),
            "z_1": round(z0_final * proporcao_z_p1, 2),
            "z_2": round(z0_final * proporcao_z_p2, 2),
            "z_3": round(z0_final * proporcao_z_p3, 2),
        }
        resultado.append(entry)
    
    return resultado

def main():
    script_dir = Path(__file__).parent
    output_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH" / "peso_pretermo_m.json"
    
    print("🔄 Gerando dados completos de pré-termo (27-64 semanas)...")
    dados = gerar_pretermo_completo()
    
    # Criar backup
    if output_path.exists():
        backup_path = output_path.with_suffix('.json.backup')
        import shutil
        shutil.copy2(output_path, backup_path)
        print(f"📦 Backup criado: {backup_path}")
    
    # Salvar
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dados, f, indent=2, ensure_ascii=False)
    
    semanas_unicas = sorted(set([d['weeks'] for d in dados if d.get('days') == 0]))
    print(f"✅ Dados gerados: {len(dados)} pontos")
    print(f"📈 Semanas: {min(semanas_unicas)} a {max(semanas_unicas)} ({len(semanas_unicas)} semanas)")
    
    # Verificar continuidade
    semana_32 = [d for d in dados if d['weeks'] == 32 and d.get('days') == 0][0]
    semana_33 = [d for d in dados if d['weeks'] == 33 and d.get('days') == 0][0]
    print(f"\n🔍 Verificação de continuidade:")
    print(f"   Semana 32: z0={semana_32['z_0']:.2f}kg")
    print(f"   Semana 33: z0={semana_33['z_0']:.2f}kg")
    print(f"   Diferença: {semana_33['z_0'] - semana_32['z_0']:.2f}kg")

if __name__ == '__main__':
    main()
