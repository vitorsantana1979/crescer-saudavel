# Plano — novidades do benchmark (PediTools · app INTERGROWTH · Caderneta SUS)

Status: **proposto em 2026-10-30, aguardando aprovação** · Base: `docs/DIAGNOSTICO_BENCHMARK_FERRAMENTAS.md`,
`docs/ADR-001-curvas-de-referencia-e-zscore.md`, `docs/CRESCER_SAUDAVEL_NOVIDADES_EQUIPE_CLINICA.pdf` · HEAD `d57c37b`.

## Estado atual (conferido no código)

| Item | Estado |
|---|---|
| OMS 0–5 a: peso/idade, **estatura/idade, PC/idade** — z, classificação, gráfico com 5 recortes e seletor de medida (`GraficoOms`) | **feito** (Fases 1–3, commits `7cf4246`, `4c009fe`, `877b280`) |
| INTERGROWTH-21st pré-termo 27–64 s: **peso** | feito |
| INTERGROWTH-21st pré-termo: **comprimento e PC** | **falta** — sem tabelas em `Data/Referencias/INTERGROWTH/`; gráfico INTERGROWTH em `GraficosZScore.tsx` só mostra peso |
| Classificação por z (tabela MS) para as 3 medidas, alertas RCEU/queda, VGP | feito |
| Percentil, IMC, PIG/AIG/GIG, ganho esperado, datas, PDF, planilhas, puericultura | não existe |

Observação: o pedido "entrar com PC × idade e estatura × idade" está coberto na OMS; o que falta são as duas medidas na
curva **INTERGROWTH** (pré-termo), que é a Fase 1 abaixo. Nada foi validado com banco real (inacessível daqui).

## Objetivo

Implementar as novidades do benchmark em ondas, começando pelas curvas completas (peso, estatura, PC) nas duas referências,
e encerrar com uma apresentação (como o PDF de stakeholders) mostrando tudo o que foi implementado e a matriz comparativa
atualizada.

## Escopo

- **Dentro**: Onda 1 completa (Fases 0–7); Ondas 2 e 3 descritas em alto nível, detalhadas ao chegar; apresentação final.
- **Fora**: Fenton, Olsen, bilirrubina, obstetrícia, OMS 5–19 a, conteúdo educativo próprio, carteira vacinal oficial,
  multi-idioma, saúde bucal (ver §5.3 do diagnóstico). Achados colaterais de segurança (§7) ficam em tarefa própria.

## Premissas (defaults — mudam se a equipe clínica decidir diferente)

1. RCEU continua só por peso; comprimento/PC do pré-termo abaixo de −2 entram na classificação "cuidado" já existente.
2. Idade corrigida até 24 m (configurável), como hoje.
3. Percentil = Φ(z); extremos exibidos como "< P0,1" / "> P99,9".
4. Relatório PDF: página de impressão dedicada (`@media print` + `window.print()`), gerada pelo navegador; PDF no servidor
   só se a equipe exigir assinatura/logo fixos.
5. Tabelas INTERGROWTH: uso continua com crédito "© University of Oxford"; pedido de confirmação de licença é tarefa
   administrativa paralela, não bloqueia o desenvolvimento.

## Regras transversais

- Uma fase = um ou mais commits próprios; `dotnet build` + xUnit + `vite build` + `tsc` antes de cada commit.
- Sem banco aqui: validação visual no preview (`vite dev` + mock da API) e por testes; migrations acumulam e são aplicadas
  no deploy, seguidas de `POST /api/consultas/recalcular-zscores`.
- Cada decisão clínica vira item na ADR-001 (ou ADR nova para puericultura).
- Sem trailers de coautoria em commits.

---

## Onda 1 — avaliação do crescimento completa + saídas

### Fase 0 — dados INTERGROWTH de comprimento e PC
- Baixar as tabelas oficiais `grow_preterm-zs-{boys,girls}_{lt,hc}_table.pdf` (intergrowth21.com), extrair as linhas
  z = −3..+3 por semana 27–64 e gerar `estatura_{f,m}.json` e `perimetro_{f,m}.json` no mesmo formato de `peso_{f,m}.json`
  (script em `scripts/`, conferência automática contra o PDF).
- Atualizar `Data/Referencias/README.md`.
- **Validação**: amostras (27, 40, 64 s; z −2/0/+2) iguais ao PDF; `ZScoreService` carrega as 4 tabelas; testes passam.
- **Replanejar se**: PDFs sem texto extraível → usar o pacote `gigs` (R) como fonte e registrar na ADR.

### Fase 1 — pré-termo com as três medidas
- Backend: `ZScoreService.CalcularZIntergrowth` já roteia por chave (medida, sexo) — inverter o teste
  `Intergrowth_nao_possui_estatura_nem_perimetro`; `AvaliacaoCrescimentoService` passa a gerar z e classificação de
  estatura/PC também na INTERGROWTH; endpoint `/api/referencias/INTERGROWTH/{medida}/{sexo}` já existe.
- Frontend: seletor de medida (peso / comprimento / PC) no gráfico INTERGROWTH de `GraficosZScore.tsx`, eixos e domínios
  por medida; detalhe da criança mostra z/classificação das 3 medidas no período INTERGROWTH.
- ADR-001: fechar a pendência "tabelas INTERGROWTH de comprimento e PC".
- **Validação**: xUnit (z de pré-termo para comprimento/PC em pontos conhecidos); preview `/dev/...` com pontos fictícios.

