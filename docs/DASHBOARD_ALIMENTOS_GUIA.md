# Dashboard de Análise de Alimentos - Guia de Uso

## Visão Geral

O Dashboard de Análise de Alimentos é uma ferramenta completa para avaliar a efetividade de alimentos e suas combinações no tratamento nutricional de recém-nascidos. Combina análise estatística tradicional com recomendações baseadas em Machine Learning.

## Acesso

**URL:** `/alimentos/analytics`

**Permissões:** Requer autenticação. Disponível para todos os profissionais de saúde autenticados.

---

## Funcionalidades Principais

### 1. Performance de Alimentos

Visualize métricas agregadas de cada alimento utilizado:

#### Métricas Exibidas:
- **Total de Usos**: Quantas vezes o alimento foi prescrito em dietas
- **Total de Crianças**: Número de pacientes que utilizaram o alimento
- **Ganho de Peso Médio**: g/dia durante o período de acompanhamento
- **Δ Z-Score Médio**: Mudança média no Z-Score de peso
- **Taxa de Sucesso**: % de casos onde o Z-Score melhorou (Δ > 0)
- **Confiabilidade**: Alta (≥30 casos), Média (10-29 casos), Baixa (<10 casos)

#### Funcionalidades:
- ✅ **Ordenação**: Clique nos cabeçalhos das colunas para ordenar
- ✅ **Busca**: Campo de busca para filtrar alimentos por nome
- ✅ **Ver Timeline**: Botão para visualizar evolução temporal de cada alimento

#### Interpretação:
- **Δ Z-Score > +0.5**: Excelente resultado (ícone verde 📈)
- **Δ Z-Score 0 a +0.5**: Resultado positivo (neutro)
- **Δ Z-Score < 0**: Resultado negativo (ícone vermelho 📉)
- **Taxa de Sucesso > 60%**: Alimento confiável
- **Confiabilidade Alta**: Resultados estatisticamente robustos

---

### 2. Recomendação Inteligente (ML)

Sistema de recomendação baseado em Machine Learning que sugere alimentos para um perfil específico de criança.

#### Como Usar:

1. **Preencha o Perfil da Criança:**
   - Idade Gestacional (semanas)
   - Peso Atual (gramas)
   - Sexo (M/F)
   - Classificação IG (Pré-termo Extremo, Muito, Moderado, Tardio, A Termo)
   - Classificação de Peso (PIG/AIG/GIG)
   - Z-Score Atual
   - Dias de Vida
   - Número de Recomendações (Top N)

2. **Clique em "Recomendar Alimentos com IA"**

3. **Analise os Resultados:**
   - Lista ranqueada de alimentos
   - **Probabilidade de Sucesso**: % de chance de resultado positivo
   - **Ranking**: Posição do alimento (1º = melhor)
   - **Justificativa**: Explicação da recomendação baseada em:
     - Histórico de casos similares
     - Características nutricionais
     - Indicação para pré-termo
     - Teor energético e proteico

#### Interpretação das Probabilidades:
- **≥ 70%**: Alta probabilidade (verde) - Altamente recomendado
- **50-69%**: Probabilidade moderada (amarelo) - Bom candidato
- **< 50%**: Probabilidade baixa (vermelho) - Considerar alternativas

#### Importante:
- ⚠️ A recomendação é baseada em dados históricos e deve ser usada como **ferramenta de apoio**, não substituindo o julgamento clínico
- O modelo aprende com os dados do sistema, portanto a qualidade melhora com o uso

---

### 3. Combinações Efetivas

Analisa combinações de alimentos que foram usadas em conjunto e apresentaram bons resultados.

#### O que são Combinações?
Dietas que contêm 2 ou mais alimentos diferentes. O sistema identifica padrões de sucesso nessas combinações.

#### Informações Exibidas:
- **Alimentos da Combinação**: Lista dos alimentos usados juntos
- **Total de Usos**: Quantas vezes essa combinação foi aplicada
- **Δ Z-Score Médio**: Resultado médio da combinação
- **Taxa de Sucesso**: % de casos bem-sucedidos
- **Perfil da Criança**: Classificação IG predominante

#### Badges de Destaque:
- 🌟 **Altamente Recomendada**: Δ Z-Score > 0.5 e Taxa Sucesso > 60%
- 📈 **Efetiva**: Δ Z-Score > 0
- ⚠️ **Resultados Variados**: Avaliar perfil específico

