# ML Service - Quick Start Guide

## 🚀 Início Rápido (5 minutos)

### 1. Instalar Dependências

```bash
cd ml-service
pip3 install -r requirements.txt
```

### 2. Configurar Banco de Dados

Editar `app/config.py`:

```python
DATABASE_SERVER = "sql.vsantana.com.br"
DATABASE_PORT = 1279
DATABASE_NAME = "crescer"
DATABASE_USER = "crescer"
DATABASE_PASSWORD = "QSSmFTgRS7B3rsdl"
```

### 3. Iniciar Servidor

```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Servidor estará em: **http://localhost:8000**  
Documentação: **http://localhost:8000/docs**

### 4. Testar

```bash
# Health check
curl http://localhost:8000/health

# Predição rápida (usar ID real do banco)
curl 'http://localhost:8000/api/v1/predictions/quick-predict/86e759ac-1e72-423d-b33e-0006c14389af?taxa_energia=120&meta_proteina=3.5'
```

---

## 📦 Estrutura do Projeto

```
ml-service/
├── app/
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Configurações
│   ├── database.py             # Conexão SQL Server
│   ├── schemas.py              # Modelos Pydantic
│   │
│   ├── models/                 # Modelos de ML
│   │   ├── growth_predictor.py   # XGBoost (Δ Z-Score)
│   │   └── diet_analyzer.py      # K-NN + Estatísticas
│   │
│   ├── services/               # Lógica de negócio
│   │   ├── etl_service.py        # ETL e features
│   │   └── prediction_service.py # Orquestração
│   │
│   └── routers/                # Endpoints
│       ├── predictions.py        # Predições
│       └── analytics.py          # Analytics
│
├── models/                     # Modelos treinados
│   └── growth_predictor.joblib   # 250 KB
│
├── requirements.txt
└── README.md
```

---

## 📊 Endpoints Principais

### 1. Predição Rápida (GET)

```bash
GET /api/v1/predictions/quick-predict/{crianca_id}?taxa_energia=120&meta_proteina=3.5
```

**Resposta:**

```json
{
  "crianca_id": "...",
  "delta_zscore_previsto": 22.77,
  "probabilidade_melhora": 1.0,
  "confiabilidade": "baixa",
  "recomendacao": "✅ Cenário promissor..."
}
```

### 2. Predição Completa (POST)

```bash
POST /api/v1/predictions/growth
Content-Type: application/json

{
  "crianca_id": "86e759ac-1e72-423d-b33e-0006c14389af",
  "dieta_cenario": {
    "taxa_energetica_kcal_kg": 120,
    "meta_proteina_g_kg": 3.5,
    "frequencia_horas": 3.0
  },
  "horizonte_dias": 14
}
```

### 3. Comparar Cenários (POST)

```bash
POST /api/v1/predictions/compare-diets
Content-Type: application/json

{
  "crianca_id": "86e759ac-1e72-423d-b33e-0006c14389af",
  "cenarios": [
    {"taxa_energetica_kcal_kg": 100, "meta_proteina_g_kg": 3.0, "frequencia_horas": 3},
    {"taxa_energetica_kcal_kg": 120, "meta_proteina_g_kg": 3.5, "frequencia_horas": 3},
    {"taxa_energetica_kcal_kg": 140, "meta_proteina_g_kg": 4.0, "frequencia_horas": 2}
  ]
}
```

### 4. Casos Similares (GET)

```bash
GET /api/v1/analytics/similar-cases/{crianca_id}?limit=10
```

### 5. Padrões por IG (GET)

```bash
GET /api/v1/analytics/diet-patterns/RNPTE
```

---

## 🧪 Testar Modelos Diretamente

### Growth Predictor

```bash
cd ml-service
python3 -m app.models.growth_predictor
```

**Output esperado:**

```
📊 1. Preparando dados de treinamento...
✅ Dados preparados: 1810 amostras

🧠 2. Treinando modelo...
✅ Modelo treinado com sucesso!
  Test MAE: 7.68
  Test R²: 0.08

