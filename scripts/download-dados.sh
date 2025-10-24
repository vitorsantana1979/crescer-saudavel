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

# INTERGROWTH
curl -L -o "$BASE/INTERGROWTH/peso_m.csv" "https://intergrowth21.ndog.ox.ac.uk/Content/PDF/VeryPreterm/INTERGROWTH-21st_Weight_Z_Scores_Boys.csv"
curl -L -o "$BASE/INTERGROWTH/peso_f.csv" "https://intergrowth21.ndog.ox.ac.uk/Content/PDF/VeryPreterm/INTERGROWTH-21st_Weight_Z_Scores_Girls.csv"
curl -L -o "$BASE/INTERGROWTH/comprimento_m.csv" "https://intergrowth21.ndog.ox.ac.uk/Content/PDF/VeryPreterm/INTERGROWTH-21st_Length_Z_Scores_Boys.csv"
curl -L -o "$BASE/INTERGROWTH/comprimento_f.csv" "https://intergrowth21.ndog.ox.ac.uk/Content/PDF/VeryPreterm/INTERGROWTH-21st_Length_Z_Scores_Girls.csv"
curl -L -o "$BASE/INTERGROWTH/cabeca_m.csv" "https://intergrowth21.ndog.ox.ac.uk/Content/PDF/VeryPreterm/INTERGROWTH-21st_Head_Circumference_Z_Scores_Boys.csv"
curl -L -o "$BASE/INTERGROWTH/cabeca_f.csv" "https://intergrowth21.ndog.ox.ac.uk/Content/PDF/VeryPreterm/INTERGROWTH-21st_Head_Circumference_Z_Scores_Girls.csv"

echo "✅ Download concluído. Convertendo CSVs em JSON..."
python3 "$(dirname "$0")/convert_to_json.py" "$BASE"
echo "✅ Tabelas OMS e INTERGROWTH importadas com sucesso."
