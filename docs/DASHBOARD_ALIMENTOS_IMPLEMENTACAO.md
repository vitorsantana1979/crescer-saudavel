# Dashboard de Análise de Alimentos - Resumo Técnico da Implementação

## Visão Geral

Implementação completa de um dashboard analítico para avaliar a efetividade de alimentos no tratamento nutricional de recém-nascidos, combinando análise estatística (C#) com recomendações baseadas em Machine Learning (Python).

---

## Arquitetura

```
┌─────────────────┐
│   Frontend      │
│   React/TS      │
│  (Dashboard UI) │
└────────┬────────┘
         │
         │ REST API
         │
┌────────▼────────┐       ┌──────────────────┐
│   Backend C#    │◄──────►│  Python ML       │
│  Analytics API  │  HTTP  │  Food Recommender│
└────────┬────────┘       └──────────────────┘
         │
         │ SQL
         │
┌────────▼────────┐
│  SQL Server     │
│  (Data Mart)    │
└─────────────────┘
```

---

## Backend C# - Analytics API

### Arquivos Criados

#### 1. `Models/Analytics/FoodAnalytics.cs`
**Propósito:** DTOs para comunicação de dados analíticos

**Classes Principais:**
- `AlimentoPerformance`: Métricas agregadas por alimento
- `CombinacaoAlimentos`: Análise de combinações efetivas
- `AlimentoTimelinePoint`: Dados temporais
- `AlimentoRecomendacao`: Recomendação de alimento (ML)
- `FoodAnalyticsFilter`: Filtros de consulta
- `FoodRecommendationRequest/Response`: Requisição/Resposta ML
- `FoodAnalyticsDashboard`: Dashboard consolidado

**Características:**
- Usa `[JsonPropertyName]` para interoperabilidade com Python (snake_case)
- Validações básicas
- Documentação XML para Swagger

---

#### 2. `Controllers/AlimentosAnalyticsController.cs`
**Propósito:** Endpoints de analytics de alimentos

**Endpoints Implementados:**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/alimentos-analytics/dashboard` | Dashboard completo |
| POST | `/api/alimentos-analytics/performance` | Performance agregada |
| GET | `/api/alimentos-analytics/timeline/{id}` | Evolução temporal |
| POST | `/api/alimentos-analytics/combinacoes` | Combinações efetivas |
| POST | `/api/alimentos-analytics/recomendar` | Recomendação ML |
| POST | `/api/alimentos-analytics/comparar` | Comparação entre alimentos |
| POST | `/api/alimentos-analytics/export/excel` | Exportação CSV |

**Características:**
- Autorização obrigatória (`[Authorize]`)
- Filtragem por tenant automática
- Queries otimizadas com LINQ
- Tratamento de erros robusto
- Logging estruturado

**Queries Principais:**

```csharp
// Busca dietas com consultas antes/depois
from di in _context.Set<DietaItem>()
join a in _context.Set<Alimento>() on di.AlimentoId equals a.Id
join d in _context.Set<Dieta>() on di.DietaId equals d.Id
join rn in _context.Set<RecemNascido>() on d.RecemNascidoId equals rn.Id
where tenantIds.Contains(rn.TenantId)
  && d.DataInicio >= dataInicio
  && d.DataInicio <= dataFim
```

**Cálculo de Métricas:**

```csharp
private async Task<(double MediaGanhoPeso, double MediaDeltaZScore, 
                     double TaxaSucesso, int DiasAcompanhamentoMedio)> 
    CalcularMetricasAlimento(List<Guid> criancaIds, DateTime inicio, DateTime fim)
{
    // Para cada criança:
    // 1. Buscar primeira e última consulta no período
    // 2. Calcular Δ Z-Score = Z_final - Z_inicial
    // 3. Calcular ganho peso = (peso_final - peso_inicial) / dias
    // 4. Sucesso = Δ Z-Score > 0
    // 5. Agregar médias
}
```

---

#### 3. `Services/MLService.cs` (atualizado)
**Adicionado:**
- `RecommendFoodsAsync()`: Chama Python ML para recomendações

**Payload Enviado:**
```json
{
  "perfil": {
    "idade_gestacional_semanas": 32,
    "peso_atual_gr": 1500,
    "sexo": "M",
    "classificacao_ig": "prematuro_muito",
    "classificacao_peso": "PIG",
    "zscore_atual": -2.0,
    "dias_de_vida": 7
  },
  "top_n": 10
}
```

**Resposta Esperada:**
```json
{
  "crianca_perfil": { ... },
  "alimentos_recomendados": [
    {
      "alimento_id": "uuid",
      "nome": "Fórmula Pré-termo",
      "categoria": "formula",
      "probabilidade_sucesso": 0.85,
      "energia_kcal_por_100": 81,
      "proteina_g_por_100": 2.4,
      "ranking": 1,
      "justificativa": "Alta probabilidade..."
    }
  ],
  "timestamp": "2025-12-01T..."
}
```

---

## Python ML - Food Recommender

### Arquivos Criados

#### 1. `ml-service/app/models/food_recommender.py`
**Propósito:** Modelo de ML para recomendação de alimentos

**Classe Principal:** `FoodRecommender`

**Métodos:**

##### `get_food_usage_data() -> DataFrame`
Extrai dados de uso de alimentos com resultados:
```sql
SELECT 
    a.Id, a.Nome, a.Categoria, a.EnergiaKcalPor100, a.ProteinaGPor100,
    rn.Sexo, rn.IdadeGestacionalSemanas, rn.PesoNascimentoGr,
    rn.ClassificacaoIG, rn.ClassificacaoPN,
    c_inicial.ZScorePeso, c_final.ZScorePeso,
    DATEDIFF(day, c_inicial.DataHora, c_final.DataHora) as DiasAcompanhamento
FROM nutricao.Alimento a
INNER JOIN nutricao.DietaItem di ON a.Id = di.AlimentoId
INNER JOIN nutricao.Dieta d ON di.DietaId = d.Id
INNER JOIN clinica.RecemNascido rn ON d.RecemNascidoId = rn.Id
CROSS APPLY (
    SELECT TOP 1 * FROM clinica.Consulta
    WHERE RecemNascidoId = rn.Id 
    AND DataHora >= d.DataInicio
    AND ZScorePeso IS NOT NULL
    ORDER BY DataHora
) c_inicial
CROSS APPLY (
    SELECT TOP 1 * FROM clinica.Consulta
    WHERE RecemNascidoId = rn.Id 
    AND DataHora > c_inicial.DataHora
    AND DATEDIFF(day, c_inicial.DataHora, DataHora) BETWEEN 7 AND 21
    AND ZScorePeso IS NOT NULL
    ORDER BY DataHora
) c_final
```

##### `prepare_features(df) -> DataFrame`
Prepara features para ML:
- **Features da Criança:**
  - `IdadeGestacionalSemanas`
  - `PesoNascimentoGr`
  - `SexoNumerico` (0=M, 1=F)
  - `DiasDeVida`
  - `ZScoreInicial`
  
- **Features do Alimento:**
  - `EnergiaKcalPor100`
  - `ProteinaGPor100`
  - `Quantidade`
  - `EhPreTermo`
  
- **Features da Dieta:**
  - `TaxaEnergeticaKcalKg`
  - `MetaProteinaGKg`

- **One-Hot Encoding:**
  - `ClassificacaoIG` → `ClassIG_prematuro_extremo`, `ClassIG_termo`, etc.
  - `ClassificacaoPeso` → `ClassPeso_PIG`, `ClassPeso_AIG`, `ClassPeso_GIG`
  - `Categoria` → `Cat_leite`, `Cat_formula`, etc.

- **Target:**
  - `Sucesso` = 1 se `DeltaZScore > 0`, senão 0

##### `train(horizonte_dias=14) -> Dict`
Treina modelo de classificação:
```python
# Modelo: RandomForestClassifier
self.model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42
)

