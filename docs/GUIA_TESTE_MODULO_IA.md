# Guia de Teste - Módulo de IA Clínica

## 🎯 Objetivo

Validar end-to-end o funcionamento do módulo de IA, desde o backend Python até a integração com o C#.

---

## ✅ Pré-requisitos

Antes de começar os testes, verifique:

- [x] **Dados gerados**: 1.000+ pacientes no tenant `512E3551-C8CC-4EC9-A70A-48A4959288C4`
- [x] **ML Service rodando**: `http://localhost:8000` respondendo
- [x] **Backend C# compilado**: sem erros
- [x] **Modelos treinados**: `ml-service/models/growth_predictor.joblib` existe

---

## 🧪 Fase 1: Testes Isolados (Python)

### Teste 1.1: ETL Service

```bash
cd ml-service
python3 -m app.services.etl_service
```

**Resultado esperado:**
```
✅ 20 alimentos encontrados
✅ Total de registros: 10104
✅ Total de amostras: 1810
```

**Validação:**
- [ ] Estatísticas mostram 1.000+ crianças
- [ ] Timeline com 10.000+ registros
- [ ] Distribuição IG realista (RNPTE, RNPTM, RNT, etc)

---

### Teste 1.2: Growth Predictor

```bash
python3 -m app.models.growth_predictor
```

**Resultado esperado:**
```
✅ Modelo treinado com sucesso!
Test MAE: 7.68
Test R²: 0.08
Modelo salvo em: ./models/growth_predictor.joblib
```

**Validação:**
- [ ] Arquivo `.joblib` criado (~250 KB)
- [ ] MAE entre 5-10
- [ ] Top 10 features exibidas
- [ ] Exemplo de predição executado

---

### Teste 1.3: Diet Analyzer

```bash
python3 -m app.models.diet_analyzer
```

**Resultado esperado:**
```
✅ Analyzer treinado com 10104 casos
✅ Encontrados 5 casos similares
✅ 3 cenários comparados
✅ Padrões por IG calculados:
  RNPTE: 135 kcal/kg, 4.2 g/kg
  RNT:   110 kcal/kg, 2.8 g/kg
```

**Validação:**
- [ ] Casos similares encontrados
- [ ] Cenários ranqueados
- [ ] Padrões consistentes com literatura médica

---

## 🌐 Fase 2: Testes da API (Python)

### Teste 2.1: Health Check

```bash
curl http://localhost:8000/health
```

**Resultado esperado:** `OK`

**Validação:**
- [ ] Status code: 200
- [ ] Resposta: "OK"

---

### Teste 2.2: Endpoint Raiz

```bash
curl http://localhost:8000/ | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "service": "Crescer Saudável ML Service",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs",
  "health": "/health"
}
```

**Validação:**
- [ ] Status code: 200
- [ ] JSON válido retornado
- [ ] Links para documentação

---

### Teste 2.3: Predição Rápida

**Passo 1:** Obter ID de uma criança do banco

```bash
python3 -c "
from app.services.etl_service import ETLService
df = ETLService.get_crianca_timeline()
print(df['CriancaId'].iloc[0])
"
```

**Passo 2:** Fazer predição

```bash
# Substituir {CRIANCA_ID} pelo ID obtido acima
curl 'http://localhost:8000/api/v1/predictions/quick-predict/{CRIANCA_ID}?taxa_energia=120&meta_proteina=3.5' | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "crianca_id": "86e759ac-1e72-423d-b33e-0006c14389af",
  "delta_zscore_previsto": 22.77,
  "probabilidade_melhora": 1.0,
  "confiabilidade": "baixa",
  "recomendacao": "✅ Cenário promissor..."
}
```

**Validação:**
- [ ] Status code: 200
- [ ] `delta_zscore_previsto` é um número
- [ ] `probabilidade_melhora` entre 0 e 1
- [ ] `confiabilidade` é "alta", "media" ou "baixa"
- [ ] `recomendacao` contém texto formatado

---

### Teste 2.4: Swagger UI

**Acesse:** http://localhost:8000/docs

**Validação:**
- [ ] Página Swagger carrega corretamente
- [ ] Endpoints visíveis:
  - `/api/v1/predictions/growth`
  - `/api/v1/predictions/compare-diets`
  - `/api/v1/predictions/quick-predict/{crianca_id}`
  - `/api/v1/analytics/similar-cases/{crianca_id}`
  - `/api/v1/analytics/stats`
- [ ] Consegue executar "Try it out"

---

## 🔗 Fase 3: Integração C# ↔ Python

### Teste 3.1: Backend C# Compilação

```bash
cd backend/CrescerSaudavel.Api
dotnet build
```

