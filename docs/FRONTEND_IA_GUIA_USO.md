# 🎨 Frontend de IA - Guia de Uso

## 🎯 Visão Geral

O **Módulo de IA** agora possui interface completa integrada ao sistema Crescer Saudável, permitindo que profissionais de saúde acessem predições, comparações e insights de forma visual e intuitiva.

---

## 📍 Como Acessar

### Opção 1: Via Detalhes da Criança

1. Acesse a lista de pacientes (`/criancas`)
2. Clique em um paciente
3. Na tela de detalhes, clique no botão **"Insights de IA"** (roxo, com ícone de cérebro)

### Opção 2: Via URL Direta

```
/criancas/{criancaId}/ia-insights
```

Exemplo:
```
http://localhost:5173/criancas/86e759ac-1e72-423d-b33e-0006c14389af/ia-insights
```

---

## 🎨 Interface e Funcionalidades

### 1. **Dashboard Principal**

Ao acessar os Insights de IA, você verá:

#### 📊 Resumo do Paciente
- Nome, sexo, idade gestacional
- Peso atual e nascimento
- Z-Score atual
- Dieta em uso
- Classificação (IG e PN)

#### ⚠️ Aviso Importante
Destaque visual lembrando que a IA é ferramenta de apoio, não substitui avaliação clínica.

---

### 2. **Aba: Predição de Crescimento**

**O que faz:** Prediz a mudança no z-score em N dias para um cenário de dieta específico.

#### Como Usar:

1. **Configure o Cenário de Dieta:**
   - Taxa Energética (80-200 kcal/kg/dia)
   - Meta Proteína (1.5-5.0 g/kg/dia)
   - Horizonte (7, 14, 21 ou 28 dias)

2. **Clique em "Gerar Predição"**

3. **Veja os Resultados:**
   - **Δ Z-Score Previsto**: Mudança esperada (ex: +22.77)
   - **Probabilidade de Melhora**: Chance de sucesso (ex: 100%)
   - **Confiabilidade**: Alta, Média ou Baixa
   - **Gráfico de Projeção**: Visualização da evolução esperada
   - **Recomendação**: Texto explicativo do sistema

#### Interpretação:

| Δ Z-Score | Significado |
|-----------|-------------|
| **> 10** | ✅ Excelente crescimento esperado |
| **5 a 10** | ✓ Bom crescimento |
| **0 a 5** | ⚠️ Crescimento modesto |
| **< 0** | ❌ Risco de piora |

#### Exemplo Visual:

```
┌─────────────────────────────────────────┐
│ Δ Z-SCORE PREVISTO                      │
│                                         │
│         +22.77                          │
│         em 14 dias                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ PROBABILIDADE DE MELHORA                │
│                                         │
│         100%                            │
│ ████████████████████████████████ 100%  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CONFIABILIDADE                          │
│                                         │
│         BAIXA                           │
│ Dados insuficientes                     │
└─────────────────────────────────────────┘
```

---

### 3. **Aba: Comparação de Cenários**

**O que faz:** Compara múltiplas estratégias de dieta e ranqueia pela expectativa de resultado.

#### Como Usar:

1. **Revise os Cenários Padrão:**
   - Conservadora: 100 kcal/kg, 3.0 g/kg
   - Moderada: 120 kcal/kg, 3.5 g/kg
   - Agressiva: 140 kcal/kg, 4.0 g/kg

2. **Customize ou Adicione Cenários:**
   - Edite nome, energia, proteína, frequência
   - Clique em "+ Adicionar Cenário" (máx: 10)
   - Remova cenários desnecessários

3. **Clique em "Comparar X Cenários"**

4. **Analise o Ranking:**
   - 🥇 #1: Melhor cenário (bordado em dourado)
   - 🥈 #2: Segundo melhor
   - 🥉 #3: Terceiro melhor
   - Score combina: Δ Z-Score + Probabilidade + Confiabilidade

#### Exemplo de Resultado:

```
┌─────────────────────────────────────────────────┐
│ 🥇 #1 - MODERADA                  Score: 85.0   │
│ 120 kcal/kg • 3.5 g/kg proteína                 │
├─────────────────────────────────────────────────┤
│ Δ Z-Score: +7.87                                │
│ Prob. Melhora: 100%                             │
│ Confiabilidade: BAIXA                           │
├─────────────────────────────────────────────────┤
│ ✅ Este é o cenário mais promissor baseado      │
│    nos dados históricos                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🥈 #2 - AGRESSIVA                 Score: 85.0   │
│ 140 kcal/kg • 4.0 g/kg proteína                 │
├─────────────────────────────────────────────────┤
│ Δ Z-Score: +7.71                                │
│ Prob. Melhora: 99%                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🥉 #3 - CONSERVADORA              Score: 85.0   │
│ 100 kcal/kg • 3.0 g/kg proteína                 │
├─────────────────────────────────────────────────┤
│ Δ Z-Score: +7.08                                │
│ Prob. Melhora: 98%                              │
└─────────────────────────────────────────────────┘
```