# Treina: X (features) → y (sucesso)
self.model.fit(X, y)

# Valida com cross-validation (k=5)
cv_scores = cross_val_score(self.model, X, y, cv=5)
```

**Métricas Calculadas:**
- `accuracy`: Acurácia no conjunto de treino
- `cv_accuracy_mean`: Acurácia média em validação cruzada
- `cv_accuracy_std`: Desvio padrão da validação cruzada
- `n_samples`: Número de amostras
- `n_alimentos`: Número de alimentos únicos
- `n_features`: Número de features

##### `recommend_foods(crianca_perfil, top_n=10) -> List[Dict]`
Gera recomendações para um perfil:

**Processo:**
1. Buscar todos os alimentos ativos no banco
2. Para cada alimento:
   - Combinar perfil da criança + características do alimento
   - Criar features (mesmo formato do treinamento)
   - Predizer `P(sucesso)` usando modelo treinado
3. Ordenar alimentos por `P(sucesso)` (decrescente)
4. Retornar top N com ranking e justificativa

**Justificativas Automáticas:**
- Probabilidade > 70% → "Alta probabilidade de sucesso..."
- Probabilidade 50-70% → "Probabilidade moderada..."
- Probabilidade < 50% → "Probabilidade baixa - considerar outras opções"
- `EhPreTermo` + IG < 37 → "+ Indicado para pré-termo"
- Energia > 70 kcal → "+ Alto teor energético"
- Proteína > 2g → "+ Alto teor proteico"

##### `analyze_food_effectiveness(alimento_id, perfil_filter) -> Dict`
Analisa efetividade de alimento específico para perfil:
```python
# Retorna:
{
    'alimento_id': 'uuid',
    'total_usos': 45,
    'media_delta_zscore': 0.82,
    'media_ganho_peso': 18.5,  # g/dia
    'taxa_sucesso': 73.3  # %
}
```

---

#### 2. `ml-service/app/routers/food_analytics.py`
**Propósito:** Endpoints FastAPI para analytics de alimentos

**Endpoints:**

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/analytics/food-recommendation` | Recomenda alimentos |
| POST | `/api/v1/analytics/food-effectiveness` | Analisa efetividade |
| POST | `/api/v1/analytics/train-food-recommender` | Treina modelo |
| GET | `/api/v1/analytics/food-recommender-status` | Status do modelo |

