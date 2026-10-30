# Diagnóstico — Benchmark: PediTools, app INTERGROWTH-21st e Caderneta da Criança (SUS) × Crescer Saudável

Data: 2026-10-30 · Status: diagnóstico (sem código) · Autor: sessão de análise · Fontes acessadas em 2026-10-30 (§8).
Base interna: leitura do código em `main` (HEAD `d57c37b`), `docs/ADR-001-curvas-de-referencia-e-zscore.md`,
`docs/atualizacao 2026-10-26/DIAGNOSTICO_GRAFICOS_OMS_INTERGROWTH.md`, `backend/CrescerSaudavel.Api/Data/Referencias/README.md`.
Convenções: **[C]** confirmado em fonte primária; **[C-sec]** só em fonte secundária; **[NC]** não confirmado; **[I]** inferência.

---

## 1. Resumo executivo

**Verdict.** Núcleo antropométrico do Crescer Saudável (OMS 0–5 a por LMS diário em peso/estatura/PC; INTERGROWTH pós-natal 27–64 s;
regra SBP de troca; classificação e alertas persistidos) é **equivalente ou superior** ao app oficial INTERGROWTH-21st (tracker com
gráfico/tabela/PDF) e cobre o núcleo OMS/INTERGROWTH-peso do PediTools. Lacunas em três camadas: (1) **largura de calculadoras** do
PediTools/app INTERGROWTH — comprimento e PC INTERGROWTH, PIG/AIG/GIG, IMC e peso/comprimento OMS, percentil, ganho esperado, datas, PDF;
(2) **camada de puericultura** que a Caderneta da Criança (6ª ed. 2024; miniapp Meu SUS Digital 2025) define como padrão nacional — marcos,
triagens, aleitamento, suplementação, vacinação PNI (incl. nirsevimabe), consultas, dados perinatais/alta — **0 ocorrências** no código;
(3) **saídas e acesso** — PDF, lote, família, notificações, RNDS. Sistema fora de produção: momento barato de estender o modelo de dados.

**Top 3 oportunidades**
1. **Completar a antropometria neonatal** (quick wins, dados públicos, encaixe em `ZScoreService`/`GraficoOms`): INTERGROWTH comprimento e
   PC 27–64 s; tamanho ao nascer INTERGROWTH 24–42+6 s (PIG/AIG/GIG); OMS IMC/idade e peso/comprimento; percentil; ganho esperado; posição da medida.
2. **Módulo de puericultura alinhado à Caderneta 6ª ed.**: dados perinatais/alta e triagens; vigilância do desenvolvimento (P/A/NV, 3 classes,
   idade corrigida); aleitamento e suplementação; checklist PNI 2026 com regras de pré-termo e elegibilidade a nirsevimabe; agenda com faltosos.
3. **Saídas clínicas**: relatório PDF/impressão (gráficos + tabela + classificações), export XLSX/CSV na UI e importação em lote; depois acesso
   somente-leitura da família e trilha RNDS (credenciamento DATASUS, RIA/RAC) — perfis RNDS de antropometria não são públicos [NC].

---

## 2. Inventário — o que o Crescer Saudável já cobre (confirmado no código)

Caminhos relativos a `backend/CrescerSaudavel.Api/` (B), `frontend/src/` (F), `ml-service/app/` (M).

| Capacidade | Estado | Onde |
|---|---|---|
| Z-score OMS por LMS, tabelas expandidas diárias 0–1856 d, peso/idade, comprimento-estatura/idade, PC/idade, ambos os sexos; ajuste de caudas OMS só no peso | **Tem** | B `Services/ZScoreService.cs:27,176,196`; dados `Data/Referencias/OMS/*.json` (1857 pontos cada) |
| INTERGROWTH-21st pós-natal pré-termo (Villar 2015), **só peso**, 27–64 s, interpolação linear entre semanas e linhas z | **Parcial** | B `ZScoreService.cs:28-29,221-263`; `Data/Referencias/INTERGROWTH/peso_{f,m}.json` |
| Regra de referência: IG ≥ 37 → OMS cronológica; pré-termo IPM ≤ 64 s → INTERGROWTH; > 64 s → OMS idade corrigida até 24 m (configurável), depois cronológica; < 27 s IPM sem referência | **Tem** | B `Services/Crescimento/ReferenciaCrescimentoService.cs:51-86`; `CrescimentoOptions.cs:11`; espelho F `lib/crescimento.ts:55-109` |
| Rastreabilidade por consulta (`ReferenciaCurva`, `IdadeCalculoDias`, `TipoIdadeCalculo`) e reprocessamento | **Tem** | B `Models/Entities.cs:155-157`; `Controllers/ConsultaController.cs:155` |
| Classificação por indicador (tabela "Como interpretar", Brasil 2008/OMS), PC ±2 DP | **Tem** | B `Services/Crescimento/ClassificacaoCrescimento.cs:38-100`; `GET /api/referencias/classificacoes` |
| Alertas: RCEU (z ≤ −1,28, só INTERGROWTH), queda ≥ 0,5 DP (mesma referência); VGP g/kg/dia (Patel 2005) | **Tem** | B `Services/Crescimento/AvaliacaoCrescimentoService.cs:18,21,84,91,106` |
| Classificação ao nascer por IG (RNPTE/M/T, RNT, RNP) e por peso absoluto (macrossomia…extremo baixo peso) | **Parcial** (sem PIG/AIG/GIG) | B `Services/RecemNascidoClassificacaoService.cs:12,44` |
| Gráfico OMS: 5 recortes oficiais × 3 medidas, linhas z −3/−2/0/+2/+3 (±1 opcional), eixos e domínios dos PDFs OMS, marca "fim INTERGROWTH" | **Tem** | F `components/GraficoOms.tsx:82,120` |
| Gráfico INTERGROWTH peso 27–64 s (7 linhas z), zoom, histórico de peso/IGC, adequação energética da dieta | **Tem** (só peso) | F `components/GraficosZScore.tsx` |
| Dietoterapia: dieta (kcal/kg, g/kg proteína, via oral/enteral/NPT/mista, frequência) e itens; cadastro de alimentos (kcal e proteína/100) | **Tem** (sem CHO/lipídio/micronutrientes, sem GIR/osmolaridade) | B `Models/Entities.cs:165-231`; F `routes/DietaForm.tsx`, `AlimentoForm.tsx` |
| Analytics de alimentos (performance, combinações, timeline, comparação), cache 5 min | **Tem** | B `Controllers/AlimentosAnalyticsController.cs` |
| ML: predição de Δz-peso (XGBoost, horizonte treinado 14 d, 16 features), casos similares (KNN), recomendador de alimentos (RF) | **Tem** | M `models/growth_predictor.py`, `diet_analyzer.py`, `food_recommender.py`; B `Services/MLService.cs` |
| Chat IA (OpenAI, function calling: dados do paciente, predição, similares, estatísticas) | **Tem** (histórico só em memória) | B `Services/ChatService.cs:277-341` |
| Multi-tenant (GrupoSaude → Unidade), 4 roles, 7 conselhos, JWT, seletor de unidade | **Tem** | B `Authorization/SystemRoles.cs`; `Services/Time/CurrentUserService.cs`; F `contexts/AuthContext.tsx` |
| Dashboard (totais, pré-termos, atendimentos hoje, alertas por severidade) | **Tem** | B `Controllers/DashboardController.cs:29,143` |
| Exportação: CSV de pesquisa (sem botão no frontend), CSV de analytics, JPEG/PNG dos gráficos | **Parcial** | B `Controllers/ExportController.cs:27`; F `GraficosZScore.tsx` (`handleExportarJpeg`, ~l. 1019) |
| Interoperabilidade PIX/PDQ: serviços sobre tabela local `PacienteIdentificador`, score de similaridade; auditoria de acesso | **Parcial** (registrados em DI, nunca chamados; sem endpoint, sem HL7/FHIR/RNDS) | B `Services/Interoperabilidade/*`; `Program.cs:202-204` |
| Dados do RN: nome, sexo, data (sem hora), IG sem+dias, IG corrigida (gravada, não usada), tipo de parto, Apgar 1/5, peso/comprimento/PC ao nascer; mãe/pai/endereço/contato (backend, sem UI) | **Parcial** | B `Models/Entities.cs:83-127`; F `routes/CriancaForm.tsx` |
| Dados da consulta: data/hora, peso, estatura, PC (+ z, classificações, alertas, VGP, campos de pesquisa Kappa) | **Parcial** (sem motivo, posição, aleitamento, conduta) | B `Models/Entities.cs:129-163`; F `routes/ConsultaForm.tsx` |
| Testes: 43 testes xUnit (z-score, referência, avaliação, classificação) | **Tem** (só backend) | `backend/CrescerSaudavel.Tests/` |