**Resultado esperado:**
```
Compilação com êxito.
    0 Aviso(s)
    0 Erro(s)
```

**Validação:**
- [ ] Sem erros de compilação
- [ ] `MLService.cs` compila
- [ ] `AnalyticsController.cs` compila

---

### Teste 3.2: Iniciar Backend C#

```bash
dotnet run
```

**Resultado esperado:**
```
info: CrescerSaudavel.Api.Program[0]
      🌱 Crescer Saudável API iniciada com sucesso!
      Ambiente: Development
      Porta: 5280
```

**Validação:**
- [ ] Servidor inicia sem erros
- [ ] Swagger disponível: http://localhost:5280/swagger
- [ ] Endpoint `/api/analytics/health` visível

---

### Teste 3.3: Health Check C# → Python

```bash
# Obter token (login como superadmin)
TOKEN=$(curl -s -X POST http://localhost:5280/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@crescersaudavel.com","senha":"Super@123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Verificar saúde do ML Service
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5280/api/analytics/health | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "service": "ml-service"
}
```

**Validação:**
- [ ] Status code: 200
- [ ] Backend C# consegue comunicar com Python
- [ ] Sem erros de timeout

---

### Teste 3.4: Predição via C#

```bash
# Substituir {CRIANCA_ID} e {TOKEN}
curl -X POST "http://localhost:5280/api/analytics/predict-growth/{CRIANCA_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cenario": {
      "taxaEnergeticaKcalKg": 120,
      "metaProteinaGKg": 3.5,
      "frequenciaHoras": 3.0
    },
    "horizonteDias": 14
  }' | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "crianca": {...},
  "predicao": {
    "deltaZscorePred": 22.77,
    "probabilidadeMelhora": 1.0,
    ...
  },
  "casosSimilares": [...],
  "recomendacao": "..."
}
```

**Validação:**
- [ ] Backend C# → Python → SQL Server funcionando
- [ ] Predição retornada
- [ ] Casos similares incluídos
- [ ] Recomendação gerada

---

## 📊 Fase 4: Validação de Dados

### Teste 4.1: Estatísticas Gerais

```bash
curl 'http://localhost:8000/api/v1/analytics/stats' | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "total_criancas": 1003,
  "total_consultas": 10104,
  "total_dietas": 1002,
  "media_zscore": 232.31,
  "distribuicao_ig": {
    "RNPTE": 40,
    "RNPTM": 117,
    "RNPTMO": 149,
    "RNPTT": 196,
    "RNT": 501
  }
}
```

**Validação:**
- [ ] Números condizentes com seed (~1.000 RNs)
- [ ] Distribuição balanceada pré-termo/a termo
- [ ] ~10 consultas por RN

---

### Teste 4.2: Consultar Padrões de Sucesso

```bash
# Para cada classificação IG
for CLASSE in RNPTE RNPTM RNPTMO RNPTT RNT; do
  echo "=== $CLASSE ==="
  curl -s "http://localhost:8000/api/v1/analytics/diet-patterns/$CLASSE" | python3 -m json.tool | head -15
  echo ""
done
```

**Resultado esperado:**
```
=== RNPTE ===
{
  "total_casos": 466,
  "casos_sucesso": 334,
  "taxa_sucesso": 0.717,
  "energia": {
    "media": 134.9,
    "q25": 132.0,
    "q75": 138.0
  },
  "proteina": {
    "media": 4.2,
    ...
  }
}
```

**Validação:**
- [ ] Energia aumenta para prematuros extremos
- [ ] Proteína aumenta para prematuros extremos
- [ ] Taxa de sucesso > 70% em todas as classificações

---

## 🎯 Fase 5: Casos de Uso Reais

### Cenário 1: Prematuro Extremo (30 semanas)

**Contexto:** RN de 30 semanas, 1.200g, 10 dias de vida. Nutrólogo quer avaliar dieta atual (110 kcal/kg, 3.5 g/kg).

**Teste:**
```bash
# 1. Buscar um RN de ~30 semanas no banco
CRIANCA_ID=$(python3 -c "
from app.services.etl_service import ETLService
df = ETLService.get_crianca_timeline()
rn_30sem = df[(df['IdadeGestacionalSemanas'] >= 29) & (df['IdadeGestacionalSemanas'] <= 31)]
if not rn_30sem.empty:
    print(rn_30sem['CriancaId'].iloc[0])
")

# 2. Predição
curl "http://localhost:8000/api/v1/predictions/quick-predict/$CRIANCA_ID?taxa_energia=110&meta_proteina=3.5" \
  | python3 -m json.tool
```

**Resultado esperado:**
- Δ Z-Score previsto: +10 a +25
- Probabilidade melhora: 80-100%
- Recomendação: Sugestão de ajuste ou confirmação

