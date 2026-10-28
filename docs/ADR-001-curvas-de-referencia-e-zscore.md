# ADR-001 — Curvas de referência e cálculo de z-score

Data: 2026-10-28 · Status: aceito (Fase 1 implementada)
Contexto completo: `docs/atualizacao 2026-10-26/DIAGNOSTICO_GRAFICOS_OMS_INTERGROWTH.md`

## Contexto

O cálculo de z-score nunca funcionava (chaves de arquivo erradas), usava uma aproximação linear
em vez do método LMS, não tinha referência para estatura e perímetro cefálico, e bloqueava o
registro de consultas de pré-termos após 64 semanas pós-menstruais.

## Decisões

1. **Dados OMS**: tabelas expandidas diárias (0–1856 dias) com parâmetros `L, M, S`, para
   peso/idade, estatura/idade e perímetro cefálico/idade, ambos os sexos. Formato
   `[{"dia","l","m","s"}]`, gerado por `scripts/importar_referencias_oms.py` a partir das
   planilhas oficiais (que o script confere contra a fórmula LMS).
2. **Dados INTERGROWTH-21st**: Postnatal Growth Standards for Preterm Infants, peso, tabela
   semanal 27–64 semanas pós-menstruais com os valores das linhas z = −3..+3 (conferida contra o
   PDF oficial). Arquivos de tamanho ao nascer, backups e cópias "sintéticas" foram removidos
   do diretório de referências.
3. **Cálculo** (`ZScoreService`): idade em **dias**; OMS pelo método LMS com o ajuste da OMS
   além de ±3 **apenas para o peso** (estatura e PC não são restringidos, como no WHO Anthro);
   INTERGROWTH por interpolação linear entre semanas e entre linhas de z, extrapolando além das
   extremas com a largura da banda vizinha. Resultado arredondado a 2 casas.
4. **Seleção da referência** (`ReferenciaCrescimentoService`), conforme SBP (Manual de
   Orientação nº 64/2023) e INTERGROWTH-21st:
   - IG ≥ 37 semanas → OMS, idade cronológica, até 1856 dias;
   - IG < 37 e idade pós-menstrual (IG + idade cronológica) ≤ 64 semanas → INTERGROWTH;
     abaixo de 27 semanas, sem referência;
   - IG < 37 e > 64 semanas → OMS pela **idade corrigida** (pós-menstrual − 280 dias) até
     `Crescimento:LimiteIdadeCorrigidaMeses` (padrão **24**, 1 mês = 30,4375 dias), depois
     idade cronológica.
5. **Rastreabilidade**: cada consulta grava `ReferenciaCurva`, `IdadeCalculoDias` e
   `TipoIdadeCalculo` (migration `AddRastreabilidadeZScoreConsulta`).
6. **Reprocessamento**: `POST /api/consultas/recalcular-zscores` (SuperAdmin) recalcula
   z-scores, alertas (RCEU ≤ −1,28; queda ≤ −0,5 DP) e VGP de todas as consultas.
7. A "consulta anterior" para alertas e VGP é a última com data **anterior** à consulta avaliada
   (antes, na criação, era a última cadastrada, independentemente da data).

## Fase 2 — gráficos (2026-10-28)

8. **`GraficoOms`** (`frontend/src/components/GraficoOms.tsx`): os cinco recortes oficiais da
   OMS (nascimento–6 m, nascimento–2 a, 6 m–2 a, 2–5 a, nascimento–5 a) como filtro; eixo X em
   dias rotulado em semanas (0–13), meses e anos completos (1 mês = 30,4375 dias); domínios de
   peso iguais aos dos PDFs oficiais por sexo e recorte; linhas −3/−2/0/+2/+3 nas cores da OMS,
   ±1 opcional (tracejada âmbar); moldura rosa/azul; medidas peso, comprimento/estatura e
   perímetro cefálico (curva diária de `/api/referencias/oms/{medida}/{sexo}/curva-diaria`).
9. **Regra no cliente** (`frontend/src/lib/crescimento.ts`) espelha o backend e usa a
   rastreabilidade gravada na consulta (`referenciaCurva`, `idadeCalculoDias`,
   `tipoIdadeCalculo`) quando existe. A termo → só `GraficoOms`; pré-termo → INTERGROWTH até
   64 semanas e, havendo consultas posteriores, `GraficoOms` em idade corrigida (pontos vazados)
   com a marca "fim INTERGROWTH".
10. Removido o `peso > 15 → /1000` do gráfico; o formulário de consulta valida faixas
    (peso 0,3–35 kg, comprimento 20–130 cm, PC 15–60 cm).
11. `/dev/grafico-oms` (só em `vite dev`) exercita o componente com pontos fictícios.

## Consequências

- Consultas antigas têm z nulo até rodar o reprocessamento.
- O limite de 24 meses de idade corrigida é uma decisão de produto (a literatura converge em
  ~2 anos; não há regra oficial explícita do MS/SBP) e fica configurável.
- Pendentes: tabelas INTERGROWTH de comprimento e PC (pré-termo ≤ 64 s fica sem z nessas
  medidas); gráficos com os 5 recortes OMS (Fase 2); classificação por z no backend (Fase 3).