**Confirmado ausente (grep 0 hits em B/F/M):** vacinas/imunização; marcos do desenvolvimento/DNPM; triagens neonatais (pezinho, orelhinha,
olhinho, coraçãozinho, linguinha); amamentação/aleitamento; suplementação (ferro/vitamina); saúde bucal; bilirrubina; Fenton/Olsen; IMC e
peso/comprimento; PIG/AIG/GIG; percentil como saída; OMS 5–19 anos; CPF; entidade responsável/família; notificações (push/e-mail/SMS);
PDF/impressão/relatório; PWA/offline; i18n; FHIR/HL7/RNDS real; posição da medida; hora do nascimento; dados pré-natais/internação/alta.

---

## 3. O que cada referência oferece (síntese)

### 3.1 PediTools (peditools.org) — reestruturado em out/2026
Catálogo de 22 curvas em `/growth/?calc=…` + bilirrubina + datas + PN. Relevante para nós:
- **Fenton 2013 e 2025** (crescimento 22+4–50 s e tamanho ao nascer): z, percentil, P50, ganho semanal esperado para manter o z, apoio
  a ROP e profundidade de cateter umbilical. Tabelas LMS **não publicadas**, cedidas pelos autores sob licença.
- **Olsen 2010/2015** (tamanho ao nascer 23–41 s; IMC pré-termo 24–41 s).
- **INTERGROWTH-21st tamanho ao nascer** (24+0–42+6; peso, comprimento, PC, peso/comprimento; normal < 33 s, t assimétrica ≥ 33 s) e
  **pós-natal** (27–64 s IPM; peso, comprimento, PC e peso/comprimento 35–65 cm; ganho semanal esperado).
- **OMS 0–24 m** (idade cronológica **e corrigida automática** quando se informa IG; ganho mensal esperado), **OMS 0–5 a diária** (0–1856 d,
  inclui IMC e peso/comprimento 45–110 cm e peso/estatura 65–120 cm, troca deitado/em pé aos 730,5 d com 0,7 cm), **CDC**, **OMS 5–19**,
  **CDC 2–20** (IMC estendido), Down, PC (GMFCS), MUAC, dobras.
- Caixa "Apply WHO SD23 correction" (ajuste de caudas opcional).
- **Gráfico longitudinal do paciente** (CSV/XLSX/colar; cronológica como ponto e corrigida como cruz; impressão; export CSV/XLSX) e
  **lote** até 10.000 linhas.
- **Bilirrubina**: AAP 2022 (≥ 35 s) + Stanford Premie BiliRecs (27–35 s IPM), tendência, fim de fototerapia, seguimento pós-alta.
- **Calculadora de datas** (DUM/DPP/IG/idade em dias/IPM), **Simple PN** (kcal, osmolaridade, GIR).
- Sem API pública, sem Android; cálculo no servidor; gratuito, © Joseph Chou/PediTools LLC. Validação: Chou et al., JMIR 2020 (CC BY) e
  auditoria linha a linha publicada em `/growth_engine/sources.php` (out/2026).

### 3.2 App INTERGROWTH-21st (Oxford/Olamalu; v1 05/2024, v2 03/2026)
- Padrões no app: tamanho ao nascer (≥ 24 s), pós-natal pré-termo (até 64 s IPM, "depois usar OMS"), altura uterina, crescimento fetal
  (HC/BPD/AC/FL/OFD + EFW). Sem CRL, GWG, Doppler, INTER-NDA no app (só web/Excel).
- Lista de pacientes salvos (ID ou nome, sexo), vários "measurement sets" por paciente, gráfico em z ou centil, tabela, **export PDF e
  XLSX**, idiomas EN/ES/FR/PT/PT-BR, "no data collected". IPM automática, alertas, offline, nuvem: **não documentados** [NC].
- Metodologia publicada em tabelas (centis e z por semana), **não em LMS**; EFW tem equações. Pacotes: `gigs` (R/Stata/SAS, GPL-3),
  `growthstandards` (R, MIT). Licença dos dados: "practitioners can download and use these charts freely" (TGHN), © University of Oxford,
  **sem termo formal de uso comercial/redistribuição** → pedir confirmação escrita a intergrowth@wrh.ox.ac.uk antes de embutir tabelas
  com marca própria.
- Recomendação oficial: tamanho ao nascer **não** mede crescimento pós-natal; pós-natal até 64 s, depois OMS. SBP (DC Neonatologia 2017;
  Manual nº 64/2023): idem, "robustas a partir de 33 s"; < 32 s canal definido pelo peso quando recomeça o ganho. Fenton não é citada pela
  SBP nem pela Caderneta; Fenton e INTERGROWTH não são intercambiáveis no indivíduo (Cunha et al., J Pediatr (Rio J) 2026).

### 3.3 Caderneta da Criança — 6ª ed. impressa (2024) e miniapp no Meu SUS Digital (04/2025)
Impressa (menino/menina, 107 p., 0–9 anos), Parte II "Registros":
- **Nascimento/alta (p. 69)**: pré-natal (consultas, gestação múltipla, risco), sorologias por trimestre, vacinas na gestação, parto (tipo,
  data, **hora**), pele a pele, mamada na 1ª hora, Apgar 1/5, clampeamento, IG sem+dias com método (DUM/USG/exame), peso/comprimento/PC
  e **AIG/PIG/GIG**, reanimação, tipo sanguíneo/Coombs, profilaxias, internação (UTIN/UCINCo/UCINCa/Alcon, dias, motivo), relatório de
  alta, peso e comprimento na alta, alimentação na alta (LME/LM+LA/LA).
- **Triagens (p. 70–71)**: olhinho (antes da alta), orelhinha (24–48 h, ≤ 1 mês; EOA/PEATE), coraçãozinho (SpO2 ≥ 95% e dif. < 3%),
  pezinho (3º–5º dia, PNTN em 5 etapas, Portaria 7.293/2025, Lei 14.154/2021). Linguinha **não consta** na 6ª ed.
- **Consultas (p. 72–77)**: 10 consultas (1ª semana, 1, 2, 4, 6, 9, 12, 18, 24, 36 m) + "outras"; cada uma registra PC/peso/estatura/IMC,
  aleitamento (LME/LM+LA/LA, dificuldades, desmame), sinais de alerta (limiares AIDPI neonatal), vacinas, desenvolvimento, exame ocular,
  sono/posição/intestino/acidentes; PA ≥ 3 anos; "criança com cuidado especial" inclui < 2.500 g e < 37 s.
- **Desenvolvimento (p. 78–86)**: fatores de risco (prematuridade, < 2.500 g, icterícia grave, internação…); PC < −2 ou > +2 z e fenótipo;
  marcos por faixa (0–6 m, 6–18 m, 18–42 m, 42–60 m, 5–6 a, 6–10 a) com P/A/NV e "como pesquisar"; instrumento com 3 classificações
  (provável atraso / alerta — retorno em 30 d / adequado); **idade corrigida para pré-termos**.
- **Crescimento (p. 87–99)**: OMS z −3..+3: PC/idade 0–2; peso/idade 0–2, 2–5, 5–10; comprimento-estatura/idade 0–2, 2–5, 5–10;
  **IMC/idade 0–2, 2–5, 5–10**; correção 0,7 cm; **INTERGROWTH-21st 27–64 s para peso, comprimento e PC (p. 88–89)**, "adequado" −2..+2;
  após 64 s → OMS **sem corrigir idade**; se não usar INTERGROWTH: idade corrigida até 2 anos (3 anos se IG < 28 s). Sem Fenton, sem
  peso/comprimento.