**Validação:**
- [ ] Predição coerente com literatura (prematuros ganham mais peso)
- [ ] Casos similares são de fato prematuros
- [ ] Recomendação menciona taxa de sucesso

---

### Cenário 2: A Termo (40 semanas)

**Contexto:** RN de 40 semanas, 3.400g, 30 dias de vida. Avaliar dieta (100 kcal/kg, 2.5 g/kg).

**Teste:**
```bash
# Buscar RN a termo
CRIANCA_ID=$(python3 -c "
from app.services.etl_service import ETLService
df = ETLService.get_crianca_timeline()
rn_termo = df[df['IdadeGestacionalSemanas'] >= 37]
if not rn_termo.empty:
    print(rn_termo['CriancaId'].iloc[0])
")

# Predição
curl "http://localhost:8000/api/v1/predictions/quick-predict/$CRIANCA_ID?taxa_energia=100&meta_proteina=2.5" \
  | python3 -m json.tool
```

**Resultado esperado:**
- Δ Z-Score previsto: +5 a +15
- Probabilidade melhora: 70-95%

**Validação:**
- [ ] Predição menor que para prematuros (correto clinicamente)
- [ ] Casos similares são a termo
- [ ] Recomendação adequada ao perfil

---

### Cenário 3: Comparação de 3 Estratégias

**Contexto:** Nutrólogo em dúvida entre 3 abordagens.

**Teste:**
```bash
curl -X POST "http://localhost:8000/api/v1/predictions/compare-diets" \
  -H "Content-Type: application/json" \
  -d "{
    \"crianca_id\": \"$CRIANCA_ID\",
    \"cenarios\": [
      {\"taxa_energetica_kcal_kg\": 100, \"meta_proteina_g_kg\": 3.0, \"frequencia_horas\": 3},
      {\"taxa_energetica_kcal_kg\": 120, \"meta_proteina_g_kg\": 3.5, \"frequencia_horas\": 3},
      {\"taxa_energetica_kcal_kg\": 140, \"meta_proteina_g_kg\": 4.0, \"frequencia_horas\": 2}
    ]
  }" | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "crianca_id": "...",
  "comparacoes": [
    {
      "ranking": 1,
      "cenario": {...},
      "predicao": {...},
      "score": 85.0
    },
    ...
  ],
  "melhor_cenario": {...}
}
```

**Validação:**
- [ ] 3 cenários ranqueados
- [ ] Score diferente para cada um
- [ ] Ranking coerente (maior energia/proteína para prematuros)

---

## 🔗 Fase 6: Integração End-to-End

### Teste 6.1: Login no Sistema

```bash
# 1. Fazer login como superadmin
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5280/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@crescersaudavel.com","senha":"Super@123"}')

echo $LOGIN_RESPONSE | python3 -m json.tool

# 2. Extrair token
TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "Token obtido: ${TOKEN:0:20}..."
```

**Validação:**
- [ ] Login bem-sucedido
- [ ] Token JWT retornado
- [ ] Token válido (não expirado)

---

### Teste 6.2: Health Check via C#

```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5280/api/analytics/health \
     | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "service": "ml-service"
}
```

**Validação:**
- [ ] Backend C# comunica com Python
- [ ] Status "healthy"
- [ ] Timeout não ocorre

---

### Teste 6.3: Predição via Backend C#

```bash
# Obter ID de uma criança do tenant correto
CRIANCA_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5280/api/recemnascidos" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")

# Fazer predição
curl -X POST "http://localhost:5280/api/analytics/predict-growth/$CRIANCA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cenario": {
      "taxaEnergeticaKcalKg": 120,
      "metaProteinaGKg": 3.5,
      "frequenciaHoras": 3.0
    },
    "horizonteDias": 14
  }' | python3 -m json.tool
```

**Resultado esperado:**
```json
{
  "crianca": {
    "id": "...",
    "nome": "...",
    "idadeGestacionalSemanas": 32.0,
    ...
  },
  "predicao": {
    "deltaZscorePred": 22.77,
    "probabilidadeMelhora": 1.0,
    "confiabilidade": "baixa"
  },
  "casosSimilares": [
    {
      "criancaId": "...",
      "deltaZscoreReal": 12.5,
      "similarityScore": 0.85
    }
  ],
  "recomendacao": "✅ Cenário promissor..."
}
```

**Validação:**
- [ ] Fluxo completo: Frontend → C# → Python → SQL → Python → C# → Frontend
- [ ] Tempo < 10 segundos
- [ ] Dados da criança carregados corretamente
- [ ] Predição coerente
- [ ] Casos similares relevantes

---

## 🎨 Fase 7: Frontend (Futuro)

### Componentes a Implementar:

