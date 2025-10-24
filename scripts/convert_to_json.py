import csv, json, sys, os, glob

base_dir = sys.argv[1]
for csv_path in glob.glob(os.path.join(base_dir, "**/*.csv"), recursive=True):
    json_path = csv_path.replace(".csv", ".json")
    data = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                idade = float(row.get('AgeWeeks') or row.get('GestationalAgeWeeks') or 0)
                for z in ['-3','-2','-1','0','1','2','3']:
                    v = row.get(f'Z{z}') or row.get(z)
                    if v:
                        data.append({"idadeSemanas": idade, "z": float(z), "valor": float(v)})
            except Exception:
                continue
    with open(json_path, 'w', encoding='utf-8') as out:
        json.dump(data, out, indent=2)
    print(f"✔️ {os.path.basename(json_path)} ({len(data)} pontos)")