- **Odontologia (p. 100–101)**, **suplementação (p. 102)**: vitamina A (6 m–4 a 11 m, áreas de risco), ferro 6–24 m, NutriSUS; sem vitamina D.
- **Vacinação (p. 103)**: calendário da IN 2023 — já **defasado** frente ao CNV 2026 (VIP no lugar da VOP aos 15 m; MenACWY aos 12 m;
  influenza na rotina; varicela 2 doses; HPV dose única; VPC20 em transição; Covid 6/7/9 m; dengue 10–14 a fora da faixa 0–9; vacina VSR
  na gestante ≥ 28 s; **nirsevimabe** para pré-termos ≤ 36+6 s com < 6 m na sazonalidade fev–ago e comorbidades < 24 m, NT 31/2026,
  registro nominal na RNDS, dose por peso; BCG adiar se < 2.000 g; monitorar apneia 48–72 h em ≤ 28 s).

Miniapp (Meu SUS Digital, gov.br prata/ouro + 2FA; criança até 12 anos incompletos; vínculo por bases governamentais, antes por CPF+senha
gov.br da criança; multi-responsável; sessão da criança expira em 30 min):
- Registros: vacinação (aplicada/não registrada/dose futura, lembretes), crescimento (peso, altura, **PC, IMC**, gráficos), desenvolvimento
  (marcos, alertas, **registro pelas famílias**), saúde bucal, histórico clínico (consultas/procedimentos). Dados vêm da **RNDS**/PEC;
  responsável consulta e anota, **não insere** peso/altura/vacina [C-sec].
- Conteúdo educativo ("Cuidados da Família"): direitos, amamentação, alimentação, cuidados básicos, telas, acidentes, violência,
  **cuidados com prematuros**. Online para dados; conteúdo público offline. PDF da caderneta, curvas usadas, idade corrigida: [NC].
- RNDS: Portaria 1.434/2020; IG FHIR público só com REL (exame laboratorial) e NamingSystems (inclui `BRTipoAleitamentoMaterno`,
  `BRImunobiologico`); RIA/RAC existem mas sem perfil público de antropometria/marcos [NC]; passo a passo: certificado digital, Portal de
  Serviços DATASUS, homologação (`ehr-services.hmg.saude.gov.br`) → produção por UF.

---

## 4. Matriz de funcionalidades

Legenda: ● tem · ◐ parcial · ○ não tem · — fora do propósito da ferramenta. Coluna CS = Crescer Saudável (com apontador).

| Capacidade | PediTools | App INTERGROWTH | Caderneta SUS (impressa + digital) | CS | Observações |
|---|---|---|---|---|---|
| Z-score OMS 0–5 a (peso, comprimento/estatura, PC) por LMS | ● diária (0–1856 d) | — | ● (gráficos impressos; digital plota) | ● `ZScoreService.cs` | CS equivalente ao PediTools `who_daily_0_5` nessas 3 medidas |
| Percentil como saída (e conversão z↔centil) | ● | ● (z ou centil) | ◐ (impresso em z) | ○ | Φ(z) trivial; famílias entendem percentil |
| IMC/idade e peso/comprimento (OMS) | ● | ● (peso/comprimento INTERGROWTH) | ● IMC/idade 0–10 | ○ | Caderneta usa IMC em todas as faixas; CS sem posição da medida |
| OMS 5–19 a / CDC | ● | — | ● OMS 5–10 (ref. 2007) | ○ | CS para em 1856 d |
| INTERGROWTH pós-natal pré-termo 27–64 s | ● peso, compr., PC, P/C | ● peso, compr., PC | ● peso, compr., PC (p. 88–89) | ◐ só peso | **Lacuna explícita**: SBP e Caderneta pedem as 3 medidas |
| Tamanho ao nascer (PIG/AIG/GIG) | ● Fenton, Olsen, INTERGROWTH 24–42+6 | ● INTERGROWTH ≥ 24 s | ● campo AIG/PIG/GIG (p. 69) | ○ (só peso absoluto) | CS classifica por faixa de gramas, não por IG |
| Fenton 2013/2025 | ● | — | ○ (adota INTERGROWTH) | ○ | Licença comercial Innovate Calgary; não é padrão MS/SBP |
| Idade: IPM, corrigida automática, calculadora DUM/DPP | ● `/dates/`, corrigida automática na OMS 0–24 | ◐ (usuário informa IPM) [NC] | ● instruções de idade corrigida (até 2 a; 3 a se < 28 s) | ◐ IPM/corrigida automáticas; sem DUM/DPP, sem método da IG | CS corrige até 24 m configurável; Caderneta: 36 m se IG < 28 s |
| Ganho esperado para manter o z (próx. semana/mês) | ● | ● (ganho semanal) | ○ | ○ (só VGP realizado) | Derivável das tabelas já carregadas |
| Velocidade de ganho (g/kg/dia, g/dia) | ○ | ○ | ○ | ● VGP exponencial | Diferencial CS; sem referência de velocidade (OMS 2009) |
| Classificação por z + alertas persistidos (RCEU, queda) | ◐ (texto "SMALL for PMA", sem persistência) | ○ | ◐ (texto impresso) | ● | Diferencial CS |
| Gráfico longitudinal multi-medidas | ● (upload/colar; cronológica ponto, corrigida cruz) | ● | ● (papel) / digital ● | ● 5 recortes OMS + INTERGROWTH peso | CS: estatura/PC do pré-termo ≤ 64 s sem curva |
| Calendário vacinal PNI / status de doses | — | — | ● (digital via RNDS: aplicada/não registrada/futura; lembretes) | ○ | Fonte da verdade é RNDS; CS poderia ter checklist + regras de pré-termo (BCG < 2 kg, apneia, nirsevimabe) |
| Marcos do desenvolvimento / instrumento de vigilância | — | — (INTER-NDA só web) | ● (P/A/NV, 3 classificações, idade corrigida; digital com registro da família) | ○ | Lei 13.438/2017; faixa 0–6 m e 6–18 m é o essencial para CS |
| Triagens neonatais (olhinho, orelhinha, coraçãozinho, pezinho) | — | — | ● (p. 70–71; PNTN 5 etapas) | ○ | Sem campos no RN |
| Dados perinatais/internação/alta | — | — | ● (p. 69) | ◐ (IG, parto, Apgar, medidas) | Faltam: hora, método IG, UTIN/UCIN dias, alta (peso/compr./alimentação), pré-natal mínimo |
| Aleitamento / alimentação por consulta | — | — | ● (LME/LM+LA/LA, desmame; 12 passos) | ○ | CS tem dietoterapia enteral, não status de aleitamento |
| Dietoterapia (kcal/kg, proteína, via) e analytics | ◐ Simple PN (kcal, GIR, osmolaridade) | — | ○ | ● | Diferencial CS; falta GIR/lipídio/CHO/osmolaridade para NPT |
| Suplementação (ferro, vit. A, NutriSUS) | — | — | ● (p. 102) | ○ | Para pré-termo: esquema SBP por peso (a confirmar) |
| Saúde bucal | — | — | ● odontograma | ○ | Baixa prioridade neonatal |
| Bilirrubina (AAP 2022 / Stanford PBR) | ● | — | ◐ (icterícia como sinal de alerta) | ○ | Fora da tese crescimento/dieta; alto risco clínico-legal |
| Predição/IA, casos similares, recomendador | ○ | ○ | ○ | ● | Diferencial CS (ver riscos §7) |
| Acesso da família / responsável | ○ | ◐ (uso individual no próprio aparelho) | ● (gov.br, multi-responsável, anotações da família) | ○ (sem entidade responsável, sem CPF) | Caderneta já resolve o acesso do cidadão; CS deve **alimentar**, não competir |
| Conteúdo educativo | ○ | ○ (links) | ● (toda a Parte I; offline) | ○ | Linkar PDFs oficiais basta |
| Interoperabilidade (RNDS/FHIR, PIX/PDQ, importação) | ◐ importação CSV/XLSX | ◐ CSV (ferramenta web) | ● RNDS (RIA/RAC via PEC) | ◐ PIX/PDQ locais, sem endpoint; sem FHIR | Perfis RNDS de antropometria não públicos [NC] |
| Notificações / lembretes | ○ | ○ | ● (vacina, acompanhamento) | ○ (só toasts e lista de alertas) | Faltosos de consulta e vacinas de pré-termo são o caso de uso |
| Offline / mobile | ◐ app iOS (GA Calc, Fenton), Universal (Shinylive no cliente) | ● app nativo iOS/Android (offline [NC]) | ◐ conteúdo offline; dados online | ◐ web responsiva parcial (sidebar fixa, gráficos 960–1200 px); sem PWA | — |
| Exportação / relatórios | ● impressão, CSV/XLSX, "Copy summary" | ● PDF, XLSX | ◐ PDFs de certificados; caderneta PDF [NC] | ◐ JPEG/PNG, CSV sem botão | **Lacuna prática imediata** |
| Multi-tenant / perfis / auditoria | ○ (sem contas) | ○ | — (gov.br) | ● 4 roles, grupo→unidade; auditoria LGPD existe mas **não é chamada** | — |
| Lote (bulk) / pesquisa | ● até 10.000 linhas | ● CSV | — | ◐ CSV de pesquisa (export), sem importação | Recalcular z em lote existe (`recalcular-zscores`) |
| Indicadores de qualidade por serviço (Δz nascimento→alta) | ◐ (estudo JMIR, não produto) | ○ | ○ | ◐ dashboard por alertas | Oportunidade de analytics por unidade/grupo |