**Schemas Pydantic:**
```python
class PerfilCrianca(BaseModel):
    idade_gestacional_semanas: float
    peso_atual_gr: int
    sexo: str
    classificacao_ig: Optional[str]
    classificacao_peso: Optional[str]
    zscore_atual: Optional[float]
    dias_de_vida: int

class FoodRecommendationRequest(BaseModel):
    perfil: PerfilCrianca
    top_n: int = 10

class AlimentoRecomendado(BaseModel):
    alimento_id: str
    nome: str
    categoria: str
    probabilidade_sucesso: float
    energia_kcal_por_100: float
    proteina_g_por_100: float
    ranking: int
    justificativa: str

class FoodRecommendationResponse(BaseModel):
    crianca_perfil: Dict[str, Any]
    alimentos_recomendados: List[AlimentoRecomendado]
    timestamp: datetime
```

**Tratamento de Erros:**
- Modelo não treinado → Treina automaticamente na primeira requisição
- Dados insuficientes → HTTP 400 com mensagem clara
- Erro de conexão DB → HTTP 500 com log detalhado

---

#### 3. `ml-service/app/main.py` (atualizado)
**Adicionado:**
```python
from app.routers import food_analytics

app.include_router(
    food_analytics.router,
    prefix=f"{settings.API_PREFIX}/analytics",
    tags=["Food Analytics"]
)
```

---

## Frontend React

### Arquivos Criados

#### 1. `routes/AlimentosAnalytics.tsx`
**Propósito:** Rota principal do dashboard

**Componentes:**
- PageHeader com ações (Filtros, Atualizar, Exportar CSV)
- Painel de filtros expansível
- Cards de resumo (Total Alimentos, Total Usos, Mais Usado, Melhor Resultado)
- Tabs para navegação entre funcionalidades
- Integração com componentes filhos

