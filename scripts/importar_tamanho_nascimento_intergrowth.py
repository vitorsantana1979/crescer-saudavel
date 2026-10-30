#!/usr/bin/env python3
"""
Converte as tabelas oficiais INTERGROWTH-21st de tamanho ao nascer em
`Data/Referencias/INTERGROWTH/nascimento_{peso,estatura,perimetro}_{f,m}.json`.

- 24+0 a 32+6 semanas: International Newborn Size References for Very Preterm Infants (Villar et al.,
  Lancet 2016;387:844-5) — referência, não padrão.
- 33+0 a 42+6 semanas: International Newborn Size Standards (Villar et al., Lancet 2014;384:857-68).

Cada linha (um dia de idade gestacional) traz os valores nas linhas z = −3..+3 (tabelas "zs") e nos
centis 3, 5, 10, 50, 90, 95 e 97 (tabelas "ct"). O z é calculado com as linhas z; PIG/AIG/GIG usam os
centis 10 e 90 publicados (a distribuição é assimétrica a partir de 33 semanas).

Uso (requer `pdftotext`, do poppler):
  python3 -I scripts/importar_tamanho_nascimento_intergrowth.py --pdfs /caminho/para/pdfs
  python3 -I scripts/importar_tamanho_nascimento_intergrowth.py --pdfs /caminho/para/pdfs --verificar

Os PDFs não ficam no repositório (≈ 6 MB); as URLs oficiais estão em URLS, abaixo. Baixe-os para a
pasta indicada em --pdfs com os nomes de arquivo listados (o PC de meninas a termo foi republicado em
2024 com duas casas decimais e é salvo como grow_newborn-ct-girls_hc_table.pdf).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DESTINO = REPO / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH"
BASE = "https://intergrowth21.com/sites/default/files"

MEDIDAS = {"peso": ("bw", "kg"), "estatura": ("lt", "cm"), "perimetro": ("hc", "cm")}
SEXOS = {"m": "boys", "f": "girls"}
Z_COLUNAS = ("zN3", "zN2", "zN1", "z0", "zP1", "zP2", "zP3")
CT_COLUNAS = ("p3", "p5", "p10", "p50", "p90", "p95", "p97")
LINHA = re.compile(r"^\s*(\d{2})\+([0-6])\s+" + r"\s+".join([r"(\d+\.\d+)"] * 7) + r"\s*$")


def url(arquivo: str) -> str:
    if arquivo == "grow_newborn-ct-girls_hc_table.pdf":
        return f"{BASE}/2024-10/intergrowth-21st_head_circumference_standards_girls.pdf"
    if arquivo == "grow_verypreterm-ct-boys_hc_table.pdf":
        return f"{BASE}/2025-09/grow_verypreterm-ct-boys_hc_table_0.pdf"
    pasta = "2025-09" if arquivo.startswith("grow_verypreterm") else "2023-02"
    return f"{BASE}/{pasta}/{arquivo}"


URLS = {
    f"grow_{grupo}-{tipo}-{sexo}_{sufixo}_table.pdf": None
    for grupo in ("verypreterm", "newborn")
    for tipo in ("zs", "ct")
    for sexo in SEXOS.values()
    for sufixo, _ in MEDIDAS.values()
}
URLS = {arquivo: url(arquivo) for arquivo in URLS}


def ler(pasta: Path, arquivo: str, faixa: range):
    caminho = pasta / arquivo
    if not caminho.exists():
        raise SystemExit(f"PDF ausente: {caminho}\n  baixe de {URLS[arquivo]}")
    texto = subprocess.run(["pdftotext", "-layout", str(caminho), "-"], check=True, capture_output=True, text=True).stdout
    linhas = {}
    for linha in texto.splitlines():
        m = LINHA.match(linha)
        if m:
            ig = int(m.group(1)) * 7 + int(m.group(2))
            linhas[ig] = [float(v) for v in m.groups()[2:]]
    if sorted(linhas) != list(faixa):
        raise SystemExit(f"{arquivo}: dias lidos {min(linhas)}..{max(linhas)} (n={len(linhas)}), esperado {faixa.start}..{faixa.stop - 1}")
    for ig, valores in linhas.items():
        if any(b <= a for a, b in zip(valores, valores[1:])):
            raise SystemExit(f"{arquivo}: IG {ig // 7}+{ig % 7} não é crescente: {valores}")
    return linhas


def montar(pasta: Path, medida: str, sexo: str):
    sufixo, unidade = MEDIDAS[medida]
    sexo_pdf = SEXOS[sexo]
    tolerancia = 0.03 if unidade == "kg" else 0.25
    pontos = []
    for grupo, faixa in (("verypreterm", range(24 * 7, 33 * 7)), ("newborn", range(33 * 7, 43 * 7))):
        zs = ler(pasta, f"grow_{grupo}-zs-{sexo_pdf}_{sufixo}_table.pdf", faixa)
        ct = ler(pasta, f"grow_{grupo}-ct-{sexo_pdf}_{sufixo}_table.pdf", faixa)
        for ig in faixa:
            z, c = zs[ig], ct[ig]
            # mediana publicada nas duas tabelas deve coincidir (a menos do arredondamento)
            if abs(z[3] - c[3]) > tolerancia:
                raise SystemExit(f"{grupo} {medida} {sexo} IG {ig // 7}+{ig % 7}: z0={z[3]} ≠ P50={c[3]}")
            pontos.append({"igDias": ig, **dict(zip(Z_COLUNAS, z)), **dict(zip(CT_COLUNAS, c))})
    return pontos


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pdfs", type=Path, required=True, help="pasta com os 24 PDFs oficiais")
    parser.add_argument("--verificar", action="store_true", help="não grava; confere os JSON existentes")
    args = parser.parse_args()

    erros = 0
    for medida in MEDIDAS:
        for sexo in SEXOS:
            pontos = montar(args.pdfs, medida, sexo)
            destino = DESTINO / f"nascimento_{medida}_{sexo}.json"
            if args.verificar:
                atual = json.loads(destino.read_text(encoding="utf-8")) if destino.exists() else None
                ok = atual == pontos
                erros += 0 if ok else 1
                print(f"{'OK      ' if ok else 'DIVERGE '} {destino.name}")
            else:
                destino.write_text(json.dumps(pontos, separators=(",", ":")) + "\n", encoding="utf-8")
                print(f"GRAVADO  {destino.name} ({len(pontos)} dias, 24+0 a 42+6)")
    if erros:
        sys.exit(1)


if __name__ == "__main__":
    main()
