# 💬 Chat IA Clínico - Guia de Uso

## Visão Geral

O **Chat IA Clínico** é um assistente virtual baseado em **OpenAI GPT-4** que permite fazer perguntas em linguagem natural sobre pacientes, obter análises e recomendações baseadas em dados.

---

## 🚀 Como Acessar

### Opção 1: Menu Principal
1. Clique em **"✨ Chat IA Clínico"** no menu lateral
2. Chat geral abrirá (sem contexto de paciente específico)

### Opção 2: A Partir de um Paciente
1. Entre nos detalhes de uma criança
2. Clique no botão **"✨ Chat IA"** (gradiente roxo-rosa)
3. Chat abrirá com contexto daquele paciente

### Opção 3: URL Direto
- Chat geral: `http://localhost:5193/chat-ia`
- Com paciente: `http://localhost:5193/chat-ia?criancaId=UUID`

---

## 💬 Como Usar

### Fazendo Perguntas

O chat aceita perguntas em **português natural**. Você não precisa usar comandos especiais.

**Exemplos de perguntas:**

```
👤 "Como está o crescimento do João nos últimos 30 dias?"

👤 "Qual a expectativa de crescimento da Maria nos próximos 14 dias?"

👤 "Quais alimentos recomendar para um bebê de 32 semanas IG e 1.400g?"

👤 "Mostre a dieta atual do paciente"

👤 "Quais casos similares tiveram bons resultados?"

👤 "Qual a média de ganho de peso para bebês pré-termo?"
```

### O que o Chat Pode Fazer

✅ **Dados do Paciente**
- Consultar informações demográficas
- Ver histórico de crescimento
- Verificar dieta atual

✅ **Predições de IA**
- Estimar crescimento futuro
- Calcular probabilidade de melhora
- Prever ganho de peso

✅ **Recomendações**
- Sugerir alimentos adequados
- Ranquear opções por efetividade
- Explicar justificativas

✅ **Casos Similares**
- Buscar pacientes com perfil semelhante
- Ver o que funcionou em casos parecidos
- Aprender com sucessos anteriores

✅ **Análises e Relatórios**
- Gerar resumos de evolução
- Comparar períodos
- Identificar tendências

---

## 🎨 Interface do Chat

### Layout

```
┌────────────────────────────────────────────────────────┐
│  ✨ Assistente IA Clínico              [🗑️]          │
│  Contexto: João Silva (se houver)                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│  🤖 [Mensagem de boas-vindas]                          │
│     08:30                                              │
│                                                         │
│                          [Sua pergunta] 👤             │
│                                     08:31              │
│                                                         │
│  🤖 [Resposta da IA com análise detalhada]            │
│     📋 [Botão copiar]                    08:31        │
│                                                         │
│  🤖 [Pensando...] ⏳                                   │
│                                                         │
├────────────────────────────────────────────────────────┤
│  ⚠️ Aviso: Este assistente fornece informações        │
│  baseadas em dados. Decisões clínicas devem ser       │
│  tomadas por profissionais qualificados.              │
├────────────────────────────────────────────────────────┤
│  [Digite sua mensagem...]              [Enviar ➤]     │
│  Pressione Enter para enviar                          │
└────────────────────────────────────────────────────────┘
```

### Elementos da Interface

**1. Header (Topo)**
- Ícone ✨ do assistente
- Nome do paciente (se houver contexto)
- Botão 🗑️ para limpar conversa

**2. Área de Mensagens (Centro)**
- Mensagens do usuário: **azul**, alinhadas à direita
- Mensagens da IA: **cinza**, alinhadas à esquerda
- Cada mensagem tem timestamp
- Mensagens da IA têm botão para copiar 📋

**3. Disclaimer (Aviso)**
- Faixa amarela com aviso médico
- Sempre visível como lembrete

**4. Input (Rodapé)**
- Campo de texto para digitar
- Botão "Enviar" ou tecla Enter
- Indicador "Pensando..." durante processamento

---

## 💡 Dicas de Uso

### Para Melhores Resultados

**✅ Seja Específico**
```
❌ "Como está o paciente?"
✅ "Como está o crescimento do João nos últimos 14 dias?"
```

**✅ Use Contexto**
```
❌ "Qual a dieta?"
✅ "Qual a dieta atual do paciente e está sendo efetiva?"
```

**✅ Pergunte Uma Coisa por Vez**
```
❌ "Como está o crescimento, qual dieta usar e quais casos similares?"
✅ "Como está o crescimento nos últimos 30 dias?"
   [Aguarda resposta]
   "Quais casos similares tiveram sucesso?"
```

### Funcionalidades Extras

**📋 Copiar Respostas**
- Clique no ícone de copiar em qualquer mensagem da IA
- Use para colar em prontuários ou relatórios

**🗑️ Limpar Conversa**
- Clique no ícone da lixeira no topo
- Útil para começar uma conversa nova

**Enter para Enviar**
- Pressione **Enter** para enviar
- Shift+Enter para quebra de linha (se precisar)

---

## 🔍 Exemplos de Uso Prático

### Exemplo 1: Análise de Crescimento

**Pergunta:**
```
"Como está o crescimento do João nos últimos 30 dias?"
```

**Resposta Esperada:**
```
🤖 Analisando os dados dos últimos 30 dias do paciente João:

📊 Crescimento:
• Peso: 1.500g → 1.820g (+320g, ganho de 10,7g/dia)
• Z-Score Peso: -2.2 → -1.9 (+0.3)
• Altura: 42cm → 44.5cm (+2.5cm)
• Z-Score Altura: -1.8 → -1.6 (+0.2)

✅ Avaliação: Crescimento EXCELENTE (catch-up growth)
📈 Velocidade acima da média esperada
💡 Dieta atual (120 kcal/kg + 3.5g/kg proteína) efetiva

⚠️ Recomendação: Manter conduta e reavaliar em 14 dias
```