**State Management:**
```typescript
const [loading, setLoading] = useState(false);
const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
const [activeTab, setActiveTab] = useState<'performance' | 'recomendacao' | 'combinacoes' | 'timeline'>('performance');
const [selectedAlimentoId, setSelectedAlimentoId] = useState<string | null>(null);
const [filter, setFilter] = useState<Filter>({ ... });
const [showFilters, setShowFilters] = useState(false);
```

**API Calls:**
```typescript
// Carregar dashboard
const response = await api.post('/alimentos-analytics/dashboard', filter);

// Exportar CSV
const response = await api.post('/alimentos-analytics/export/excel', filter, {
  responseType: 'blob'
});
```

---

#### 2. `components/Alimentos/FoodPerformanceTable.tsx`
**Propósito:** Tabela de performance de alimentos

**Funcionalidades:**
- ✅ Ordenação por qualquer coluna (clique no header)
- ✅ Busca por nome de alimento
- ✅ Indicadores visuais:
  - Ícones de tendência (📈 verde, 📉 vermelho)
  - Barra de progresso para taxa de sucesso
  - Badge colorido de confiabilidade
- ✅ Botão "Ver Timeline" para cada alimento
- ✅ Formatação numérica correta

**State:**
```typescript
const [sortField, setSortField] = useState<SortField>('mediaDeltaZScore');
const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
const [searchTerm, setSearchTerm] = useState('');
```

**Ordenação:**
```typescript
const sortedData = [...performance]
  .filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  .sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });
```

---

#### 3. `components/Alimentos/FoodRecommender.tsx`
**Propósito:** Interface de recomendação ML

**Formulário:**
- Idade Gestacional (24-42 semanas)
- Peso Atual (500-5000g)
- Sexo (M/F)
- Classificação IG (select com 5 opções)
- Classificação Peso (PIG/AIG/GIG)
- Z-Score Atual (-5 a +5)
- Dias de Vida (0-365)
- Número de Recomendações (5-20)

**Visualização de Resultados:**
- Ranking visual (medalha dourada para top 3)
- Nome e categoria do alimento
- Probabilidade de sucesso (grande e colorida)
- Barra de progresso colorida
- Justificativa em card destacado
- Informações nutricionais

**Cores por Probabilidade:**
```typescript
const getProbabilidadeColor = (prob: number) => {
  if (prob >= 0.7) return "text-green-600";  // Alta
  if (prob >= 0.5) return "text-yellow-600"; // Média
  return "text-red-600";                     // Baixa
};
```

**API Call:**
```typescript
const payload = {
  perfil: {
    idade_gestacional_semanas: perfil.idadeGestacionalSemanas,
    peso_atual_gr: perfil.pesoAtualGr,
    sexo: perfil.sexo,
    classificacao_ig: perfil.classificacaoIG,
    classificacao_peso: perfil.classificacaoPeso,
    zscore_atual: perfil.zscoreAtual,
    dias_de_vida: perfil.diasDeVida,
  },
  top_n: perfil.topN,
};

const response = await api.post<RecommendationResponse>(
  '/alimentos-analytics/recomendar',
  payload
);
```

---

#### 4. `components/Alimentos/FoodCombinationAnalyzer.tsx`
**Propósito:** Análise de combinações de alimentos

**Visualização:**
- Cards de combinações com ranking
- Badges para cada alimento da combinação (estilo pill roxo)
- Métricas: Total Usos, Δ Z-Score, Taxa Sucesso
- Perfil predominante
- Indicador de performance:
  - 🌟 Altamente Recomendada (Δ > 0.5 e Taxa > 60%)
  - 📈 Efetiva (Δ > 0)
  - ⚠ Resultados Variados

**Layout:**
```tsx
<div className="grid gap-4">
  {combinacoes.map((comb, idx) => (
    <div className="bg-white border rounded-lg p-5">
      {/* Header com ranking */}
      {/* Badges de alimentos */}
      {/* Métricas */}
      {/* Indicador de performance */}
    </div>
  ))}
</div>
```

---

#### 5. `components/Alimentos/FoodTimeline.tsx`
**Propósito:** Evolução temporal de alimento

**Gráficos (Recharts):**

