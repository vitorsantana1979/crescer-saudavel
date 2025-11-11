#!/bin/bash
set -e
BASE="$(dirname "$0")/../backend/CrescerSaudavel.Api/Data/Referencias"
mkdir -p "$BASE/OMS" "$BASE/INTERGROWTH"
echo "📦 Baixando tabelas OMS e INTERGROWTH..."

# OMS
curl -L -o "$BASE/OMS/peso_m.csv" "https://www.who.int/tools/child-growth-standards/standards/weight-for-age-boys.csv"
curl -L -o "$BASE/OMS/peso_f.csv" "https://www.who.int/tools/child-growth-standards/standards/weight-for-age-girls.csv"
curl -L -o "$BASE/OMS/estatura_m.csv" "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age-boys.csv"
curl -L -o "$BASE/OMS/estatura_f.csv" "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age-girls.csv"
curl -L -o "$BASE/OMS/perimetro_m.csv" "https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age-boys.csv"
curl -L -o "$BASE/OMS/perimetro_f.csv" "https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age-girls.csv"

# INTERGROWTH-21st - Baixar PDFs (as tabelas são fornecidas apenas em PDF)
echo "ℹ️  INTERGROWTH-21st fornece apenas PDFs, não CSVs. Use as tabelas manuais já criadas."

echo "✅ Download concluído. Convertendo CSVs em JSON..."
python3 "$(dirname "$0")/convert_to_json.py" "$BASE"
echo "✅ Tabelas OMS e INTERGROWTH importadas com sucesso."