🔍 3. Importância das Features:
  1. VelocidadePeso (14.76%)
  2. SexoNumerico (10.33%)
  ...

✅ TREINAMENTO CONCLUÍDO!
Modelo salvo em: ./models/growth_predictor.joblib
```

### Diet Analyzer

```bash
python3 -m app.models.diet_analyzer
```

**Output esperado:**

```
📊 1. Carregando dados históricos...
✅ Timeline carregada: 10104 registros
✅ Analyzer treinado com 10104 casos

🔍 2. Casos Similares:
✅ Encontrados 5 casos similares

📈 4. Padrões por IG:
  RNPTE: 134.9 kcal/kg, 4.2 g/kg → Δ Z-Score +17.6
  RNT:   109.7 kcal/kg, 2.8 g/kg → Δ Z-Score +8.6
```

### ETL Service

```bash
python3 -m app.services.etl_service
```

---

## 🔧 Configurações

### Variáveis de Ambiente (.env)

```bash
# Banco de Dados
DATABASE_SERVER=sql.vsantana.com.br
DATABASE_PORT=1279
DATABASE_NAME=crescer
DATABASE_USER=crescer
DATABASE_PASSWORD=QSSmFTgRS7B3rsdl

# ML Models
MODEL_PATH=./models

# API
API_TITLE="Crescer Saudável ML Service"
API_VERSION="1.0.0"

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### appsettings.json (Backend C#)

```json
{
  "MLService": {
    "BaseUrl": "http://localhost:8000",
    "Timeout": 60
  }
}
```

---

## 📈 Performance

| Operação            | Tempo Médio |
| ------------------- | ----------- |
| Predição Rápida     | 2-3s        |
| Predição Completa   | 3-5s        |
| Comparar 3 Cenários | 5-8s        |
| Casos Similares     | 1-2s        |
| Re-treinamento      | 5-10s       |

**Gargalos:**

- Conexão com SQL Server (~1-2s)
- Computação de features (~0.5-1s)
- Predição XGBoost (~0.1s)
- Busca K-NN (~0.5s)

---

## 🐛 Troubleshooting

### Erro: "Module not found"

```bash
# Reinstalar dependências
pip3 install -r requirements.txt
```

### Erro: "Connection timeout" (SQL Server)

```bash
# Verificar conectividade
python3 -c "from app.database import test_connection; print(test_connection())"
```

### Erro: "Model not found"

```bash
# Re-treinar modelo
python3 -m app.models.growth_predictor
```

### Porta 8000 já em uso

```bash
# Parar processo
lsof -ti :8000 | xargs kill -9

# Ou usar outra porta
uvicorn app.main:app --port 8001
```

---

## 📚 Documentação Completa

Consulte: `/docs/MODULO_IA_COMPLETO.md`

---

## ✅ Checklist de Setup

- [ ] Python 3.10+ instalado
- [ ] pip3 atualizado
- [ ] Dependências instaladas (`pip3 install -r requirements.txt`)
- [ ] Conexão com SQL Server validada
- [ ] Modelos treinados (existem em `./models/`)
- [ ] Servidor iniciado (porta 8000)
- [ ] Swagger acessível (http://localhost:8000/docs)
- [ ] Health check OK (http://localhost:8000/health)
- [ ] Predição teste executada com sucesso

---

## 🚀 Deploy (Produção)

### Docker

```bash
cd ml-service
docker build -t crescer-ml-service .
docker run -p 8000:8000 \
  -e DATABASE_URL="..." \
  crescer-ml-service
```

### Docker Compose (com backend C#)

```bash
cd ..
docker-compose up -d
```

---

## 📞 Suporte

**Problemas?** Verifique logs:

```bash
tail -f ml-service.log
```

**Performance?** Ative profile:

```bash
python3 -m cProfile -o profile.stats -m app.main
```

---

**ML Service v1.0.0** - Crescer Saudável © 2025