---

## 5. Lacunas priorizadas

Critérios: **Impacto clínico** (A/M/B), **Esforço** (B ≈ ≤ 1 semana, M ≈ 2–4 semanas, A ≈ > 1 mês), **Dependência de dados/referência**
(pública / licença a pedir / depende do MS). Ordem dentro de cada grupo = prioridade sugerida.

### 5.1 Quick wins (dados públicos, encaixe direto na arquitetura atual)

| # | Lacuna | Impacto | Esforço | Dados |
|---|---|---|---|---|
| Q1 | INTERGROWTH pós-natal **comprimento e PC** 27–64 s (+ peso/comprimento 35–65 cm opcional) | A | B | Tabelas PDF públicas (Oxford), mesmo formato do peso |
| Q2 | **Percentil** ao lado do z e **ganho esperado** para manter o z (7 d INTERGROWTH; 30 d OMS) | M | B | Derivado das tabelas já carregadas |
| Q3 | **Tamanho ao nascer INTERGROWTH** 24–42+6 s → PIG/AIG/GIG (peso, comprimento, PC) | A | B–M | Tabelas públicas (`grow_newborn-*`, `grow_verypreterm-*`) |
| Q4 | **OMS IMC/idade e peso/comprimento (45–110 cm) / peso/estatura (65–120 cm)** + campo posição da medida (deitado/em pé, 0,7 cm) | M | M | Tabelas expandidas OMS (xlsx) públicas |
| Q5 | **Calculadora de datas** (DUM/DPP/IG/IPM/idade corrigida/dia de vida) no cadastro e no detalhe; método da IG (DUM/USG/exame); hora do nascimento | M | B | Nenhum |
| Q6 | **Relatório PDF/impressão** do acompanhamento (identificação, gráficos OMS/INTERGROWTH, tabela de consultas com z/classificação/alertas, dieta vigente) | A | M | Nenhum |
| Q7 | Ligar **export CSV** à UI, acrescentar **XLSX** e **importação em lote** (CSV/XLSX de consultas) | M | B–M | Nenhum |
| Q8 | **Responsividade mobile** (drawer no `Layout`, gráficos com altura relativa) | M | B | Nenhum |

### 5.2 Módulos novos (exigem modelo de dados e UI novos; alinhados à Caderneta 6ª ed.)

| # | Módulo | Impacto | Esforço | Dados |
|---|---|---|---|---|
| N1 | **Dados perinatais e de alta** (pré-natal mínimo, hora, método IG, reanimação, internação UTIN/UCINCo/UCINCa/Alcon com dias, peso/comprimento/alimentação na alta, Método Canguru) + **triagens neonatais** (olhinho, orelhinha, coraçãozinho com SpO2, pezinho por etapa PNTN, linguinha) com resultado/encaminhamento | A | M | Caderneta p. 69–71; Portaria 7.293/2025; Lei 14.154/2021 |
| N2 | **Vigilância do desenvolvimento**: marcos por faixa (Caderneta p. 80–86) com P/A/NV, idade corrigida em pré-termos, fatores de risco, PC fora de ±2 z, 3 classificações e conduta (retorno 30 d) | A | M–A | Lista de marcos da Caderneta (MS, pública); Lei 13.438/2017 |
| N3 | **Aleitamento e alimentação por consulta** (LME/LM+LA/LA, dificuldades, desmame, introdução alimentar) e **suplementação** (ferro, vit. A, vit. D, NutriSUS; esquema do pré-termo por peso) | A | M | Caderneta p. 72–77, 102; SBP Nutrologia (a confirmar doses) |
| N4 | **Checklist vacinal PNI 2026** por idade com status manual (aplicada/pendente/atrasada), regras de pré-termo (BCG < 2.000 g, apneia ≤ 28 s) e **alerta de elegibilidade a nirsevimabe** (≤ 36+6 s, < 6 m em fev–ago; comorbidades < 24 m; dose por peso) | A (pré-termos) | M | CNV 2026 e IN 2026 (públicos, atualização anual); NT 31/2026 |
| N5 | **Calendário de consultas de puericultura/seguimento do pré-termo** (10 consultas da Caderneta; agenda; faltosos no dashboard; notificações in-app, depois e-mail/SMS) | M | M | Caderneta p. 72–77; CAB 33; Método Canguru 3ª etapa |
| N6 | **Nutrição parenteral/enteral completa**: GIR, lipídios, aminoácidos, CHO, osmolaridade, Ca/P, metas por IG/peso; alimentos com macronutrientes completos | M | M | ESPGHAN/ESPEN/ESPR 2018 (PN pediátrica); SBP |
| N7 | **Indicadores de qualidade por unidade/grupo** (Δz nascimento→alta, % RCEU em 36 s/alta, dias para recuperar PN, mediana de IPM na alta), comparação entre unidades do grupo | M | M | Dados próprios; método do estudo JMIR 2020 |
| N8 | **Interoperabilidade real**: validação de CNS/CPF, ligar auditoria LGPD, endpoints PIX/PDQ; depois credenciamento DATASUS, FHIR R4 (RIA/RAC), certificado ICP-Brasil | M (A quando em produção) | A | Depende do MS: perfis de antropometria/marcos não públicos [NC] |
| N9 | **Acesso da família** (entidade Responsável com CPF, consentimento LGPD, visão somente-leitura de gráficos e relatório, link para Caderneta digital) | M | A | LGPD; sem referência externa |
| N10 | **PWA/offline** (cache de referências e conteúdo; fila de consultas) | B–M | A | Nenhum |

### 5.3 Não vale a pena agora / fora do escopo (com justificativa)