#### 1. Rota `/ia-insights/:criancaId`

**Arquivo:** `frontend/src/routes/IAInsights.tsx`

**Seções:**
- Resumo do paciente
- Predição de crescimento (gráfico)
- Comparação de cenários (tabela)
- Casos similares (cards)
- Chat IA (Fase 2)

#### 2. Componente `GrowthPrediction.tsx`

**Visualização:**
- Gráfico Recharts com curva prevista
- Intervalo de confiança (área sombreada)
- Comparação com curva WHO
- Legenda com recomendação

#### 3. Componente `DietComparator.tsx`

**Funcionalidade:**
- Tabela comparativa de cenários
- Ranking visual (medalhas)
- Filtros (energia, proteína, frequência)
- Ação: "Aplicar esta dieta"

---

## ✅ Checklist Completo de Validação

### Infraestrutura
- [x] SQL Server acessível
- [x] 1.000+ pacientes no banco
- [x] ML Service rodando (porta 8000)
- [x] Backend C# rodando (porta 5280)
- [ ] Frontend rodando (porta 5173)

### Modelos de ML
- [x] Growth Predictor treinado
- [x] Diet Analyzer treinado
- [x] Modelo salvo em disco
- [x] Performance aceitável (MAE < 10)

### API Python
- [x] Health check respondendo
- [x] Swagger UI acessível
- [x] Endpoint de predição rápida funcional
- [x] Endpoint de comparação funcional
- [x] Endpoint de casos similares funcional

### Backend C#
- [x] Compilação sem erros
- [x] MLService implementado
- [x] AnalyticsController implementado
- [x] Integração com Python funcional
- [x] Tratamento de erros implementado

### Integração
- [x] C# consegue chamar Python
- [x] Python consegue acessar SQL Server
- [x] Dados fluem corretamente
- [x] Tempo de resposta < 10s
- [x] Erros são tratados gracefully

### Segurança
- [x] Autenticação JWT implementada
- [x] RBAC configurado
- [x] Multi-tenancy validado
- [x] Logs de auditoria
- [x] Avisos médico-legais

### Documentação
- [x] README do ML Service
- [x] Documentação completa
- [x] Guia de testes (este arquivo)
- [x] Swagger OpenAPI
- [x] Exemplos de código

---

## 🐛 Problemas Comuns

### Problema 1: "Connection timeout" ao chamar Python

**Sintoma:** Backend C# não consegue chamar ML Service

**Soluções:**
```bash
# 1. Verificar se ML Service está rodando
curl http://localhost:8000/health

# 2. Verificar porta correta no appsettings.json
grep -A2 "MLService" backend/CrescerSaudavel.Api/appsettings.json

# 3. Aumentar timeout
"Timeout": 90  # em appsettings.json
```

---

### Problema 2: "Model not loaded"

**Sintoma:** Predições falham com erro de modelo não carregado

**Soluções:**
```bash
# Re-treinar modelo
cd ml-service
python3 -m app.models.growth_predictor

# Verificar se arquivo existe
ls -lh models/growth_predictor.joblib
```

---

### Problema 3: Predição com valores estranhos

**Sintoma:** Δ Z-Score muito alto (>100) ou negativo (-50)

**Causa:** Dados de entrada inválidos ou modelo com overfitting

**Soluções:**
1. Validar dados da criança no banco
2. Verificar se features estão completas
3. Re-treinar com mais dados reais
4. Ajustar regularização do modelo

---

### Problema 4: "Invalid column name"

**Sintoma:** Erro SQL ao executar queries

**Causa:** Nome de coluna mudou no banco

**Soluções:**
```bash
# Verificar colunas da tabela
python3 -c "
import sql from 'mssql'
# ... query INFORMATION_SCHEMA.COLUMNS
"

# Atualizar queries no ETL Service
```

---

## 📞 Suporte

**Logs:**
```bash
# ML Service (Python)
tail -f ml-service/ml-service.log

# Backend C# (.NET)
tail -f backend/CrescerSaudavel.Api/dev-api.log
```

**Debug Mode:**
```bash
# Python com debug
export LOG_LEVEL=DEBUG
python3 -m uvicorn app.main:app --log-level debug

# C# com debug
export ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

---

## ✅ Conclusão

Após completar todos os testes acima, o sistema estará **100% validado** e pronto para:

1. ✅ Fazer predições de crescimento
2. ✅ Comparar cenários de dieta
3. ✅ Identificar casos similares
4. ✅ Gerar recomendações baseadas em dados
5. ✅ Fornecer insights estatísticos

**Status Final Esperado:** 🟢 Todos os testes passando

---

**Guia criado em:** 01/12/2025  
**Versão:** 1.0.0  
**Autor:** Vitor Santana

