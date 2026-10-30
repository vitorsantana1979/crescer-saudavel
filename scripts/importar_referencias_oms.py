#!/usr/bin/env python3
"""
Importa as tabelas expandidas da OMS para o formato LMS usado pelo backend
(`Data/Referencias/OMS/`):

- por idade, dia a dia (0-1856): `{peso,estatura,perimetro,imc}_{f,m}.json`  →  [{"dia","l","m","s"}]
- peso para comprimento (45-110 cm) e peso para estatura (65-120 cm), a cada 0,1 cm:
  `peso_comprimento_{f,m}.json` e `peso_altura_{f,m}.json`  →  [{"cm","l","m","s"}]

Uso (cada argumento é opcional; só os informados são gravados):
  python3 -I scripts/importar_referencias_oms.py \
      --peso-f "docs/atualizacao 2026-10-26/Pontuações z para meninas_tabelas expandidas - PESO X IDADE.xlsx" \
      --peso-m "docs/atualizacao 2026-10-26/Pontuações z para meninos_tabelas expandidas - PESO X IDADE.xlsx" \
      --estatura-f lhfa-girls.xlsx --estatura-m lhfa-boys.xlsx \
      --perimetro-f hcfa-girls.xlsx --perimetro-m hcfa-boys.xlsx \
      --imc-f bfa-girls-zscore-expanded-tables.xlsx --imc-m bfa-boys-zscore-expanded-tables.xlsx \
      --peso-comprimento-f wfl-girls-zscore-expanded-table.xlsx --peso-comprimento-m wfl-boys-zscore-expanded-table.xlsx \
      --peso-altura-f wfh-girls-zscore-expanded-tables.xlsx --peso-altura-m wfh-boys-zscore-expanded-tables.xlsx

Fonte das planilhas: WHO Child Growth Standards, "Expanded tables for constructing
national health cards" (https://www.who.int/tools/child-growth-standards/standards).
As tabelas INTERGROWTH-21st são geradas por `importar_referencias_intergrowth.py`.
"""
import argparse
import json
import sys
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
REFERENCIAS = REPO / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias"
DIA_MAXIMO = 1856
COLUNAS_SD = ("L", "M", "S", "SD4neg", "SD3neg", "SD2neg", "SD1neg", "SD0", "SD1", "SD2", "SD3", "SD4")
FAIXAS_CM = {"Length": (45.0, 110.0), "Height": (65.0, 120.0)}


def valor_lms(l, m, s, z):
    if abs(l) < 1e-9:
        return m * (2.718281828459045 ** (s * z))
    return m * (1 + l * s * z) ** (1 / l)


def ler_planilha(caminho, primeira_coluna):
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    linhas = list(wb.worksheets[0].iter_rows(values_only=True))
    cabecalho = tuple(str(c).strip() for c in linhas[0][:13])
    if cabecalho != (primeira_coluna, *COLUNAS_SD):
        raise SystemExit(f"{caminho}: cabeçalho inesperado {cabecalho}")
    return [linha for linha in linhas[1:] if linha[0] is not None]


def conferir_lms(caminho, chave, linha, l, m, s):
    # Confere a tabela contra a fórmula LMS (SD2 e SD2neg publicados com 3 casas)
    for z, coluna in ((2, 10), (-2, 6)):
        esperado = float(linha[coluna])
        calculado = valor_lms(l, m, s, z)
        if abs(calculado - esperado) > 0.002:
            raise SystemExit(f"{caminho}: {chave} z={z} LMS={calculado:.4f} tabela={esperado}")


def ler_por_cm(caminho, primeira_coluna):
    inicio, fim = FAIXAS_CM[primeira_coluna]
    pontos = []
    for linha in ler_planilha(caminho, primeira_coluna):
        cm, l, m, s = round(float(linha[0]), 1), float(linha[1]), float(linha[2]), float(linha[3])
        conferir_lms(caminho, f"{cm} cm", linha, l, m, s)
        pontos.append({"cm": cm, "l": l, "m": m, "s": s})
    esperado = [round(inicio + i / 10, 1) for i in range(int(round((fim - inicio) * 10)) + 1)]
    if [p["cm"] for p in pontos] != esperado:
        raise SystemExit(f"{caminho}: comprimentos não contíguos de {inicio} a {fim} cm a cada 0,1")
    return pontos


def ler_expandida(caminho):
    pontos = []
    for linha in ler_planilha(caminho, "Day"):
        dia, l, m, s = int(linha[0]), float(linha[1]), float(linha[2]), float(linha[3])
        conferir_lms(caminho, f"dia {dia}", linha, l, m, s)
        pontos.append({"dia": dia, "l": l, "m": m, "s": s})

    dias = [p["dia"] for p in pontos]
    if dias != list(range(0, DIA_MAXIMO + 1)):
        raise SystemExit(f"{caminho}: dias não contíguos de 0 a {DIA_MAXIMO} (n={len(dias)})")
    return pontos


def escrever_json(caminho, dados):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, separators=(",", ":"))
    print(f"✅ {caminho.relative_to(REPO)} ({len(dados)} pontos)")


POR_IDADE = ("peso", "estatura", "perimetro", "imc")
POR_CM = {"peso-comprimento": ("Length", "peso_comprimento"), "peso-altura": ("Height", "peso_altura")}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for medida in (*POR_IDADE, *POR_CM):
        for sexo in ("f", "m"):
            parser.add_argument(f"--{medida}-{sexo}", help=f"xlsx expandida OMS: {medida} ({sexo})")
    args = parser.parse_args()

    algum = False
    for sexo in ("f", "m"):
        for medida in POR_IDADE:
            caminho = getattr(args, f"{medida}_{sexo}")
            if caminho:
                algum = True
                escrever_json(REFERENCIAS / "OMS" / f"{medida}_{sexo}.json", ler_expandida(caminho))
        for medida, (coluna, arquivo) in POR_CM.items():
            caminho = getattr(args, f"{medida.replace('-', '_')}_{sexo}")
            if caminho:
                algum = True
                escrever_json(REFERENCIAS / "OMS" / f"{arquivo}_{sexo}.json", ler_por_cm(caminho, coluna))

    if not algum:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
