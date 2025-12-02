# Módulo de IA Clínica - Crescer Saudável

## Visão Geral

Serviço de Machine Learning para análise preditiva de crescimento e sugestões de dietoterapia personalizada baseadas em dados históricos.

## Arquitetura

```
┌─────────────┐      HTTP      ┌──────────────┐      SQL      ┌──────────────┐
│   Frontend  │ ────────────▶  │  Backend C#  │ ────────────▶ │  SQL Server  │
│   (React)   │                │    (API)     │                │  (Database)  │
└─────────────┘                └──────────────┘                └──────────────┘
                                       │
                                       │ HTTP
                                       ▼
                               ┌──────────────┐
                               │  ML Service  │
                               │   (Python)   │
                               └──────────────┘
                                       │
                                       │ HTTP
                                       ▼
                               ┌──────────────┐
                               │  OpenAI API  │
                               │    (LLM)     │
                               └──────────────┘
```

## Componentes

### 1. ML Service (Python/FastAPI)

**Localização**: `/ml-service/`

**Funcionalidades**:

- Predição de Δ z-score em janelas de tempo (7, 14, 28 dias)
- Análise de casos similares com bons desfechos
- Comparação de cenários de dieta
- ETL de dados do SQL Server
- API REST para integração

**Modelos**:

- `GrowthPredictor`: XGBoost para predição de mudança no z-score
- `DietAnalyzer`: KNN para encontrar casos similares

### 2. Backend Integration (C#)

**Localização**: `/backend/CrescerSaudavel.Api/`

**Novos componentes**:

- `Services/MLService.cs`: Cliente HTTP para ML Service
- `Services/ChatService.cs`: Integração com OpenAI GPT-4
- `Controllers/AnalyticsController.cs`: Endpoints de análise preditiva
- `Controllers/ChatController.cs`: Endpoints de chat com LLM
- `Models/ML/`: Modelos de dados para IA

### 3. Frontend (React)

**Localização**: `/frontend/src/`

**Novas telas**:

- `routes/IAInsights.tsx`: Dashboard de predições
- `components/AIChatPanel.tsx`: Chat conversacional com IA

## Instalação e Setup

### 1. Configurar Variáveis de Ambiente

#### ML Service

Criar arquivo `.env` em `/ml-service/`:

```env
DATABASE_SERVER=localhost
DATABASE_NAME=CrescerSaudavel
DATABASE_USER=sa
DATABASE_PASSWORD=YourPassword
DATABASE_DRIVER=ODBC Driver 18 for SQL Server
DATABASE_TRUST_CERTIFICATE=True

MODEL_PATH=/models
OPENAI_API_KEY=sk-your-key-here
```

#### Backend C#

Atualizar `/backend/CrescerSaudavel.Api/appsettings.json`:

```json
{
  "MLService": {
    "BaseUrl": "http://localhost:8000",
    "Timeout": 60
  },
  "OpenAI": {
    "ApiKey": "sk-your-key-here",
    "Model": "gpt-4",
    "MaxTokens": 1500
  }
}
```

### 2. Iniciar com Docker Compose

```bash
cd /caminho/para/crescer-saudavel
docker-compose up --build
```

Serviços estarão disponíveis em:

- ML Service: http://localhost:8000
- Backend API: http://localhost:5280
- Frontend: http://localhost:5174

### 3. Treinar Modelos Iniciais

Acessar documentação interativa: http://localhost:8000/docs

Chamar endpoint:

```http
POST /api/v1/analytics/retrain?horizonte_dias=14
```

## Uso

### 1. Predição de Crescimento (via API)

```http
POST /api/analytics/predict-growth/{criancaId}
Content-Type: application/json

{
  "cenario": {
    "taxaEnergeticaKcalKg": 120,
    "metaProteinaGKg": 3.0,
    "frequenciaHoras": 3.0
  },
  "horizonteDias": 14
}
```

**Resposta**:

```json
{
  "crianca": { ... },
  "predicao": {
    "deltaZscorePred": 0.15,
    "intervaloConfianca": {
      "lower": 0.05,
      "upper": 0.25,
      "confidenceLevel": 0.95
    },
    "probabilidadeMelhora": 0.78,
    "confiabilidade": "alta"
  },
  "casosSimilares": [ ... ],
  "recomendacao": "✅ Cenário promissor..."
}
```

### 2. Chat com IA

```http
POST /api/chat
Content-Type: application/json

{
  "message": "Qual a melhor estratégia para prematuros de 30 semanas?",
  "criancaId": "guid-da-crianca"
}
```