---

### 4. **Aba: Casos Similares**

**O que faz:** Busca no histórico pacientes com perfil similar que tiveram bons resultados.

#### Como Usar:

1. **Selecione Quantos Casos Ver:**
   - 5, 10 ou 20 casos

2. **Analise os Cards:**
   - **Score de Similaridade**: 60-100% (quanto maior, mais parecido)
   - **Dados do Paciente**: IG, peso nascimento, sexo
   - **Dieta Utilizada**: Energia e proteína
   - **Resultado Alcançado**: Δ Z-Score real
   - **Acompanhamento**: Dias de follow-up

3. **Veja Estatísticas Resumidas:**
   - Total de casos
   - Ganho médio z-score
   - Energia média
   - Proteína média

#### Interpretação:

| Similaridade | Significado |
|--------------|-------------|
| **≥ 80%** | 🟢 Muito similar - referência forte |
| **60-79%** | 🔵 Moderadamente similar |
| **< 60%** | 🟡 Pouco similar - use com cautela |

#### Exemplo de Card:

```
┌──────────────────────────────────────────┐
│ #1   CASO SIMILAR         85% similar    │
│      Masculino • RNPTM                   │
├──────────────────────────────────────────┤
│ ⚪ IG: 32 semanas • Peso: 1.500 kg       │
│ 🍎 Dieta: 125 kcal/kg • 3.8 g/kg         │
│ 📅 Acompanhamento: 14 dias               │
├──────────────────────────────────────────┤
│ Ganho de Z-Score                         │
│      +15.20                              │
│                            📈             │
│ ✅ Excelente resultado                   │
└──────────────────────────────────────────┘
```

---

## 🚀 Fluxo de Trabalho Sugerido

### Para Avaliação de Dieta Atual:

1. Acesse **Predição de Crescimento**
2. Use os valores da dieta atual (já preenchidos)
3. Gere predição
4. Se Δ Z-Score < 5: considere ajuste

### Para Escolha de Nova Dieta:

1. Acesse **Comparação de Cenários**
2. Configure 3 opções possíveis
3. Compare resultados
4. Escolha o cenário #1 (melhor score)
5. Valide com **Casos Similares**

### Para Aprender com Histórico:

1. Acesse **Casos Similares**
2. Filtre por perfil do seu paciente
3. Veja dietas que funcionaram
4. Adapte para seu caso específico

---

## ⚠️ Avisos e Limitações

### 1. **IA é Ferramenta de Apoio**
```
⚠️ As predições NÃO substituem:
- Exame físico
- Avaliação clínica
- Julgamento médico
- Protocolos institucionais
```

### 2. **Confiabilidade Baixa (Atual)**
```
⚠️ Modelos treinados com dados sintéticos
- Re-treinamento com dados reais necessário
- R² teste = 0.08 (baixo)
- Use apenas como referência inicial
```

### 3. **Dados Incompletos**
```
⚠️ Modelo não considera:
- Comorbidades
- Aleitamento materno
- Medicações
- Contexto familiar
```

---

## 🎯 Casos de Uso Reais

### Caso 1: RN Prematuro Extremo (30 semanas)

**Situação:** Peso 1.200g, 10 dias de vida, sem dieta definida.

**Ação:**
1. Ir para **Comparação de Cenários**
2. Testar:
   - Moderada: 120 kcal/kg, 3.5 g/kg
   - Agressiva RNPTE: 135 kcal/kg, 4.2 g/kg
3. Ver qual tem melhor expectativa
4. Conferir em **Casos Similares** se RNPTE usam ~135 kcal/kg

**Resultado Esperado:** Sistema sugere ~135 kcal/kg (padrão RNPTE)

---

### Caso 2: RN a Termo (40 semanas) com Baixo Ganho

**Situação:** Peso 3.400g ao nascer, 30 dias, ganhou apenas 200g.

**Ação:**
1. Ir para **Predição de Crescimento**
2. Testar aumento de 100 para 110 kcal/kg
3. Ver se Δ Z-Score melhora
4. Verificar **Casos Similares** com catch-up growth

**Resultado Esperado:** Sistema mostra melhora com aumento calórico

---

### Caso 3: Comparar Protocolo Institucional vs IA

**Situação:** Protocolo usa 120 kcal/kg, IA sugere 130 kcal/kg.

**Ação:**
1. **Comparação de Cenários** com ambos
2. Ver diferença de Score
3. **Casos Similares**: quantos usam cada um?
4. Decidir com equipe médica

**Resultado Esperado:** Dados para discussão embasada

---

## 🔧 Configurações e Personalização