#### Como Usar:
1. Identifique combinações com alto Δ Z-Score
2. Verifique se o perfil da criança corresponde ao perfil da combinação
3. Use como referência para criar planos nutricionais completos

---

### 4. Evolução Temporal

Visualiza como o uso e os resultados de um alimento específico mudaram ao longo do tempo.

#### Como Acessar:
1. Na aba "Performance de Alimentos", clique em "Ver Timeline" em qualquer alimento
2. Ou selecione a aba "Evolução Temporal" após escolher um alimento

#### Gráficos Disponíveis:
1. **Frequência de Uso**: Quantas vezes o alimento foi prescrito por mês
2. **Δ Z-Score ao Longo do Tempo**: Tendência de efetividade
3. **Ganho de Peso Médio**: Velocidade de ganho (g/dia) por período

#### Métricas de Resumo:
- Total de usos no período
- Δ Z-Score médio geral
- Ganho de peso médio geral

#### Insights Automáticos:
- ✓ Resultados consistentemente positivos
- ✓ Alta confiabilidade (muito usado)
- ✓ Histórico longo permite análise robusta
- ⚠ Resultados abaixo do esperado

---

## Filtros de Análise

### Filtros Disponíveis:

1. **Período**
   - Data Início / Data Fim
   - Padrão: últimos 6 meses

2. **Tipo de Criança**
   - Todos
   - Pré-termo (IG < 37 semanas)
   - A Termo (IG ≥ 37 semanas)

3. **Idade Gestacional**
   - IG Mínima (semanas): 24-42
   - IG Máxima (semanas): 24-42

4. **Classificações** (em desenvolvimento)
   - Classificações IG (multi-select)
   - Classificações de Peso (multi-select)

### Como Aplicar Filtros:
1. Clique no botão "Filtros"
2. Ajuste os valores desejados
3. Clique em "Aplicar Filtros"
4. Os dados são recarregados automaticamente

---

## Exportação de Dados

### Exportar CSV
- Botão: "Exportar CSV" no topo da página
- Conteúdo: Tabela completa de performance de alimentos
- Formato: CSV compatível com Excel
- Colunas: Alimento, Categoria, Total Usos, Total Crianças, Ganho Peso, Δ Z-Score, Taxa Sucesso, Energia, Proteína, Confiabilidade

### Uso do CSV:
- Abrir no Excel para análises adicionais
- Criar apresentações e relatórios
- Backup de dados analíticos

---

## Casos de Uso Práticos

### Caso 1: Escolher Alimento para Pré-termo Extremo PIG

**Objetivo:** Encontrar o melhor alimento para um bebê de 28 semanas, 900g, PIG, Z-Score -2.5

**Passos:**
1. Ir para aba "Recomendação Inteligente"
2. Preencher:
   - IG: 28 semanas
   - Peso: 900g
   - Sexo: M
   - Classificação IG: Pré-termo Muito (28-32sem)
   - Classificação Peso: PIG
   - Z-Score: -2.5
   - Dias de Vida: 3
3. Clicar em "Recomendar"
4. Analisar top 3 recomendações
5. Verificar justificativas
6. Consultar "Performance de Alimentos" para confirmar dados históricos

---

### Caso 2: Comparar Leite Materno vs Fórmula Pré-termo

**Objetivo:** Decidir entre diferentes opções de alimentos

**Passos:**
1. Ir para aba "Performance de Alimentos"
2. Buscar "Leite Materno"
3. Observar métricas: Δ Z-Score, Taxa Sucesso, Confiabilidade
4. Buscar "Fórmula Pré-termo"
5. Comparar lado-a-lado
6. Clicar em "Ver Timeline" para cada um
7. Analisar tendências temporais
8. Tomar decisão baseada em dados

---

### Caso 3: Criar Dieta Combinada Efetiva

**Objetivo:** Montar plano nutricional com múltiplos alimentos

**Passos:**
1. Ir para aba "Combinações Efetivas"
2. Filtrar por perfil da criança (pré-termo, termo, etc)
3. Identificar combinações com:
   - Alto Δ Z-Score (> +0.5)
   - Alta Taxa de Sucesso (> 60%)
   - Badge "Altamente Recomendada"