### 3. Frontend

- **Dashboard de IA**: Navegue para `/ia-insights/{criancaId}`
- **Chat**: Disponível na aba de detalhes da criança

## Modelos de ML

### Features Utilizadas

**Características do RN**:

- Idade gestacional (semanas)
- Peso ao nascimento (g)
- Sexo
- Apgar 1' e 5'
- Classificação IG e Peso

**Características da Dieta**:

- Taxa energética (kcal/kg/dia)
- Meta proteica (g/kg/dia)
- Frequência de mamadas

**Features Temporais**:

- Dias de vida
- Z-score atual
- Velocidade de ganho de peso
- Médias móveis (7, 14 dias)

### Métricas de Performance

Modelo é treinado e avaliado com:

- **MAE** (Mean Absolute Error)
- **RMSE** (Root Mean Squared Error)
- **R²** (Coefficient of Determination)
- **Cross-validation** (5-fold)

### Re-treinamento

Modelos devem ser re-treinados periodicamente:

- Manualmente via endpoint `/api/v1/analytics/retrain`
- Recomendado: a cada 30 dias ou ao atingir 100+ novos casos

## Segurança e Responsabilidade

### Avisos Obrigatórios

**TODAS as interfaces exibem**:

> ⚠️ **AVISO IMPORTANTE**  
> As predições e sugestões são baseadas em dados históricos e modelos estatísticos.
> **NÃO substituem avaliação clínica profissional.** Decisões finais devem sempre
> considerar o julgamento da equipe médica e as particularidades de cada caso.

### Auditoria

Todas as predições são registradas em `analytics.ModelPredictions` (SQL Server) para:

- Rastreabilidade
- Avaliação de performance retrospectiva
- Compliance e auditoria

### Permissões

- Endpoints de análise: requerem autenticação
- Re-treinamento: apenas administradores
- Chat: requer autenticação

## Monitoramento

### Health Checks

- ML Service: `GET http://localhost:8000/health`
- Backend Integration: `GET /api/analytics/health`

### Logs

- ML Service: stdout/stderr (Docker logs)
- Backend: Application Insights / arquivo de log

### Métricas Importantes

- **Latência** de predições (target: <2s)
- **Taxa de erro** de API calls
- **Drift de dados**: monitorar distribuições
- **Performance do modelo**: comparar predições vs outcomes reais

## Troubleshooting

### Erro: "Erro ao conectar ao serviço de predição"

- Verificar se ml-service está rodando: `docker ps`
- Verificar logs: `docker logs ml-service`
- Testar health check: `curl http://localhost:8000/health`

### Erro: "Dados insuficientes para treinamento"

- Mínimo: 50 amostras com consultas follow-up
- Verificar se há dados de z-score nas consultas
- Executar query de diagnóstico:
  ```sql
  SELECT COUNT(*) FROM clinica.Consulta WHERE ZScorePeso IS NOT NULL
  ```

### Chat não funciona

- Verificar se `OpenAI:ApiKey` está configurada
- Testar: `GET /api/chat/status`
- Verificar saldo da API OpenAI

## Evoluções Futuras

### Fase 3 (Roadmap)

- [ ] Modelos LSTM para séries temporais
- [ ] Inferência causal (efeito isolado da dieta)
- [ ] Re-treinamento automático agendado
- [ ] Dashboard de performance dos modelos
- [ ] Exportação de relatórios PDF com insights
- [ ] Integração com mais providers de LLM
- [ ] Suporte a múltiplos idiomas no chat

## Referências

- **ESPGHAN Guidelines**: Nutrição enteral em prematuros
- **WHO Growth Standards**: Curvas de crescimento
- **scikit-learn**: https://scikit-learn.org/
- **XGBoost**: https://xgboost.readthedocs.io/
- **FastAPI**: https://fastapi.tiangolo.com/
- **OpenAI API**: https://platform.openai.com/docs/

## Contato e Suporte

Para dúvidas técnicas sobre o módulo de IA, consulte a documentação interativa:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2024


# 1. Configurar OpenAI API Key em appsettings.json
# 2. Iniciar serviços
docker-compose up --build

# 3. Treinar modelos
curl -X POST http://localhost:8000/api/v1/analytics/retrain?horizonte_dias=14

# 4. Acessar frontend
open http://localhost:5174

# Email: superadmin@crescersaudavel.com
# Senha: Super@123