### Exemplo 2: Predição com ML

**Pergunta:**
```
"Qual a expectativa de crescimento da Maria nos próximos 14 dias?"
```

**Resposta Esperada:**
```
🤖 Predição baseada em Machine Learning (2.994 casos):

🔮 Predição para 14 dias:
• Δ Z-Score esperado: +0.28 (IC 95%: 0.20 - 0.36)
• Probabilidade de melhora: 73%
• Ganho de peso estimado: 280-340g

📊 Confiança: ALTA (156 casos similares)

💡 Fatores positivos:
• Dieta adequada (125 kcal/kg)
• Sem intercorrências recentes
• Histórico de boa resposta

⚠️ Atenção:
• Reavaliar em caso de intolerância
• Monitorar desconforto abdominal
```

### Exemplo 3: Recomendação de Alimentos

**Pergunta:**
```
"Quais alimentos recomendar para Pedro (32 sem IG, 1.400g)?"
```

**Resposta Esperada:**
```
🤖 Recomendações baseadas em IA para Pedro:

🥇 Top 3 Alimentos:

1️⃣ Fórmula Pré-Termo 85kcal (92% sucesso)
   • 85 kcal/100ml | 2.2g proteína/100ml
   • Baseado em 287 casos similares
   • 💡 Opção ideal para este perfil

2️⃣ Leite Materno Fortificado (89% sucesso)
   • 72 kcal/100ml | 1.8g proteína/100ml
   • Baseado em 203 casos similares
   • 💡 Excelente se LM disponível

3️⃣ Fórmula Ext. Hidrolisada (85% sucesso)
   • 67 kcal/100ml | 1.9g proteína/100ml
   • Baseado em 156 casos similares
   • 💡 Considerar se intolerância
```

---

## ⚠️ Limitações e Avisos

### O Chat NÃO Substitui

❌ Avaliação clínica completa  
❌ Exame físico do paciente  
❌ Julgamento profissional  
❌ Protocolos institucionais  
❌ Discussão com equipe multidisciplinar

### O Chat É uma Ferramenta de Apoio

✅ Fornece informações baseadas em dados  
✅ Sugere opções baseadas em histórico  
✅ Identifica padrões e tendências  
✅ Economiza tempo em consultas de dados  
✅ Explica decisões da IA de forma clara

### Sempre Valide

⚠️ **Verifique os dados originais** se houver dúvida  
⚠️ **Considere o contexto completo** do paciente  
⚠️ **Use bom senso clínico** nas decisões  
⚠️ **Documente suas decisões** independentemente

---

## 🔧 Troubleshooting

### Problema: Chat não responde

**Causa**: API da OpenAI pode estar com problema

**Solução**:
1. Aguarde alguns segundos
2. Tente reenviar a mensagem
3. Verifique console do navegador (F12)
4. Se persistir, contate suporte técnico

### Problema: Resposta genérica demais

**Causa**: Falta de contexto ou pergunta vaga

**Solução**:
- Seja mais específico
- Mencione o nome do paciente
- Inclua datas e valores
- Use o chat a partir da tela do paciente

### Problema: Resposta incorreta

**Causa**: Dados desatualizados ou erro de interpretação

**Solução**:
1. Verifique os dados originais
2. Reformule a pergunta
3. Reporte o problema para melhoria do sistema

### Problema: Demora muito para responder

**Causa**: Processamento complexo ou muitos dados

**Solução**:
- Primeira resposta pode demorar 5-10 segundos
- Respostas subsequentes são mais rápidas
- Se > 30 segundos, pode ter timeout
- Tente pergunta mais simples

---

## 📊 Custos e Limites

### Custos da OpenAI

- Cada mensagem consome tokens
- Mensagens longas custam mais
- Estimativa: $50-100/mês (uso moderado)

### Limites Técnicos

- **Máximo por mensagem**: 1.500 tokens (resposta)
- **Modelo**: GPT-4
- **Timeout**: 30 segundos por resposta
- **Histórico**: Mantido durante a sessão

### Boas Práticas para Economizar

✅ Perguntas diretas e objetivas  
✅ Evite repetições desnecessárias  
✅ Limpe conversa quando mudar de assunto  
❌ Evite perguntas muito abertas  
❌ Não use para chat casual

---

## 🎓 Casos de Uso Ideais

### 1. Análise Rápida de Evolução
- "Como evoluiu nos últimos X dias?"
- "Está crescendo adequadamente?"

### 2. Decisão sobre Dietoterapia
- "Qual alimento indicar?"
- "A dieta atual está funcionando?"

### 3. Predição de Outcomes
- "Como vai crescer nos próximos 14 dias?"
- "Qual a chance de alta em 1 semana?"

### 4. Aprendizado com Casos
- "Que casos similares tiveram sucesso?"
- "O que funciona para este perfil?"

### 5. Suporte à Documentação
- Copiar análises para prontuário
- Gerar resumos de evolução
- Justificar decisões com dados

---

## 🚀 Próximas Melhorias Planejadas

- [ ] Histórico de conversas salvo
- [ ] Sugestões automáticas de perguntas
- [ ] Integração com prontuário eletrônico
- [ ] Respostas em áudio (TTS)
- [ ] Múltiplos idiomas
- [ ] Modo offline com cache

---

**Documentação criada em:** Dezembro 2024  
**Versão:** 1.1.0  
**Status:** ✅ Em Produção

---

**Dúvidas ou problemas?** Entre em contato com o suporte técnico.

