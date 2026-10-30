# ADR-001 — Curvas de referência e cálculo de z-score

Data: 2026-10-28 · Status: aceito (Fases 1, 2 e 3 implementadas; INTERGROWTH com as três medidas em 2026-10-30)
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
2. **Dados INTERGROWTH-21st**: Postnatal Growth Standards for Preterm Infants, peso, comprimento e
   perímetro cefálico, tabela semanal 27–64 semanas pós-menstruais com os valores das linhas
   z = −3..+3, gerada dos PDFs oficiais por `scripts/importar_referencias_intergrowth.py` (que
   também confere o peso). Arquivos de tamanho ao nascer, backups e cópias "sintéticas" foram removidos
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

## Fase 3 — classificação e alertas (2026-10-28)

12. **Classificação por indicador** (`ClassificacaoCrescimento`), pela tabela "Como interpretar os
    gráficos para crianças menores de 5 anos" (Brasil 2008 / curso OMS 2006):
    - peso/idade: muito baixo (z < −3), baixo (−3 ≤ z < −2), adequado com vigilância para baixo
      peso (−2 ≤ z < −1), adequado (−1 ≤ z ≤ +1), adequado com vigilância para peso elevado
      (+1 < z ≤ +2), elevado (z > +2 — a tabela não separa z > +3 para peso);
    - estatura/idade: muito baixa (z < −3), baixa (−3 ≤ z < −2), adequada (z ≥ −2; sem corte
      superior);
    - perímetro cefálico/idade não consta da tabela: corte de ±2 DP da OMS/SBP (abaixo de −2,
      microcefalia; acima de +2, macrocefalia; entre, adequado).
    Os mesmos cortes de z valem para a curva INTERGROWTH-21st. Nível ótimo/atenção/cuidado segue
    a coluna "o que significa". Os códigos ficam em `Consulta.ClassificacaoPeso/Estatura/Perimetro`
    (migration `AddClassificacaoZConsulta`); a tabela é exposta em `GET /api/referencias/classificacoes`
    e espelhada em `frontend/src/lib/crescimento.ts`.
13. **Alertas** passam para `AvaliacaoCrescimentoService.Avaliar` (z-scores, classificação, alertas e
    VGP numa única chamada, usada por consulta, reprocessamento e seed):
    - RCEU apenas para pré-termo na curva INTERGROWTH (peso ≤ p10, z ≤ −1,28). Antes disparava
      para qualquer criança com z ≤ −1,28, inclusive a termo, onde o conceito não se aplica;
      depois de 64 semanas a leitura é a classificação OMS;
    - queda ponderal (≥ 0,5 DP) só compara z-scores calculados na mesma referência — a troca
      INTERGROWTH → OMS muda a escala.
14. **Dashboard** conta/lista alertas por classificação de nível "cuidado" em qualquer indicador ou
    RCEU/queda (antes: |z| > 2 em qualquer indicador, o que incluía estatura elevada, que a tabela
    não classifica). A **exportação CSV** ganha referência, tipo de idade, idade de cálculo e as
    três classificações.
15. **Detalhe da criança** mostra, por consulta, z-score, classificação (badge por nível) e os
    alertas RCEU/queda, além da referência usada. Consultas ainda não reprocessadas têm a
    classificação derivada do z no cliente (mesma tabela).

## Novidades do benchmark — Onda 1 (2026-10-30)

16. **INTERGROWTH-21st com as três medidas**: comprimento e PC (27–64 s) passam a ter z e
    classificação no período INTERGROWTH, com os mesmos cortes de z da tabela do MS (comprimento
    < −2 baixo; PC fora de ±2). O **RCEU continua só pelo peso**; comprimento e PC abaixo de −2 entram
    como classificação de nível "cuidado". `GraficoIntergrowth` substitui o gráfico legado de peso do
    pré-termo, com seletor de medida e recortes 27–40 / 35–50 / 40–64 / 27–64 semanas.