1. **Frequência de Uso** (ComposedChart + Area):
```tsx
<ComposedChart data={chartData}>
  <Area type="monotone" dataKey="usos" fill="#3B82F6" stroke="#2563EB" />
</ComposedChart>
```

2. **Δ Z-Score ao Longo do Tempo** (LineChart):
```tsx
<LineChart data={chartData}>
  <Line type="monotone" dataKey="deltaZScore" stroke="#10B981" strokeWidth={2} />
</LineChart>
```

3. **Ganho de Peso Médio** (LineChart):
```tsx
<LineChart data={chartData}>
  <Line type="monotone" dataKey="ganhoPeso" stroke="#8B5CF6" strokeWidth={2} />
</LineChart>
```

**Cards de Resumo:**
- Total de Usos (azul)
- Δ Z-Score Médio (verde/vermelho)
- Ganho Peso Médio (roxo)

**Insights Automáticos:**
```tsx
{mediaDeltaGeral > 0.5 && <li>✓ Resultados consistentemente positivos</li>}
{totalUsos > 50 && <li>✓ Alimento amplamente utilizado</li>}
{timeline.length >= 6 && <li>✓ Histórico longo permite análise robusta</li>}
{mediaDeltaGeral < 0 && <li>⚠ Resultados abaixo do esperado</li>}
```

---

#### 6. `main.tsx` (atualizado)
**Adicionado:**
```typescript
import AlimentosAnalytics from "./routes/AlimentosAnalytics";

// ...

<Route
  path="/alimentos/analytics"
  element={
    <RequireAuth>
      <Layout>
        <AlimentosAnalytics />
      </Layout>
    </RequireAuth>
  }
/>
```

---

## Fluxo de Dados Completo

### 1. Carregar Dashboard
```
User → Frontend → POST /api/alimentos-analytics/dashboard
                ↓
            C# Controller
                ↓
         Query LINQ → SQL Server
                ↓
        Calcular Métricas
                ↓
         JSON Response → Frontend
                ↓
          Renderizar Cards + Tabs
```

### 2. Recomendação ML
```
User preenche perfil → Frontend
                         ↓
          POST /api/alimentos-analytics/recomendar
                         ↓
                  C# Controller
                         ↓
          POST http://ml-service:8000/api/v1/analytics/food-recommendation
                         ↓
              Python FoodRecommender
                         ↓
        Query alimentos + Predict P(sucesso)
                         ↓
           Rankear + Gerar Justificativas
                         ↓
            JSON Response → C# → Frontend
                         ↓
              Renderizar Lista Ranqueada
```

### 3. Exportar CSV
```
User clica "Exportar" → POST /api/alimentos-analytics/export/excel
                           ↓
                    C# Controller
                           ↓
                  Query performance data
                           ↓
                    Gerar CSV string
                           ↓
                 Return File(bytes, "text/csv")
                           ↓
          Frontend: Download automático
```

---

## Modelos de Dados

### Dashboard Completo
```typescript
interface FoodAnalyticsDashboard {
  periodoInicio: string;
  periodoFim: string;
  totalAlimentos: number;
  totalUsos: number;
  performance: AlimentoPerformance[];
  melhoresCombinacoes: CombinacaoAlimentos[];
  alimentoMaisUsado: AlimentoPerformance | null;
  alimentoMelhorResultado: AlimentoPerformance | null;
}
```

### Performance de Alimento
```typescript
interface AlimentoPerformance {
  alimentoId: string;
  nome: string;
  categoria: string;
  totalUsos: number;
  totalCriancas: number;
  mediaGanhoPesoGrDia: number;
  mediaDeltaZScore: number;
  taxaSucesso: number;  // %
  mediaEnergiaKcal: number;
  mediaProteinaG: number;
  diasAcompanhamentoMedio: number;
  confiabilidade: "alta" | "media" | "baixa";
}
```

### Combinação de Alimentos
```typescript
interface CombinacaoAlimentos {
  alimentoIds: string[];
  nomesAlimentos: string[];
  totalUsos: number;
  mediaDeltaZScore: number;
  taxaSucesso: number;
  perfilCrianca: string;
}
```

