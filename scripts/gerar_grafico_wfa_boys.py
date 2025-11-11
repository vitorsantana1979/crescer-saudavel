#!/usr/bin/env python3
"""
Script para gerar gráfico de curvas Z-score para peso (WFA) - Meninos INTERGROWTH
Usa o modelo LMS para calcular as curvas de z = -3, -2, -1, 0, +1, +2, +3
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.ticker import FuncFormatter
from pathlib import Path
import sys

def calcular_peso_lms(L, M, S, z):
    """
    Calcula o peso usando o modelo LMS.
    
    Se L ≠ 0: peso(z) = M * (1 + L*S*z)^(1/L)
    Se L = 0: peso(z) = M * exp(S*z)
    """
    if abs(L) < 1e-10:  # L ≈ 0
        return M * np.exp(S * z)
    else:
        termo = 1 + L * S * z
        if termo <= 0:
            return np.nan  # Evita valores negativos ou zero na raiz
        return M * np.power(termo, 1.0 / L)

def formatar_numero_brasileiro(x, pos):
    """Formata números no padrão brasileiro: 1.234,56 (ponto para milhar, vírgula para decimal)"""
    if abs(x) < 0.001:
        return '0'
    
    # Formatar com 1 casa decimal
    valor = float(x)
    valor_str = f'{valor:.1f}'
    
    # Separar parte inteira e decimal
    if '.' in valor_str:
        parte_inteira, parte_decimal = valor_str.split('.')
    else:
        parte_inteira = valor_str
        parte_decimal = '0'
    
    # Adicionar separador de milhar (ponto) à parte inteira
    parte_inteira_formatada = ''
    for i, digito in enumerate(reversed(parte_inteira)):
        if i > 0 and i % 3 == 0:
            parte_inteira_formatada = '.' + parte_inteira_formatada
        parte_inteira_formatada = digito + parte_inteira_formatada
    
    # Retornar formato brasileiro: parte_inteira,parte_decimal
    return f'{parte_inteira_formatada},{parte_decimal}'

def main():
    # Caminho do arquivo CSV
    script_dir = Path(__file__).parent
    csv_path = script_dir.parent / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH" / "wfa-boys-zscore-expanded-tables__WFA_boys_z_exp.csv"
    
    if not csv_path.exists():
        print(f"❌ Arquivo não encontrado: {csv_path}")
        sys.exit(1)
    
    print(f"📊 Carregando arquivo: {csv_path}")
    
    # Carregar CSV
    df = pd.read_csv(csv_path)
    
    # Converter idade de dias para semanas
    df['idade_sem'] = df['Day'] / 7.0
    
    # Filtrar até 64 semanas (448 dias)
    df_filtered = df[df['Day'] <= 448].copy()
    
    print(f"✅ Dados carregados: {len(df_filtered)} pontos de dados")
    print(f"   Faixa de idade: {df_filtered['idade_sem'].min():.2f} - {df_filtered['idade_sem'].max():.2f} semanas")
    
    # Valores de z-score para plotar
    z_scores = [-3, -2, -1, 0, 1, 2, 3]
    cores = {
        -3: '#DC2626',  # Vermelho escuro
        -2: '#F59E0B',  # Laranja
        -1: '#1F2937',  # Cinza escuro
        0: '#10B981',   # Verde (mediana, mais espessa)
        +1: '#1F2937',  # Cinza escuro
        +2: '#F59E0B',  # Laranja
        +3: '#DC2626',  # Vermelho escuro
    }
    
    # Calcular curvas para cada z-score
    curvas = {}
    for z in z_scores:
        pesos = []
        for _, row in df_filtered.iterrows():
            peso = calcular_peso_lms(row['L'], row['M'], row['S'], z)
            pesos.append(peso)
        curvas[z] = pesos
    
    # Criar figura com alta resolução
    fig, ax = plt.subplots(figsize=(12, 8), dpi=300)
    
    # Adicionar área sombreada entre z=-2 e z=+2
    ax.fill_between(
        df_filtered['idade_sem'],
        curvas[-2],
        curvas[+2],
        alpha=0.15,
        color='#10B981',
        label='Faixa z=-2 a z=+2'
    )
    
    # Plotar curvas
    for z in z_scores:
        espessura = 2.5 if z == 0 else 1.5  # Mediana mais espessa
        ax.plot(
            df_filtered['idade_sem'],
            curvas[z],
            color=cores[z],
            linewidth=espessura,
            label=f'z = {z:+d}',
            linestyle='-'
        )
    
    # Configurar eixos e estilo
    ax.set_xlabel('Idade (semanas)', fontsize=12, fontweight='bold')
    ax.set_ylabel('Peso (kg)', fontsize=12, fontweight='bold')
    ax.set_title('Curvas Z-Score de Peso para Idade (WFA) - Meninos INTERGROWTH', 
                 fontsize=14, fontweight='bold', pad=20)
    
    # Limites e ticks
    ax.set_xlim(0, 64)
    ax.set_xticks(range(0, 65, 4))  # Ticks a cada 4 semanas
    ax.set_xticklabels(range(0, 65, 4), fontsize=10)
    
    # Formatar eixo Y com números brasileiros (vírgula como decimal)
    ax.tick_params(axis='y', labelsize=10)
    ax.yaxis.set_major_formatter(FuncFormatter(formatar_numero_brasileiro))
    
    # Grade leve
    ax.grid(True, linestyle='--', linewidth=0.5, alpha=0.3, color='gray')
    ax.set_axisbelow(True)
    
    # Legenda - formatar conforme especificação: "-3, -2, -1, 0, +1, +2, +3 z"
    handles, labels = ax.get_legend_handles_labels()
    # Remover a faixa sombreada da legenda e manter apenas as curvas
    handles_curvas = []
    labels_curvas = []
    for h, l in zip(handles, labels):
        if l.startswith('z ='):
            handles_curvas.append(h)
            # Formatar label: extrair número do z-score
            z_val = int(l.replace('z = ', '').strip())
            if z_val == 0:
                labels_curvas.append('0')
            else:
                labels_curvas.append(f'{z_val:+d}')
    
    # Criar legenda customizada
    leg = ax.legend(
        handles_curvas,
        labels_curvas,
        loc='upper left',
        fontsize=10,
        frameon=True,
        fancybox=True,
        shadow=True,
        ncol=1,
        title='Z-Scores'
    )
    
    # Ajustar título da legenda
    leg.get_title().set_fontsize(11)
    leg.get_title().set_text('−3, −2, −1, 0, +1, +2, +3 z')
    
    # Ajustar layout
    plt.tight_layout()
    
    # Salvar PNG
    output_dir = script_dir.parent / "docs"
    output_dir.mkdir(exist_ok=True)
    png_path = output_dir / "wfa-boys-zscore-grafico.png"
    svg_path = output_dir / "wfa-boys-zscore-grafico.svg"
    
    print(f"💾 Salvando PNG: {png_path}")
    plt.savefig(png_path, dpi=300, bbox_inches='tight', format='png')
    
    print(f"💾 Salvando SVG: {svg_path}")
    plt.savefig(svg_path, bbox_inches='tight', format='svg')
    
    print("✅ Gráfico gerado com sucesso!")
    
    # (Opcional) Se fornecido idade_sem_aluno e peso_aluno via argumentos
    if len(sys.argv) >= 3:
        try:
            idade_sem_aluno = float(sys.argv[1])
            peso_aluno = float(sys.argv[2])
            
            # Encontrar o z-score calculado (interpolação)
            # Buscar linha mais próxima da idade do aluno
            idx_proximo = (df_filtered['idade_sem'] - idade_sem_aluno).abs().idxmin()
            row_proximo = df_filtered.loc[idx_proximo]
            
            # Calcular z-score inverso
            L = row_proximo['L']
            M = row_proximo['M']
            S = row_proximo['S']
            
            if abs(L) < 1e-10:
                # L ≈ 0
                z_calculado = np.log(peso_aluno / M) / S
            else:
                # L ≠ 0
                termo = (peso_aluno / M) ** L
                z_calculado = (termo - 1) / (L * S)
            
            # Adicionar ponto ao gráfico
            ax.plot(idade_sem_aluno, peso_aluno, 
                   marker='o', markersize=10, 
                   color='#3B82F6', markeredgecolor='#1E40AF',
                   markeredgewidth=2, label=f'Paciente (z={z_calculado:.2f})')
            
            # Atualizar título
            ax.set_title(f'Curvas Z-Score de Peso para Idade (WFA) - Meninos INTERGROWTH\n'
                        f'Paciente: {idade_sem_aluno:.1f} semanas, {peso_aluno:.2f} kg (z={z_calculado:.2f})',
                        fontsize=14, fontweight='bold', pad=20)
            
            # Re-salvar com o ponto
            plt.savefig(png_path, dpi=300, bbox_inches='tight', format='png')
            plt.savefig(svg_path, bbox_inches='tight', format='svg')
            
            print(f"📌 Ponto adicionado: {idade_sem_aluno:.1f} semanas, {peso_aluno:.2f} kg (z={z_calculado:.2f})")
            
        except (ValueError, IndexError) as e:
            print(f"⚠️  Erro ao processar dados do aluno: {e}")
            print("   Uso: python gerar_grafico_wfa_boys.py [idade_semanas] [peso_kg]")
    
    plt.close()

if __name__ == '__main__':
    main()