### Ajustar Horizonte de Predição

**Quando usar cada um:**
- **7 dias**: Ajuste fino em curto prazo
- **14 dias**: Padrão (equilibrado)
- **21 dias**: Planejamento médio prazo
- **28 dias**: Avaliação mensal

### Número de Casos Similares

**Recomendação:**
- **5 casos**: Quick view
- **10 casos**: Padrão (boa amostra)
- **20 casos**: Análise detalhada

---

## 📊 Métricas e Monitoramento

### Performance do Sistema

**Tempo de Resposta:**
- Predição Rápida: 2-3s
- Comparação (3 cenários): 5-8s
- Casos Similares: 1-2s

**Disponibilidade:**
- Target: 99.5%
- Fallback: Se ML Service offline, mensagem clara

---

## 🐛 Troubleshooting

### Problema: "Serviço de IA temporariamente indisponível"

**Causa:** ML Service (Python) não está rodando.

**Solução:**
```bash
cd ml-service
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Problema: Predição demora muito (>10s)

**Causa:** Timeout ou problema de conexão.

**Solução:**
1. Verificar conexão com SQL Server
2. Aumentar timeout em `appsettings.json` (60s → 90s)
3. Verificar logs: `ml-service/ml-service.log`

---

### Problema: Δ Z-Score muito alto (>100)

**Causa:** Dados de entrada inválidos ou modelo com erro.

**Solução:**
1. Verificar se dieta está correta (80-200 kcal/kg)
2. Verificar se criança tem consultas registradas
3. Re-treinar modelo se necessário

---

## 📚 Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [MODULO_IA_COMPLETO.md](/docs/MODULO_IA_COMPLETO.md) | Documentação técnica completa |
| [GUIA_TESTE_MODULO_IA.md](/docs/GUIA_TESTE_MODULO_IA.md) | Guia de testes end-to-end |
| [COMO_USAR_MODULO_IA.md](/COMO_USAR_MODULO_IA.md) | Guia geral de uso (backend + frontend) |
| Swagger UI | http://localhost:8000/docs |

---

## ✅ Checklist de Validação

Antes de usar em produção:

### Interface
- [ ] Dashboard carrega corretamente
- [ ] Todas as 3 abas funcionam
- [ ] Botões de ação respondem
- [ ] Gráficos renderizam corretamente
- [ ] Avisos estão visíveis

### Funcionalidade
- [ ] Predição retorna resultados válidos
- [ ] Comparação ranqueia cenários
- [ ] Casos similares aparecem
- [ ] Tempo de resposta < 10s
- [ ] Erros são tratados gracefully

### Validação Clínica
- [ ] Equipe médica revisou interface
- [ ] Avisos são adequados
- [ ] Interpretação é clara
- [ ] Limitações estão evidentes

---

## 🎓 Treinamento de Usuários

### Para Profissionais de Saúde

**Duração:** 30 minutos

**Agenda:**
1. **Introdução (5 min)**: O que é IA no Crescer Saudável
2. **Navegação (5 min)**: Como acessar e navegar
3. **Predição (10 min)**: Como gerar e interpretar
4. **Comparação (5 min)**: Como comparar cenários
5. **Casos Similares (5 min)**: Como usar histórico

**Material de Apoio:**
- Este guia (PDF)
- Vídeo demonstrativo (a criar)
- FAQ (a criar)

---

## 🚀 Próximos Passos

### Melhorias Planejadas

1. **Gráficos Mais Ricos**
   - Intervalo de confiança sombreado
   - Comparação com curva WHO

2. **Exportação de Relatórios**
   - PDF com predições
   - Gráficos para prontuário

3. **Chat com IA (Fase 2)**
   - Perguntas em linguagem natural
   - Explicações personalizadas

4. **Histórico de Predições**
   - Salvar predições feitas
   - Comparar predito vs real

---

## 📞 Suporte

**Problemas Técnicos:**
- Verificar logs do navegador (F12)
- Verificar ML Service rodando
- Contatar equipe de TI

**Dúvidas Clínicas:**
- Consultar documentação completa
- Discutir com equipe médica
- Feedback para melhoria contínua

---

## 🎉 Conclusão

O **Frontend de IA** torna acessível e visual todo o poder preditivo do módulo de Machine Learning, permitindo que profissionais de saúde:

✅ Vejam predições de crescimento de forma clara  
✅ Comparem estratégias objetivamente  
✅ Aprendam com casos históricos  
✅ Tomem decisões mais embasadas em dados  

**Lembre-se:** A IA é uma **ferramenta de apoio**, não um substituto do julgamento clínico profissional.

---

**Desenvolvido por:** Vitor Santana  
**Data:** 01/12/2025  
**Versão:** 1.0.0

**"Dados transformados em insights, insights em melhores cuidados." 🩺📊🤖**

