#!/usr/bin/env python3
"""
Converte as tabelas oficiais INTERGROWTH-21st "Postnatal Growth Standards for Preterm Infants"
(Villar et al., Lancet Glob Health 2015;3:e681-91) em
`Data/Referencias/INTERGROWTH/{peso,estatura,perimetro}_{f,m}.json`.

Entrada: os PDFs de z-scores por semana pós-menstrual exata (27-64), publicados em
https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-{boys,girls}_{bw,lt,hc}_table.pdf
e guardados em `Data/Referencias/INTERGROWTH/`.

Uso (requer `pdftotext`, do poppler):
  python3 -I scripts/importar_referencias_intergrowth.py            # gera estatura e perímetro, confere o peso
  python3 -I scripts/importar_referencias_intergrowth.py --verificar # só confere os JSON existentes contra os PDFs

O peso já existe e não é sobrescrito: o script apenas confere que o JSON atual é idêntico ao PDF.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DIRETORIO = REPO / "backend" / "CrescerSaudavel.Api" / "Data" / "Referencias" / "INTERGROWTH"
SEMANAS = list(range(27, 65))
COLUNAS = ("zN3", "zN2", "zN1", "z0", "zP1", "zP2", "zP3")
SEXOS = {"m": "boys", "f": "girls"}
MEDIDAS = {
    # medida no backend: (sufixo do PDF, título esperado no PDF, gerar JSON?)
    "peso": ("bw", "Weight (kg)", False),
    "estatura": ("lt", "Length (cm)", True),
    "perimetro": ("hc", "Head Circumference (cm)", True),
}
LINHA = re.compile(r"^\s*(\d{2})\s+" + r"\s+".join([r"(\d+\.\d+)"] * 7) + r"\s*$")


def ler_pdf(caminho: Path, titulo: str, sexo_pdf: str):
    texto = subprocess.run(
        ["pdftotext", "-layout", str(caminho), "-"], check=True, capture_output=True, text=True
    ).stdout
    if titulo not in texto or sexo_pdf.capitalize() not in texto:
        raise SystemExit(f"{caminho.name}: título '{titulo}' / sexo '{sexo_pdf}' não encontrado no PDF")

    pontos = []
    for linha in texto.splitlines():
        m = LINHA.match(linha)
        if m:
            semana = int(m.group(1))
            valores = [float(v) for v in m.groups()[1:]]
            pontos.append({"semana": semana, **dict(zip(COLUNAS, valores))})

    semanas = [p["semana"] for p in pontos]
    if semanas != SEMANAS:
        raise SystemExit(f"{caminho.name}: semanas lidas {semanas[:3]}...{semanas[-3:]} (n={len(semanas)}), esperado 27-64")

    for p in pontos:
        linha = [p[c] for c in COLUNAS]
        if any(b <= a for a, b in zip(linha, linha[1:])):
            raise SystemExit(f"{caminho.name}: semana {p['semana']} não é crescente entre as linhas de z: {linha}")
    for c in COLUNAS:
        coluna = [p[c] for p in pontos]
        if any(b < a for a, b in zip(coluna, coluna[1:])):
            raise SystemExit(f"{caminho.name}: coluna {c} diminui entre semanas")
    return pontos


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--verificar", action="store_true", help="não grava; só confere os JSON existentes")
    args = parser.parse_args()

    erros = 0
    for medida, (sufixo, titulo, gerar) in MEDIDAS.items():
        for sexo, sexo_pdf in SEXOS.items():
            pdf = DIRETORIO / f"grow_preterm-zs-{sexo_pdf}_{sufixo}_table.pdf"
            if not pdf.exists():
                raise SystemExit(f"PDF ausente: {pdf}")
            pontos = ler_pdf(pdf, titulo, sexo_pdf)
            destino = DIRETORIO / f"{medida}_{sexo}.json"

            if destino.exists():
                atual = json.loads(destino.read_text(encoding="utf-8"))
                if atual != pontos:
                    print(f"DIVERGE  {destino.name} x {pdf.name}")
                    if not gerar or args.verificar:
                        erros += 1
                else:
                    print(f"OK       {destino.name} = {pdf.name}")
            if gerar and not args.verificar:
                destino.write_text(json.dumps(pontos, separators=(",", ":")) + "\n", encoding="utf-8")
                print(f"GRAVADO  {destino.name} ({len(pontos)} semanas)")
            elif not destino.exists():
                erros += 1
                print(f"AUSENTE  {destino.name}")

    # o peso nunca é sobrescrito: divergência nele (ou em qualquer arquivo com --verificar) é erro
    if erros:
        sys.exit(1)


if __name__ == "__main__":
    main()