4. Anotar os alimentos da combinação
5. Criar nova dietoterapia usando esses alimentos
6. Monitorar resultados

---

### Caso 4: Investigar Alimento com Resultados Ruins

**Objetivo:** Entender por que um alimento não está funcionando

**Passos:**
1. Ir para "Performance de Alimentos"
2. Ordenar por "Δ Z-Score" (ascendente)
3. Identificar alimentos com valores negativos
4. Clicar em "Ver Timeline"
5. Analisar:
   - Houve mudança ao longo do tempo?
   - Poucos usos = baixa confiabilidade?
   - Usado em perfil inadequado?
6. Considerar:
   - Trocar o alimento
   - Ajustar quantidade
   - Verificar protocolo de aplicação

---

## Treinamento do Modelo ML

### Quando Treinar:
- Após inserir novos dados (consultas, dietas)
- Periodicamente (mensal/trimestral)
- Quando recomendações parecem desatualizadas

### Como Treinar (Administrador):
O modelo é treinado automaticamente no backend Python. Para re-treinar manualmente:

```bash
# Acessar container ML
cd ml-service

# Treinar modelo de recomendação
python -c "from app.models.food_recommender import get_food_recommender; get_food_recommender().train(); print('Treinamento concluído!')"
```

### Requisitos Mínimos:
- Pelo menos 50 registros de dietas com consultas antes/depois
- Dados de múltiplos alimentos (≥10 diferentes)
- Distribuição equilibrada de perfis

---

## Troubleshooting

### Problema: "Erro ao processar recomendação"
**Solução:**
- Modelo ML pode não estar treinado
- Entrar em contato com administrador
- Verificar logs do serviço ML

### Problema: Dados vazios ou poucos resultados
**Solução:**
- Ajustar filtros de período (ampliar intervalo)
- Verificar se há consultas registradas no período
- Confirmar que dietas têm alimentos associados

### Problema: Baixa confiabilidade em todos os alimentos
**Solução:**
- Sistema precisa de mais dados
- Continuar registrando consultas e dietas
- Aguardar acúmulo de pelo menos 30 casos por alimento

### Problema: Recomendações não fazem sentido clínico
**Solução:**
- Modelo pode estar desatualizado (re-treinar)
- Perfil da criança pode ser muito atípico
- Sempre validar com julgamento clínico
- Reportar casos ao administrador para melhoria

---

## Métricas e Indicadores

### Como Interpretar Z-Score:
- **Z-Score < -2**: Desnutrição
- **Z-Score -2 a -1**: Abaixo do peso
- **Z-Score -1 a +1**: Normal
- **Z-Score > +1**: Acima do peso

### Como Interpretar Δ Z-Score:
- **Δ > +1.0**: Catch-up excelente
- **Δ +0.5 a +1.0**: Bom progresso
- **Δ 0 a +0.5**: Progresso moderado
- **Δ < 0**: Necessário intervenção

### Como Interpretar Taxa de Sucesso:
- **> 80%**: Alimento muito confiável
- **60-80%**: Alimento confiável
- **40-60%**: Resultados mistos
- **< 40%**: Revisar uso ou indicação

---

## Limitações e Considerações

### Limitações Técnicas:
1. **Dados Retrospectivos**: Análise baseada em dados passados, não garante resultados futuros
2. **Variáveis Confundidoras**: Outros fatores podem influenciar resultados (comorbidades, cuidados gerais, etc)
3. **Tamanho da Amostra**: Alimentos com poucos usos têm baixa confiabilidade estatística
4. **Viés de Seleção**: Alimentos podem ser prescritos preferencialmente para certos perfis

### Boas Práticas:
✅ Use como ferramenta de apoio à decisão, não substituição do julgamento clínico
✅ Considere o contexto individual de cada paciente
✅ Combine dados quantitativos com avaliação qualitativa
✅ Registre consultas e dietas consistentemente para melhorar a qualidade dos dados
✅ Revisite decisões periodicamente com novos dados

---

## Suporte e Feedback

Para dúvidas, sugestões ou reportar problemas:
- Entre em contato com a equipe de TI
- Documente casos específicos onde as recomendações não funcionaram
- Sugira novas métricas ou funcionalidades

---

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025  
**Desenvolvido por:** Equipe Crescer Saudável