| Item | Motivo |
|---|---|
| **Fenton 2013/2025** | MS (Caderneta) e SBP adotam INTERGROWTH; tabelas LMS não publicadas, uso comercial exige licença Innovate Calgary; não intercambiável com INTERGROWTH (Cunha 2026) — misturar referências confunde o seguimento. Reavaliar só por exigência de cliente/UTIN que use Fenton. |
| **Olsen 2010/2015** | Referência norte-americana de tamanho ao nascer; INTERGROWTH cobre o caso; tabelas em periódico da AAP (direitos). |
| **Bilirrubina (AAP 2022 / Stanford)** | Fora da tese crescimento + dietoterapia; curvas da AAP são material protegido a digitalizar; erro tem consequência grave (exsanguíneo/kernicterus). Se um dia entrar, como módulo isolado com validação clínica formal. |
| **OMS 5–19 anos / CDC 2–20** | Produto é neonatal/puericultura até 5 anos; a Caderneta vai a 10 anos (OMS 2007). Esforço baixo (LMS mensal público) **se** a tese de produto mudar; hoje não. |
| **Crescimento fetal, altura uterina, EFW, CRL, Doppler, GWG** (app INTERGROWTH v2) | Obstetrícia; fora do escopo. |
| **Populações especiais** (Down, paralisia cerebral, MUAC, dobras) | Nicho; sem demanda registrada. |
| **Produzir conteúdo educativo próprio** | Caderneta (Parte I) e Guia Alimentar < 2 anos já cobrem e são oficiais; linkar os PDFs do MS na tela da criança. |
| **Carteira vacinal "oficial"** | Fonte da verdade é RNDS/PNI; terceiros não leem RNDS sem credenciamento; manter N4 como checklist/alerta, nunca como comprovante. |
| **Multi-idioma** | Público-alvo brasileiro. |
| **Saúde bucal (odontograma)** | Baixa relevância para RN/pré-termo; só se N2/N5 evoluírem para puericultura completa até 5 anos. |

---

## 6. Detalhe das lacunas priorizadas (referência · dados/licença · encaixe · riscos)

### Q1 — INTERGROWTH pós-natal comprimento e PC
- **Referência**: Villar J et al. *Lancet Glob Health* 2015;3(11):e681-91 (Postnatal Growth Standards for Preterm Infants); SBP DC Neonatologia
  nº 1/2017 e Manual nº 64/2023 (peso, comprimento **e PC** até 64 s); Caderneta 6ª ed. p. 88–89 (as 3 medidas).
- **Dados**: `https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-{boys,girls}_{lt,hc}_table.pdf` (z −3..+3 por semana
  exata 27–64), mesmo formato de `peso_{f,m}.json`. Peso/comprimento (35–65 cm): equações não publicadas, só via pacote `gigs` (Ohuma) —
  tratar como opcional. Licença: "use freely" sem termo formal → pedir confirmação escrita a intergrowth@wrh.ox.ac.uk; manter citação e
  "© University of Oxford" na UI/relatório.
- **Encaixe**: B `Data/Referencias/INTERGROWTH/{estatura,perimetro}_{f,m}.json`; `ZScoreService.CalcularZIntergrowth` já devolve null por
  chave ausente (teste `Intergrowth_nao_possui_estatura_nem_perimetro` passa a inverter); `ReferenciaController` `{tipo}/{medida}` já
  roteia; F `GraficosZScore.tsx` ganha seletor de medida no gráfico INTERGROWTH (hoje só peso); `ClassificacaoCrescimento` já tem cortes
  de estatura/PC. Atualizar ADR-001 (pendência explícita) e `Referencias/README.md`.
- **Riscos**: amostra pequena < 33 s (28 crianças); extrapolação além de ±3 por banda vizinha (já é a regra do peso); RCEU hoje é só de peso —
  decidir se PC/comprimento geram alerta.

### Q2 — Percentil e ganho esperado para manter o z
- **Referência**: percentil = Φ(z) (normal padrão; INTERGROWTH pós-natal e OMS são modelos normais/LMS). Ganho esperado = valor(z, t+Δ) −
  valor(z, t) nas tabelas (prática do PediTools e do app INTERGROWTH, "Weekly"). Para OMS pode-se usar também WHO Growth Velocity Standards
  2009 (incrementos de peso em 1, 2, 3 meses; tabelas públicas) como referência de velocidade.
- **Dados**: nenhum novo (opcional: tabelas de velocidade OMS 2009, xlsx público).
- **Encaixe**: B `AvaliacaoCrescimentoService.Avaliar` (campos `PercentilPeso/Estatura/Perimetro`, `GanhoEsperado7d`/`30d`); F
  `CriancaDetalhes.tsx` (aba consultas) e tooltip do `GraficoOms`/INTERGROWTH; incluir no CSV e no PDF (Q6).
- **Riscos**: percentil extremo (< 0,1%) com z além de ±3 após ajuste de caudas OMS — exibir "< P0,1"; comunicar que ganho esperado é
  "para manter o canal", não meta nutricional.

### Q3 — Tamanho ao nascer INTERGROWTH (PIG/AIG/GIG)
- **Referência**: Villar 2014 *Lancet* 384:857 (33–42+6 s, padrão); Villar 2016 *Lancet* 387:844 (24–32+6 s, **referência**, não padrão);
  Villar 2017 *Pediatr Res* (composição corporal, opcional). Cortes: PIG < P10, GIG > P90 (Caderneta p. 69 pede AIG/PIG/GIG).
- **Dados**: PDFs públicos `grow_newborn-{ct,zs}-{boys,girls}_{bw,lt,hc}_table.pdf` e `grow_verypreterm-*` por semana+dia; não usar para
  crescimento pós-natal (regra oficial). ≥ 33 s a distribuição é t assimétrica → **interpolar as tabelas publicadas** (centis e z), não
  assumir normal. Licença: idem Q1.
- **Encaixe**: B `RecemNascidoClassificacaoService` ganha `ClassificarAdequacaoIG(sexo, IG, peso/comprimento/PC)` → campos `ZNascimentoPeso…`,
  `AdequacaoPN` (PIG/AIG/GIG) em `RecemNascido`; `RecemNascidoController` POST/PUT; F `CriancaForm` mostra ao vivo (já faz para IG/PN);
  ML pode usar z ao nascer como feature em vez de gramas.
- **Riscos**: medidas "ao nascer" devem ser das primeiras 12–24 h; < 24 s sem referência; manter a classificação por gramas atual como
  informação complementar (é a usada no `Dashboard`/CSV).

### Q4 — OMS IMC/idade e peso/comprimento + posição da medida
- **Referência**: WHO Child Growth Standards 2006 (BMI-for-age, weight-for-length 45–110 cm, weight-for-height 65–120 cm); Caderneta p. 87
  (IMC/idade em todas as faixas; 0,7 cm entre deitado e em pé; troca aos 730,5 d); tabela "Como interpretar" (IMC: magreza acentuada,
  magreza, eutrofia, risco de sobrepeso, sobrepeso, obesidade).
- **Dados**: tabelas expandidas OMS (xlsx, LMS) públicas em who.int; `scripts/importar_referencias_oms.py` já converte. Licença OMS:
  CC BY-NC-SA 3.0 IGO em geral; **uso comercial requer permissão** (formulário de permissões da OMS) — já se aplica aos dados que usamos hoje.
- **Encaixe**: `Medida.Imc` e `Medida.PesoComprimento` em `ZScoreService` (chave por comprimento em vez de dia para P/C); `Consulta.PosicaoMedida`
  (deitado/em pé) e `Consulta.Imc` calculado; `ClassificacaoCrescimento` ganha IMC; `GraficoOms` ganha medidas IMC e P/C (eixo X em cm).
- **Riscos**: pré-termo ≤ 64 s não tem IMC OMS (usar INTERGROWTH P/C se Q1 incluir); descontinuidade 730/731 d já tratada na estatura.

### Q5 — Calculadora de datas, método da IG, hora do nascimento
- **Referência**: Fierson/AAP 2018 (definições de IG, IPM, idade corrigida); Caderneta p. 69 (IG por DUM/USG/exame do RN; hora do parto);
  SBP Manual nº 64 (idade corrigida).
- **Dados**: nenhum.
- **Encaixe**: B campos `DataHoraNascimento`, `MetodoIG`, `DUM`, `DPP` em `RecemNascido`; remover/derivar `IdadeGestacionalCorrigida*` (gravados,
  não usados); F `CriancaForm` com cálculo cruzado (DUM ↔ DPP ↔ IG) e aviso de inconsistência; widget "idade hoje: cronológica / IPM / corrigida"
  em `CriancaDetalhes` (hoje só IGC). Unificar `calcularIGC` do cliente com a regra do backend (duplicado).
- **Riscos**: hora do nascimento altera o "dia de vida" em neonatos (PediTools: dia do nascimento = dia 1) — definir convenção e registrá-la
  na ADR.