17. **Tamanho ao nascer (PIG/AIG/GIG)** pela INTERGROWTH-21st: padrão de 33+0 a 42+6 semanas (Villar
    2014) e referência para muito pré-termo de 24+0 a 32+6 (Villar 2016), por dia de IG, para peso,
    comprimento e PC (`nascimento_*.json`, `scripts/importar_tamanho_nascimento_intergrowth.py`). O z
    interpola linearmente entre 13 nós (linhas z −3..+3 e centis 3/5/10/90/95/97 publicados), de modo
    que PIG (&lt; P10) e GIG (&gt; P90) coincidem com a tabela oficial de centis — só as linhas z
    desviam até ~1,3 ponto de percentil no P10/P90 por arredondamento. Adequação só pelo peso
    (campo AIG/PIG/GIG da Caderneta, p. 69); comprimento e PC ao nascer exibem z e percentil.
    Fora de 24+0 a 42+6 não há classificação. A classificação por faixa de gramas continua como
    informação complementar. Gravado em `RecemNascido.ZNascimento*`/`AdequacaoPesoNascimento`
    (migration `AddTamanhoNascimentoRecemNascido`); não usar para crescimento pós-natal.

18. **Percentil e ganho para manter o canal**: o percentil é Φ(z) da normal padrão (OMS e INTERGROWTH
    publicam em z) e **não é gravado** — é calculado na tela, no CSV e no relatório a partir do z
    gravado (extremos como "< P0,1" / "> P99,9"). O ganho esperado inverte a curva da mesma referência:
    valor(z atual, idade + horizonte) − valor atual, com horizonte de 7 dias na INTERGROWTH-21st e 30
    dias na OMS, encurtado no fim da referência; para o peso também em g/kg/dia (forma exponencial,
    comparável à VGP de Patel). `GET /api/consultas/{id}/ganho-esperado`. É referência de canal, não
    meta nutricional.

19. **Estado nutricional (OMS)**: IMC/idade (tabela expandida diária 0–1856, LMS) e peso para
    comprimento (45–110 cm, até 2 anos) / peso para estatura (65–120 cm, de 2 a 5 anos), LMS a cada
    0,1 cm, ambos com o ajuste de caudas da OMS (indicadores baseados em peso). Classificação pela
    tabela do MS: magreza acentuada (z &lt; −3), magreza, eutrofia (−2 a +1), risco de sobrepeso,
    sobrepeso, obesidade (z &gt; +3). A consulta grava `PosicaoMedida` (Deitado/EmPe; vazio = esperada
    para a idade) e a estatura é corrigida em 0,7 cm na posição trocada (em pé antes de 731 dias: +0,7;
    deitado depois: −0,7), como no WHO Anthro — a correção vale para estatura/idade, IMC e P/E na OMS.
    Pré-termo no período INTERGROWTH não tem z de IMC nem de P/E (sem tabela pública). O IMC entra nos
    alertas do painel; P/E não, para não duplicar o mesmo achado. Migration `AddEstadoNutricionalConsulta`.

20. **Datas e idades**: o RN grava hora do nascimento, método de datação da IG (DUM, USG ou exame do
    RN, Caderneta p. 69), DUM e DPP (migration `AddDatasGestacaoRecemNascido`). O cadastro calcula a IG
    pela DUM e pela DPP (Naegele: DPP = DUM + 280 dias), oferece usá-las e avisa quando a IG informada
    difere 7 dias ou mais; a IG gravada continua sendo a informada. O backend recusa método desconhecido
    e DUM/DPP que impliquem IG fora de 20–45 semanas. Convenção de **dia de vida**: o dia do nascimento
    é o 1º dia de vida (uso brasileiro); idades seguem contando por data de calendário, sem a hora.
    O detalhe mostra "Idades hoje" (cronológica, dia de vida, pós-menstrual e corrigida) a partir de um
    helper único no cliente (`idadesNaData`), que substitui três cálculos de IGC duplicados. Os campos
    `IdadeGestacionalCorrigida*` do RN ficam como legado: saem do formulário e não são usados.

## Consequências

- Consultas antigas têm z, classificação e alertas desatualizados até rodar o reprocessamento
  (`POST /api/consultas/recalcular-zscores`).
- O limite de 24 meses de idade corrigida é uma decisão de produto (a literatura converge em
  ~2 anos; não há regra oficial explícita do MS/SBP) e fica configurável.
- Os cortes de perímetro cefálico (±2 DP) e a restrição do RCEU ao período INTERGROWTH são
  decisões desta ADR, a validar com a equipe clínica.
- Crianças cadastradas antes de 2026-10-30 só ganham adequação ao nascer após o reprocessamento
  (`recalcular-zscores` agora também recalcula o tamanho ao nascer).
- Consultas de pré-termo ≤ 64 s registradas antes de 2026-10-30 só ganham z de comprimento e PC
  após o reprocessamento.