### Fase 2 — adequação ao nascer (PIG / AIG / GIG)
- Tabelas INTERGROWTH de tamanho ao nascer (`grow_newborn-*` 33–42+6 s e `grow_verypreterm-*` 24–32+6 s; peso, comprimento,
  PC; centis e z publicados, interpolação pelas tabelas — não assumir normal ≥ 33 s).
- `RecemNascidoClassificacaoService.ClassificarAdequacaoIG` → campos `ZNascimentoPeso/Estatura/Perimetro`, `AdequacaoPN`
  (PIG < P10, AIG, GIG > P90) em `RecemNascido` (migration); cadastro mostra ao vivo; detalhe, dashboard e CSV.
- **Validação**: xUnit em limites P10/P90; preview do cadastro.

### Fase 3 — percentil e ganho esperado
- `Consulta.PercentilPeso/Estatura/Perimetro` e `GanhoEsperado7d` (INTERGROWTH) / `GanhoEsperado30d` (OMS) calculados em
  `Avaliar` (migration); detalhe, tooltip dos gráficos e CSV.
- **Validação**: xUnit (Φ(z) em z = −1,28 → P10; ganho = valor(z, t+Δ) − valor(z, t)); preview.

### Fase 4 — IMC/idade e peso/comprimento (OMS) + posição da medida
- Importar tabelas expandidas OMS de IMC/idade e peso/comprimento (45–110 cm) / peso/estatura (65–120 cm) com
  `scripts/importar_referencias_oms.py`; `Medida.Imc` e `Medida.PesoComprimento` no `ZScoreService` (chave por cm para P/C).
- `Consulta.PosicaoMedida` (deitado/em pé) e `Consulta.Imc`; correção de 0,7 cm; classificação de IMC (magreza acentuada …
  obesidade) em `ClassificacaoCrescimento`; `GraficoOms` ganha as duas medidas; formulário de consulta.
- **Validação**: xUnit; preview; export inclui IMC.

### Fase 5 — datas e idades
- `RecemNascido`: `DataHoraNascimento`, `MetodoIG` (DUM/USG/exame), `DUM`, `DPP` (migration); remover ou derivar
  `IdadeGestacionalCorrigida*` não usados.
- Cadastro com cálculo cruzado DUM ↔ DPP ↔ IG e aviso de inconsistência; widget "idade hoje: cronológica / pós-menstrual /
  corrigida / dia de vida" no detalhe; unificar `calcularIGC` do cliente com a regra do backend.
- **Validação**: xUnit (conversões de data); preview do cadastro e detalhe.

### Fase 6 — relatório PDF e planilhas
- Página de impressão do acompanhamento: identificação, classificação ao nascer, gráficos OMS/INTERGROWTH, tabela de
  consultas (z, percentil, classificação, alertas, VGP), dieta vigente, referência usada, créditos OMS/INTERGROWTH.
- Botão de exportação (`GET /api/exportar/pesquisa` já existe) + XLSX (ClosedXML); `POST /api/importar/consultas` com
  validação de faixas e relatório de linhas rejeitadas; registro em auditoria.
- **Validação**: PDF gerado em headless e conferido página a página; import com linhas válidas/inválidas em teste.

### Fase 7 — responsividade
- Drawer no `Layout`, alturas relativas em `GraficosZScore`/`GraficoOms`, tabelas com rolagem horizontal.
- **Validação**: preview a 375 px e 768 px.

## Onda 2 — puericultura da Caderneta (detalhar ao chegar; exige validação clínica do conteúdo)

- N1 nascimento/internação/alta + triagens neonatais com prazos · N2 vigilância do desenvolvimento (marcos, idade corrigida,
  3 classificações) · N3 aleitamento/alimentação/suplementação · N4 checklist vacinal PNI 2026 + nirsevimabe · N5 agenda das
  10 consultas + faltosos + notificações in-app.
- Pré-requisitos: lista de marcos revisada, doses de suplementação confirmadas (SBP), dono da atualização anual do calendário.

## Onda 3 — aprofundar e integrar (detalhar ao chegar)

- N6 NPT/enteral completa · N7 indicadores por unidade/grupo · N8 interoperabilidade fase 0 (CNS/CPF, auditoria chamada,
  PIX/PDQ com endpoint) · N9 acesso da família · N10 PWA/offline.

## Fase final — apresentação

- HTML → PDF no mesmo formato de `docs/CRESCER_SAUDAVEL_NOVIDADES_EQUIPE_CLINICA.pdf`: o que foi implementado (com capturas
  do preview), a matriz comparativa atualizada (colunas PediTools · app INTERGROWTH · Caderneta · Crescer Saudável) e o que
  ficou para as ondas seguintes.
- Atualizar ADR-001, o diagnóstico (§2 e §4) e o PDF de stakeholders.
- **Validação**: PDF conferido página a página; matriz confere com o código.

## Gatilhos de replanejamento

- Tabelas INTERGROWTH não extraíveis ou licença negada por escrito.
- Equipe clínica alterar cortes (PC, RCEU, idade corrigida) ou pedir alerta próprio para comprimento/PC.
- Fase 6: se a impressão pelo navegador não atender (assinatura, lote), migrar para PDF no servidor.
- Onda 2 sem conteúdo validado → pausa na fase correspondente, não pula.