### Recomendação ML
```typescript
interface AlimentoRecomendado {
  alimentoId: string;
  nome: string;
  categoria: string;
  probabilidadeSucesso: number;  // 0-1
  deltaZScoreEsperado: number;
  ranking: number;
  justificativa: string;
  energiaKcalPor100: number;
  proteinaGPor100: number;
}
```

---

## Performance e Otimizações

### Backend C#
✅ **Queries LINQ otimizadas**
- Joins eficientes
- Filtros aplicados antes de materializar
- Uso de `CROSS APPLY` para subconsultas

✅ **Paginação e Limites**
- Timeline agrupada por mês (não por dia)
- Combinações limitadas a top 20
- Métricas limitam a 100 crianças por alimento

✅ **Caching (futuro)**
- Considerar cache Redis para dashboard
- TTL de 1 hora (dados analíticos não precisam ser real-time)

### Python ML
✅ **Modelo em Memória**
- Singleton `_food_recommender`
- Carregado uma vez, reutilizado

✅ **Predições Batch**
- Prediz para todos os alimentos de uma vez (não um por um)

✅ **Modelo Leve**
- RandomForest com 100 árvores (balanceado)
- Max depth 10 (evita overfitting)

### Frontend
✅ **State Management**
- Estado local com hooks
- Não precisa de Redux (escopo limitado)

✅ **Lazy Loading**
- Timeline só carrega quando usuário clica
- Recomendações só quando usuário solicita

✅ **Memoization (futuro)**
- `useMemo` para cálculos pesados
- `React.memo` para componentes de lista

---

## Testing

### Backend C#
**Endpoints a Testar:**
```bash
# Dashboard completo
POST /api/alimentos-analytics/dashboard
Body: { "dataInicio": "2024-06-01", "dataFim": "2024-12-01" }

# Performance filtrada
POST /api/alimentos-analytics/performance
Body: { "tipoCrianca": "pretermo", "idadeGestacionalMin": 28, "idadeGestacionalMax": 32 }

# Timeline
GET /api/alimentos-analytics/timeline/{guid}?dataInicio=2024-01-01

# Recomendação
POST /api/alimentos-analytics/recomendar
Body: {
  "idadeGestacionalSemanas": 32,
  "pesoAtualGr": 1500,
  "sexo": "M",
  "classificacaoIG": "prematuro_muito",
  "classificacaoPeso": "PIG",
  "zscoreAtual": -2.0,
  "diasDeVida": 7,
  "topN": 10
}

# Exportar CSV
POST /api/alimentos-analytics/export/excel
Body: { "dataInicio": "2024-06-01", "dataFim": "2024-12-01" }
```

### Python ML
**Treinar Modelo:**
```bash
cd ml-service

# Via código Python
python -c "from app.models.food_recommender import get_food_recommender; r = get_food_recommender(); print(r.train())"

# Via endpoint
curl -X POST http://localhost:8000/api/v1/analytics/train-food-recommender
```

**Testar Recomendação:**
```bash
curl -X POST http://localhost:8000/api/v1/analytics/food-recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "perfil": {
      "idade_gestacional_semanas": 32,
      "peso_atual_gr": 1500,
      "sexo": "M",
      "classificacao_ig": "prematuro_muito",
      "classificacao_peso": "PIG",
      "zscore_atual": -2.0,
      "dias_de_vida": 7
    },
    "top_n": 5
  }'
```

**Status do Modelo:**
```bash
curl http://localhost:8000/api/v1/analytics/food-recommender-status
```

### Frontend
**Acessar Dashboard:**
```
http://localhost:5173/alimentos/analytics
```

**Cenários de Teste:**

1. **Dashboard Inicial**
   - ✅ Carrega com dados padrão (últimos 6 meses)
   - ✅ Cards de resumo exibem valores corretos
   - ✅ Tabela de performance ordena corretamente

2. **Filtros**
   - ✅ Aplicar filtro de período
   - ✅ Filtrar apenas pré-termo
   - ✅ Limitar IG mínima/máxima

3. **Recomendação ML**
   - ✅ Preencher perfil completo
   - ✅ Submeter e ver recomendações
   - ✅ Verificar ranking e probabilidades