### Q6 — Relatório PDF / impressão
- **Referência**: layout da Parte II da Caderneta (p. 72–77 e 88–99) e do relatório de alta (p. 69) como modelo; app INTERGROWTH (PDF/XLSX) e
  PediTools (print/Copy summary) como benchmark.
- **Dados**: nenhum.
- **Encaixe**: opção A — PDF no servidor (QuestPDF/PdfSharp em B `Controllers/RelatorioController`, gráficos renderizados via SVG/ScottPlot);
  opção B — `@media print` + `window.print()` em F com página de impressão dedicada (menor esforço, sem assinatura). Conteúdo: identificação,
  classificação ao nascer, gráficos OMS/INTERGROWTH, tabela de consultas (z, percentil, classificação, alertas, VGP), dieta vigente, referência
  e tipo de idade usados, créditos (OMS/INTERGROWTH). Reusar para "relatório de alta/encaminhamento" (N1).
- **Riscos**: LGPD (dados identificados saindo do sistema) → registrar na auditoria (N8); fidelidade visual dos gráficos entre tela e PDF.

### Q7 — Export XLSX/CSV na UI e importação em lote
- **Referência**: PediTools bulk (formato: sexo, IG, idade/datas, medidas); ferramenta web INTERGROWTH (CSV ID/Sex/GA/Weight/Length/HC).
- **Dados**: nenhum.
- **Encaixe**: botão em `Pacientes`/`Dashboard` para `GET /api/exportar/pesquisa` (já existe, sem consumidor); `ClosedXML` para XLSX;
  `POST /api/importar/consultas` validando faixas (`ConsultaForm` já define) e rodando `Avaliar` por linha; relatório de linhas rejeitadas
  (padrão PediTools).
- **Riscos**: escape CSV (hoje só aspas simples no nome); duplicidade de consultas; auditoria do import.

### Q8 — Responsividade mobile
- **Referência**: app INTERGROWTH e Meu SUS Digital são mobile-first; CS tem sidebar fixa e gráficos de 960–1200 px.
- **Encaixe**: `Layout.tsx` (drawer/hambúrguer), alturas relativas em `GraficosZScore.tsx`/`GraficoOms.tsx`, tabelas com scroll horizontal.
- **Riscos**: nenhum relevante.

### N1 — Dados perinatais/alta e triagens neonatais
- **Referência**: Caderneta 6ª ed. p. 69–71; Portaria GM/MS 7.293/2025 (PNTN: 5 etapas, coleta 48 h–5º dia, laudo 3 dias úteis); Lei
  14.154/2021; Lei 13.002/2014 (linguinha) [NC nesta sessão]; coraçãozinho (SpO2 ≥ 95% e dif. < 3%, após 24 h); orelhinha (EOA/PEATE, ≤ 1 mês);
  Método Canguru (Portaria 1.683/2007).
- **Dados**: nenhum externo.
- **Encaixe**: B entidades `Perinatal` (1:1 RN), `InternacaoNeonatal`, `TriagemNeonatal` (tipo, data, resultado, encaminhamento); F nova aba
  "Nascimento e triagens" em `CriancaDetalhes`; alertas no dashboard: triagem pendente após prazo. `ClassificacaoIG` por IG já existe.
- **Riscos**: escopo cresce para prontuário; manter campos iguais aos da Caderneta para facilitar transcrição e futuro mapeamento RNDS.

### N2 — Vigilância do desenvolvimento
- **Referência**: Caderneta p. 78–86 (marcos por faixa, P/A/NV, instrumento com "provável atraso / alerta / adequado", retorno em 30 d, idade
  corrigida em pré-termos, PC fora de ±2 z, ≥ 3 alterações fenotípicas); Lei 13.438/2017; CAB 33; SBP (idade corrigida até 2–3 anos).
- **Dados**: lista de marcos e "como pesquisar" do MS (documento público; transcrever com revisão clínica). INTER-NDA (22–30 m) é alternativa
  padronizada INTERGROWTH, mas é instrumento de 37 itens licenciado para pesquisa — não adotar agora.
- **Encaixe**: B `MarcoDesenvolvimento` (catálogo), `AvaliacaoDesenvolvimento` por consulta (faixa resolvida pela idade **corrigida** via
  `ReferenciaCrescimentoService`, que já calcula), classificação e conduta; F checklist por faixa com cores da Caderneta; dashboard "alerta
  para o desenvolvimento".
- **Riscos**: instrumento é de triagem, não diagnóstico — rotular como tal; faixa 0–6 m e 6–18 m primeiro (nosso público).

### N3 — Aleitamento, alimentação e suplementação
- **Referência**: Caderneta p. 72–77 (LME/LM+LA/LA, dificuldades, desmame) e p. 102 (vit. A 6 m–4 a 11 m; ferro 6–24 m; NutriSUS; sem vit. D);
  Guia Alimentar para Crianças Brasileiras Menores de 2 Anos (2019, 12 passos); Portaria 1.920/2013 (Amamenta e Alimenta Brasil); SBP
  Departamento de Nutrologia — esquema de ferro e vitamina D para pré-termo/baixo peso (doses por faixa de peso ao nascer; **confirmar no
  documento SBP vigente antes de codificar**); NamingSystem RNDS `BRTipoAleitamentoMaterno` (usar os mesmos códigos).
- **Dados**: nenhum externo além dos documentos normativos.
- **Encaixe**: `Consulta.TipoAleitamento` (código RNDS), `Consulta.IntroducaoAlimentar`, entidade `Suplementacao` (produto, dose, início/fim)
  ligada à `Dieta` existente; regra de lembrete (ferro a partir de 30 d em pré-termo; vit. A por faixa); F em `ConsultaForm`/`DietaForm`.
- **Riscos**: doses são decisão clínica — sistema sugere, não prescreve; NutriSUS exclui outros esquemas (regra da Caderneta).

### N4 — Checklist vacinal PNI 2026 e nirsevimabe
- **Referência**: Calendário Nacional de Vacinação da Criança 2026 (DPNI, 30/01/2026) e IN CNV 2026; NT 31/2026-CGICI/DPNI (nirsevimabe:
  pré-termos ≤ 36+6 s com < 6 m na sazonalidade fev–ago; comorbidades < 24 m; dose por peso; registro nominal na RNDS); regras de pré-termo
  (BCG adiar se < 2.000 g; apneia ≤ 28 s: monitorar 48 h pneumo, 48–72 h MenC); vacina VSR na gestante ≥ 28 s (registrar no pré-natal, N1).
