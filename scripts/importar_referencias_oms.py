#!/usr/bin/env python3
"""
Importa as tabelas expandidas da OMS (dia a dia, 0-1856 dias) para o formato LMS
usado pelo backend (`Data/Referencias/OMS/{peso,estatura,perimetro}_{f,m}.json`)
e converte a tabela semanal INTERGROWTH-21st (27-64 semanas) para
`Data/Referencias/INTERGROWTH/peso_{f,m}.json`.

Uso:
  python3 -I scripts/importar_referencias_oms.py \
      --peso-f "docs/atualizacao 2026-10-26/Pontuações z para meninas_tabelas expandidas - PESO X IDADE.xlsx" \
      --peso-m "docs/atualizacao 2026-10-26/Pontuações z para meninos_tabelas expandidas - PESO X IDADE.xlsx" \
      --estatura-f lhfa-girls.xlsx --estatura-m lhfa-boys.xlsx \
      --perimetro-f hcfa-girls.xlsx --perimetro-m hcfa-boys.xlsx

Fonte das planilhas: WHO Child Growth Standards, "Expanded tables for constructing
national health cards" (https://www.who.int/tools/child-growth-standards/standards).
"""
import argparse
import json
import sys
from pathlib import Path

import openpyxl

REPO = Path(__file__).resolve().parent.parent
REFERENCIAS = REPO / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias"
DIA_MAXIMO = 1856
COLUNAS_ESPERADAS = ("Day", "L", "M", "S", "SD4neg", "SD3neg", "SD2neg", "SD1neg", "SD0", "SD1", "SD2", "SD3", "SD4")


def valor_lms(l, m, s, z):
    if abs(l) < 1e-9:
        return m * (2.718281828459045 ** (s * z))
    return m * (1 + l * s * z) ** (1 / l)


def ler_expandida(caminho):
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    ws = wb.worksheets[0]
    linhas = list(ws.iter_rows(values_only=True))
    cabecalho = tuple(str(c).strip() for c in linhas[0])
    if cabecalho != COLUNAS_ESPERADAS:
        raise SystemExit(f"{caminho}: cabeçalho inesperado {cabecalho}")

    pontos = []
    for linha in linhas[1:]:
        if linha[0] is None:
            continue
        dia, l, m, s = int(linha[0]), float(linha[1]), float(linha[2]), float(linha[3])
        # Confere a tabela contra a fórmula LMS (SD2 e SD2neg publicados com 3 casas)
        for z, coluna in ((2, 10), (-2, 6)):
            esperado = float(linha[coluna])
            calculado = valor_lms(l, m, s, z)
            if abs(calculado - esperado) > 0.002:
                raise SystemExit(f"{caminho}: dia {dia} z={z} LMS={calculado:.4f} tabela={esperado}")
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


def converter_intergrowth(sexo):
    origem = REFERENCIAS / "INTERGROWTH" / f"peso_pretermo_{sexo}.json"
    destino = REFERENCIAS / "INTERGROWTH" / f"peso_{sexo}.json"
    if not origem.exists():
        print(f"⚠️  {origem.relative_to(REPO)} não encontrado; INTERGROWTH {sexo} não convertido")
        return
    with open(origem, encoding="utf-8") as f:
        dados = json.load(f)
    semanas = {}
    for p in dados:
        if p.get("days", 0) != 0:
            continue
        semanas[int(p["weeks"])] = {
            "semana": int(p["weeks"]),
            "zN3": p["z_-3"], "zN2": p["z_-2"], "zN1": p["z_-1"], "z0": p["z_0"],
            "zP1": p["z_1"], "zP2": p["z_2"], "zP3": p["z_3"],
        }
    pontos = [semanas[s] for s in sorted(semanas)]
    if [p["semana"] for p in pontos] != list(range(27, 65)):
        raise SystemExit(f"{origem}: esperado semanas 27..64 contíguas")
    for p in pontos:
        valores = [p[k] for k in ("zN3", "zN2", "zN1", "z0", "zP1", "zP2", "zP3")]
        if valores != sorted(valores):
            raise SystemExit(f"{origem}: semana {p['semana']} não monotônica {valores}")
    escrever_json(destino, pontos)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for medida in ("peso", "estatura", "perimetro"):
        for sexo in ("f", "m"):
            parser.add_argument(f"--{medida}-{sexo}", help=f"xlsx expandida OMS: {medida} ({sexo})")
    parser.add_argument("--sem-intergrowth", action="store_true", help="não converter a tabela INTERGROWTH")
    args = parser.parse_args()

    algum = False
    for medida in ("peso", "estatura", "perimetro"):
        for sexo in ("f", "m"):
            caminho = getattr(args, f"{medida}_{sexo}")
            if not caminho:
                continue
            algum = True
            pontos = ler_expandida(caminho)
            escrever_json(REFERENCIAS / "OMS" / f"{medida}_{sexo}.json", pontos)

    if not args.sem_intergrowth:
        for sexo in ("f", "m"):
            converter_intergrowth(sexo)
            algum = True

    if not algum:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