4. **Timeline**
   - ✅ Clicar em "Ver Timeline"
   - ✅ Gráficos renderizam corretamente
   - ✅ Insights automáticos aparecem

5. **Exportação**
   - ✅ Exportar CSV
   - ✅ Arquivo baixa automaticamente
   - ✅ Abrir no Excel e verificar colunas

---

## Deploy

### Estrutura de Arquivos
```
crescer-saudavel/
├── backend/
│   └── CrescerSaudavel.Api/
│       ├── Controllers/
│       │   └── AlimentosAnalyticsController.cs
│       ├── Models/
│       │   └── Analytics/
│       │       └── FoodAnalytics.cs
│       └── Services/
│           └── MLService.cs (atualizado)
│
├── ml-service/
│   └── app/
│       ├── models/
│       │   └── food_recommender.py
│       ├── routers/
│       │   └── food_analytics.py
│       └── main.py (atualizado)
│
├── frontend/
│   └── src/
│       ├── routes/
│       │   └── AlimentosAnalytics.tsx
│       ├── components/
│       │   └── Alimentos/
│       │       ├── FoodPerformanceTable.tsx
│       │       ├── FoodRecommender.tsx
│       │       ├── FoodCombinationAnalyzer.tsx
│       │       └── FoodTimeline.tsx
│       └── main.tsx (atualizado)
│
└── docs/
    ├── DASHBOARD_ALIMENTOS_GUIA.md
    └── DASHBOARD_ALIMENTOS_IMPLEMENTACAO.md
```

### Passos de Deploy

#### 1. Backend C#
```bash
cd backend/CrescerSaudavel.Api
dotnet build
dotnet run
```

#### 2. Python ML
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

#### 4. Treinar Modelo (primeira vez)
```bash
# Via API
curl -X POST http://localhost:8000/api/v1/analytics/train-food-recommender

# Ou via código
cd ml-service
python -c "from app.models.food_recommender import get_food_recommender; get_food_recommender().train()"
```

---

## Troubleshooting

### Problema: Recomendações retornam erro 500
**Causa:** Modelo não treinado ou dados insuficientes  
**Solução:**
```bash
# Verificar status
curl http://localhost:8000/api/v1/analytics/food-recommender-status

# Re-treinar
curl -X POST http://localhost:8000/api/v1/analytics/train-food-recommender
```

### Problema: Dashboard vazio
**Causa:** Sem dados no período selecionado  
**Solução:**
- Ampliar período nos filtros
- Verificar se há consultas e dietas no banco
- Verificar se tenant está correto

### Problema: CSV não baixa
**Causa:** Browser bloqueando download ou erro no backend  
**Solução:**
- Verificar console do browser
- Testar endpoint diretamente (Postman)
- Verificar logs do backend

---

## Próximos Passos e Melhorias

### Curto Prazo
- [ ] Implementar exportação PDF (não apenas CSV)
- [ ] Adicionar mais filtros (classificações multi-select)
- [ ] Criar SQL Views otimizadas para performance
- [ ] Adicionar testes unitários

### Médio Prazo
- [ ] Dashboard de monitoramento do modelo ML
- [ ] Feature importance (explicabilidade)
- [ ] A/B testing de recomendações
- [ ] Cache Redis para queries pesadas

### Longo Prazo
- [ ] Modelo de deep learning (LSTM/Transformer)
- [ ] Análise causal (não apenas correlação)
- [ ] Integração com outros sistemas hospitalares
- [ ] Mobile app para acessar analytics

---

## Conclusão

Implementação completa de um sistema híbrido (estatística + ML) para análise de alimentos no contexto de nutrição neonatal. O dashboard fornece insights acionáveis para profissionais de saúde tomarem decisões baseadas em dados, mantendo o julgamento clínico como prioridade.

**Status:** ✅ Implementado e funcional  
**Próximo passo:** Treinar modelo ML com dados reais e validar com equipe médica

---

**Desenvolvido por:** Equipe Crescer Saudável  
**Data:** Dezembro 2025  
**Versão:** 1.0