- **Dados**: calendário público, **muda anualmente** (VPC20 em transição, HPV dose única, MenACWY 12 m) → tabela versionada por ano/IN.
- **Encaixe**: B `EsquemaVacinal` (versão, vacina, dose, idade-alvo, janela), `RegistroVacina` (manual: data, lote opcional, fonte "informado
  pela família/caderneta"); regra de elegibilidade nirsevimabe na avaliação do RN; F aba "Vacinas" com status e aviso "não substitui a
  Caderneta/RNDS".
- **Riscos**: divergência com RNDS (fonte da verdade); responsabilidade legal → status informativo; manutenção anual da tabela.

### N5 — Calendário de consultas e notificações
- **Referência**: Caderneta p. 72–77 (1ª semana — 3º ao 5º dia —, 1, 2, 4, 6, 9, 12, 18, 24, 36 m); Método Canguru 3ª etapa e ambulatório
  de seguimento (SBP: peso diário até recuperar PN, 2×/semana até a alta; plotar semanalmente até 50–64 s).
- **Encaixe**: B `AgendaConsulta` gerada pelo calendário (cronológica para termo, corrigida para pré-termo), `DashboardController` "faltosos";
  notificações in-app primeiro (`Notificacao` + badge), depois e-mail (Identity já tem e-mail do profissional; RN tem `Email`/`TelefoneCelular`
  sem UI).
- **Riscos**: consentimento LGPD para contato com a família; spam.

### N6 — Nutrição parenteral/enteral completa
- **Referência**: ESPGHAN/ESPEN/ESPR/CSPEN guidelines on pediatric parenteral nutrition 2018 (energia, aminoácidos 1,5–3,5 g/kg, lipídios
  ≤ 3–4 g/kg, GIR 4–12 mg/kg/min, osmolaridade periférica); SBP Nutrologia (enteral do pré-termo: 110–135 kcal/kg, 3,5–4,5 g/kg proteína);
  PediTools "Simple PN" como UX de referência.
- **Encaixe**: `Dieta` ganha componentes (dextrose %, lipídio g/kg, aminoácido g/kg, eletrólitos) e cálculos (GIR, kcal não proteicas,
  relação kcal/g N, osmolaridade); `Alimento` ganha CHO/lipídio/Ca/P/Na/K. ML (`growth_predictor`) pode incluir GIR/lipídio como features.
- **Riscos**: fórmula de osmolaridade é aproximação (PediTools avisa); validação clínica obrigatória.

### N7 — Indicadores de qualidade por unidade/grupo
- **Referência**: Chou et al., JMIR 2020 (Δz peso nascimento→alta por UTIN, −0,81 em 7.975 pré-termos); Vermont Oxford Network (indicadores
  de RCEU na alta/36 s); SBP (recuperar PN, velocidade ≥ 15 g/kg/dia).
- **Encaixe**: `AnalyticsController`/ml-service `analytics` já agregam; novo endpoint por `TenantId`/`GrupoSaudeId`: Δz nascimento→alta,
  % RCEU na alta, dias até recuperar PN, VGP mediana por faixa de IG; gráficos no `Dashboard` (hoje sem gráficos agregados). Exige "alta"
  registrada (N1).
- **Riscos**: comparação entre unidades precisa de ajuste por IG/peso; dados sintéticos do seed distorcem.

### N8 — Interoperabilidade real (CNS/CPF, auditoria, PIX/PDQ, RNDS)
- **Referência**: Portaria GM/MS 1.434/2020 (RNDS); Guia de Integração RNDS (passo a passo: certificado digital, Portal de Serviços DATASUS,
  homologação → produção por UF; FHIR R4; `X-Authorization-Server`); IG FHIR RNDS 1.0.0 (REL, Indivíduo, Profissional, Estabelecimento,
  NamingSystems); PEC e-SUS APS envia RAC/RIA/RPM; IHE PIX/PDQ (ITI-8/9/21 ou PIXm/PDQm FHIR).
- **Dados**: perfis RNDS de antropometria/marcos **não públicos** [NC] → contato meususdigital.cgiis@saude.gov.br / Portal de Serviços.
- **Encaixe**: fase 0 — validar CNS (DV) e CPF em `PacienteIdentificador`/RN, **chamar** `IAuditoriaAcessoService` nos controllers (hoje
  nunca invocado), expor `PixService`/`PdqService` em controller com `[Authorize]`; fase 1 — cliente FHIR R4 (Firely SDK .NET) para
  `Patient`/`Observation` (LOINC 29463-7 peso, 8302-2 comprimento, 9843-4 PC; `BRUnidadeMedida`), exportação de Bundle; fase 2 — credenciamento
  e envio RIA/RAC quando houver estabelecimento em produção. Corrigir docs que afirmam auditoria/criptografia já implementadas.
- **Riscos**: dependência do MS; certificado ICP-Brasil A1 por estabelecimento; LGPD (dados de menor); PIX/PDQ atuais são locais e os DTOs não
  são mensagens HL7 (doc de investidores sobrestima).

### N9 — Acesso da família
- **Referência**: Caderneta digital (gov.br prata/ouro, 2FA, multi-responsável, registro de marcos pela família); LGPD art. 14 (dados de
  crianças: consentimento específico de um dos pais/responsável).
- **Encaixe**: entidade `Responsavel` (CPF, vínculo, consentimento), role `Familia` somente-leitura, visão restrita (gráficos, relatório Q6,
  próximas consultas N5, links para conteúdo oficial). Alternativa de menor custo: Q6 (PDF compartilhável) + orientação para a Caderneta digital.
- **Riscos**: autenticação de cidadão (gov.br OIDC exige credenciamento como cliente), LGPD, suporte; **recomendado adiar** até Q6/N5.

### N10 — PWA/offline
- **Encaixe**: `vite-plugin-pwa`, cache das curvas (`/api/referencias/*` são estáticas), fila de consultas offline com reconciliação.
- **Riscos**: conflitos de sincronização em multi-tenant; o doc de investidores já promete, o código não tem nada.

---

## 7. Achados colaterais (fora do escopo deste diagnóstico; listar como follow-ups)
- `AuthController` expõe `register` e `reset-password` anônimos (`Controllers/AuthController.cs:208,323`).
- `AnalyticsController` e `ChatService.get_patient_data` não filtram por tenant; ml-service sem autenticação e lendo o banco inteiro;
  ETL com f-string de id.
- ML usa `Consulta.ZScorePeso` sem distinguir `ReferenciaCurva` (mistura escalas OMS/INTERGROWTH no alvo); horizonte único treinado.
- `IdadePreTermoLimite` (unidade) e `IdadeGestacionalCorrigida*` (RN) gravados e ignorados pelas regras.
- `GET /api/exportar/pesquisa`, `/acompanhamento` (chama endpoints inexistentes) e `ZScoreHistoryChart` sem uso.
- `DOCUMENTO_TECNICO_INVESTIDORES.md` e `interoperabilidade-sus.md` afirmam auditoria, criptografia, PWA e "Intergrowth 24–64 s" que o
  código não tem; `backend/docs/INTERGROWTH_DATA_NOTES.md` descreve arquivos já removidos.
- `docs/atualizacao 2026-10-26/` tem 5 PDFs duplicados e 5 PDFs novos não rastreados (`git status`).

---

## 8. Fontes consultadas (acesso em 2026-10-30)

**PediTools**
- https://peditools.org/ · https://peditools.org/about/ · https://peditools.org/whatsnew/ · https://peditools.org/charts/
- https://peditools.org/growth_engine/sources.php (auditoria linha a linha, out/2026)
- https://peditools.org/growth/?calc=fenton_2013 · `fenton_2025` · `olsen_2010` · `intergrowth_newborn` · `intergrowth_postnatal` · `who_infant` · `who_daily_0_5` · `cdc_infant`
- https://peditools.org/growth/growthchart · https://peditools.org/growth/bulk · https://peditools.org/bilirubin/ · https://peditools.org/dates/ · https://peditools.org/pn/
- https://peditools.org/legacy/ · https://peditools.org/app-privacy/ · https://peditools.org/peditools_universal/
- Chou JH, Roumiantsev S, Singh R. *J Med Internet Res* 2020;22(1):e16204 — https://pmc.ncbi.nlm.nih.gov/articles/PMC7058170
- https://github.com/jhchou/peditools · https://github.com/jhchou/peditools2
- Fenton (Univ. Calgary, licenças): https://ucalgary.ca/resource/preterm-growth-chart/preterm-growth-chart · Fenton 2025: *Paediatr Perinat Epidemiol* 2025;39(6):543-555, doi:10.1111/ppe.70035
- CDC data files: https://www.cdc.gov/growthcharts/cdc-data-files.htm
- https://bilitool.org/ (não é do PediTools)

**INTERGROWTH-21st**
- Google Play: https://play.google.com/store/apps/details?id=com.olamalu.intergrowth.intergrowth21 · App Store: https://apps.apple.com/us/app/intergrowth-21st/id6443848059
- Lançamentos: https://intergrowth21.com/news/intergrowth-21st-launches-new-app-newborn-and-preterm-growth-standards · https://www.wrh.ox.ac.uk/news/intergrowth-21st-launches-version-2-of-its-growth-standards-app-expanding-to-fetal-growth-and-multilingual-access
- Catálogo: https://intergrowth21.com/intergrowth-21st-applications-calculators · https://intergrowth21.tghn.org/standards-tools/ · https://intergrowth21.com/tools-resources/translated-resources-charts-and-tables
- Padrões: https://intergrowth21.com/tools-resources/postnatal-growth-preterm-infants · https://intergrowth21.com/tools-resources/newborn-size · https://intergrowth21.com/tools-resources/newborn-size-very-preterm-infants · https://intergrowth21.com/node/142
- Tabelas: https://intergrowth21.com/sites/default/files/2023-02/grow_preterm-zs-boys_bw_table.pdf (padrão `grow_preterm-{ct|zs}-{boys|girls}_{bw|lt|hc}_table.pdf`; `grow_newborn-*`; `/2025-09/grow_verypreterm-*`)
- Política de limites de IG (out/2025): https://intergrowth21.com/sites/default/files/2025-10/policy_on_gestational_age_limits_for_fetal_growth_standards_5.pdf
- Calculadoras web: http://intergrowth21.ndog.ox.ac.uk/preterm · http://intergrowth21.ndog.ox.ac.uk/ · guia 2017: https://intergrowth21.com/sites/default/files/2023-02/preterm_app_-_instructions_faq_2017_04_13.pdf
- Pacotes: https://docs.ropensci.org/gigs · https://github.com/ropensci/gigs · https://github.com/lshtm-gigs/gigs-stata · https://github.com/ki-tools/growthstandards · JOSS doi:10.21105/joss.07655
- Artigos: Villar 2014 *Lancet* 384:857 (doi:10.1016/S0140-6736(14)60932-6) · Villar 2015 *Lancet Glob Health* 3:e681 (doi:10.1016/S2214-109X(15)00163-1; https://openaccess.sgul.ac.uk/id/eprint/107857) · Villar 2016 *Lancet* 387:844 (doi:10.1016/S0140-6736(16)00384-6)
- SBP: https://www.sbp.com.br/fileadmin/user_upload/2017/03/Neonatologia-Monitoramento-do-cresc-do-RN-pt-270117.pdf · https://www.sbp.com.br/fileadmin/user_upload/24038c-ManOrient_-_AvalCrescim_o_que_PediatraPrecisaSaber.pdf · https://www.sbp.com.br/departamentos/endocrinologia/graficos-de-crescimento/ · https://www.sbp.com.br/?p=10773
- Comparações: Cunha et al., *J Pediatr (Rio J)* 2026;102(5):101575 (https://www.sbp.com.br/wp-content/uploads/2026/09/Reporte-Semanal-JPed-No-24-•-2026.pdf) · Kim, *J Pediatr (Rio J)* 2026;102(6) (https://www.jped.com.br/en-exploring-nuances-preterm-growth-charts-articulo-S002175572600118X) · RBSMI 2022 (https://scielo.br/j/rbsmi/a/Xn7QvwmvpbhtDVPZ6PBbZvG/?lang=en) · Silveira & Procianoy, *J Pediatr (Rio J)* 2019 (https://www.jped.com.br/en-preterm-newborn-s-postnatal-growth-patterns-articulo-S0021755718310805)
- AAP (ferramentas de crescimento do pré-termo): https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-nutrition-assessment-tools/preterm-infant-growth-tools/ · ESPGHAN 2022/2023: https://eprints.gla.ac.uk/284736 · SAP 2020: https://www.sap.org.ar/docs/pdf/consensos_recomendaciones-para-la-evaluacion-del-tamano-al-nacer-y-del-crecimiento-posnatal-de-los-recien-nacidos-prematuros-106.pdf

**Caderneta da Criança / Meu SUS Digital / RNDS / normativas**
- https://www.gov.br/saude/caderneta-digital-da-crianca · FAQ: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-da-crianca/caderneta-digital-da-crianca/faq
- Serviços gov.br: https://www.gov.br/pt-br/servicos/acessar-informacoes-sobre-o-cuidado-da-crianca-por-meio-do-meu-sus-digital · https://www.gov.br/pt-br/servicos/obter-a-caderneta-da-crianca
- Lançamento (11/04/2025): https://agenciagov.ebc.com.br/noticias/202504/app-meu-sus-digital-disponibiliza-caderneta-de-saude-da-crianca
- Meu SUS Digital: https://www.gov.br/saude/pt-br/composicao/seidigi/meususdigital · Play: https://play.google.com/store/apps/details?id=br.gov.datasus.cnsdigital · App Store: https://apps.apple.com/br/app/meu-sus-digital/id1045754608
- Caderneta 6ª ed. (PDFs): https://bvsms.saude.gov.br/bvs/publicacoes/caderneta_crianca_menino_6ed.pdf · https://bvsms.saude.gov.br/bvs/publicacoes/caderneta_crianca_menina_6ed.pdf · notícia: https://www.gov.br/saude/pt-br/assuntos/noticias/2024/maio/conheca-a-6a-edicao-da-2018caderneta-da-crianca-2013-passaporte-da-cidadania2019-lancada-pelo-ministerio-da-saude
- PNI: calendário 2026 https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca/@@download/file · https://www.gov.br/saude/pt-br/composicao/svsa/pni/calendario-tecnico/calendario-tecnico-nacional-de-vacinacao-crianca · publicações/IN: https://www.gov.br/saude/pt-br/vacinacao/publicacoes
- Nirsevimabe: NT 31/2026 https://www.gov.br/saude/pt-br/composicao/svsa/pni/notas-tecnicas/2026/nota-tecnica-no-31-2026-cgici-dpni-svsa-ms · guia: https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2026/guia-de-estrategia-contra-virus-sincicial-para-criancas-prematuras.pdf
- PNTN: Portaria GM/MS 7.293/2025 https://bvsms.saude.gov.br/bvs/saudelegis/gm/2025/prt7293_27_06_2025.html · Lei 14.154/2021 https://www.gov.br/saude/pt-br/composicao/saes/triagem-neonatal/legislacao/legislacao-geral/lei-no-14-154-de-26-de-maio-de-2021
- RNDS: Portaria 1.434/2020 https://bvsms.saude.gov.br/bvs/saudelegis/gm/2020/prt1434_29_05_2020.html · https://www.gov.br/saude/pt-br/assuntos/rnds · guia http://rnds-guia.saude.gov.br/docs/passo-a-passo/ · http://rnds-guia.saude.gov.br/docs/rnds/ambientes/ · IG FHIR https://rnds-fhir.saude.gov.br/ImplementationGuide/rnds · modelos 2025 https://www.gov.br/saude/pt-br/centrais-de-conteudo/apresentacoes/2025/modelos-informacionais-do-rel-rac-e-teleinterconculta.pdf · PEC→RNDS https://www.cosemssc.org.br/wp-content/uploads/2022/09/Integracao-PEC-e-SUS-a-RNDS.pdf
- Outras normativas: Portaria 1.058/2005 (Caderneta) https://bvsms.saude.gov.br/bvs/saudelegis/gm/2005/prt1058_04_07_2005.html · PNAISC Portaria 1.130/2015 https://bvsms.saude.gov.br/bvs/saudelegis/gm/2015/prt1130_05_08_2015.html · Amamenta e Alimenta Portaria 1.920/2013 https://bvsms.saude.gov.br/bvs/saudelegis/gm/2013/prt1920_05_09_2013.html · Método Canguru Portaria 1.683/2007 https://bvsms.saude.gov.br/bvs/saudelegis/gm/2007/prt1683_12_07_2007.html · Guia Alimentar < 2 anos https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_criancas_brasileiras_menores_2anos.pdf · antropometria https://bvsms.saude.gov.br/bvs/publicacoes/orientacoes_coleta_analise_dados_antropometricos.pdf · NutriSUS https://aps.saude.gov.br/ape/pcan/nutrisus · SBP guia da Caderneta https://www.sbp.com.br/fileadmin/user_upload/20415d-GPA_-_Caderneta_Saude_da_Crianca.pdf

**OMS**
- https://www.who.int/tools/child-growth-standards/standards (peso, comprimento/estatura, PC, IMC, peso/comprimento; tabelas expandidas) · direitos: https://www.who.int/about/policies/publishing/copyright

**Não acessível nesta sessão**: área logada de cadernetadacrianca.saude.gov.br (SSO gov.br); fentongrowth.ca (TLS); texto completo de Fenton 2013
no PMC (reCAPTCHA); pôster BAPM do app INTERGROWTH; manual e-SUS APS (404). Itens marcados [NC] dependem dessas fontes.
