# Diagnóstico — Gráficos de crescimento (OMS peso/idade e INTERGROWTH-21st)

Data: 2026-10-28
Base: arquivos desta pasta, código atual (`backend/CrescerSaudavel.Api/Services/ZScoreService.cs`, `Controllers/ConsultaController.cs`, `frontend/src/components/GraficosZScore.tsx`), dados em `backend/CrescerSaudavel.Api/Data/Referencias/` e fontes externas listadas no fim.

---

## 1. O que há na pasta

| Arquivo | Conteúdo | Observação |
|---|---|---|
| `1..5. Gráfico ... meninas/meninos ... .pdf` (10) | Gráficos oficiais OMS peso-para-idade, escores z, 5 recortes × 2 sexos | Idênticos aos PDFs do site da OMS |
| `Gráfico ... meninas ... .pdf` e `Tabela de peso ... meninas_6 meses a 2 anos.pdf` (5, sem número) | Duplicatas byte a byte dos numerados de meninas | Podem ser apagados |
| `Instruções em inglês.pdf` | Notas técnicas OMS para reproduzir os gráficos a partir das tabelas expandidas | Ver §2.3 |
| `Pontuações z ... tabelas expandidas - PESO X IDADE.xlsx` (2) | Tabela **diária**, dia 0 a 1856, colunas `L, M, S` + `SD4neg..SD4` (3 casas decimais) | Fonte canônica para cálculo e para desenhar curvas |
| `Tabela ... Nascimento até 13 semanas.xlsx` (2) | Tabela **semanal** 0–13 semanas, `L, M, S` + `SD3neg..SD3` (1 casa decimal) | "Recorte UTIN" |
| `Tabela ... do nascimento aos 5 anos.xlsx` (2) | Tabela **mensal** 0–60 meses, `L, M, S` + `SD3neg..SD3` (1 casa decimal) | "Recorte acompanhamento" |

**Só cobre peso-para-idade.** Não há aqui estatura/idade, perímetro cefálico/idade, IMC/idade nem peso/comprimento. A OMS disponibiliza tabelas expandidas equivalentes para estatura/idade e PC/idade (verificado nas páginas oficiais, ver §7) — o sistema hoje tem esses dois indicadores vazios (§4-B).

## 2. Os 5 recortes OMS — o que cada gráfico é

Todos: linhas **z −3 (preta), −2 (vermelha), 0 (verde), +2 (vermelha), +3 (preta)**. Não há linhas ±1. Moldura rosa (meninas) / azul (meninos). Eixo X = idade **completa** (semanas/meses/anos completos). Eixo Y em kg, com grade fina de 0,1 kg nos recortes 1–4 e de 0,5 kg no recorte 5.

| # | Recorte | Eixo X | Eixo Y (F / M) | Grade vertical | Uso clínico |
|---|---|---|---|---|---|
| 1 | Nascimento → 6 meses | semanas 0–13, depois meses 3–6 | 2–10 kg / 2–11 kg | 1 linha por semana | UTIN, alta, primeiras consultas (termo) |
| 2 | Nascimento → 2 anos | meses 1–11 · 1 ano · 1–11 · 2 anos | 2–17 kg | 1 por mês | Puericultura 1º/2º ano |
| 3 | 6 meses → 2 anos | meses 6–11 · 1 ano · 1–11 · 2 anos | 5–17 kg / 6–17 kg | 1 por mês | Zoom do 2º semestre em diante |
| 4 | 2 → 5 anos | 2 anos · meses 2,4,6,8,10 · ... · 5 anos | 7–30 kg / 8–28 kg | 1 por 2 meses | Pré-escolar |
| 5 | Nascimento → 5 anos | marcas a cada 2 meses, anos destacados | 2–30 kg / 2–28 kg | 1 por 2 meses | Visão geral |

Os recortes são **filtros de janela** sobre a mesma curva (mesma tabela expandida). Diferem apenas em domínio X/Y, unidade dos rótulos e densidade da grade.

### 2.3 Notas técnicas da OMS (do PDF de instruções)
1. Tabelas em **dias**; para rotular em meses usar **1 mês = 30,4375 dias** (2 m = 60,875 d; 24 m = 730,5 d).
2. Tabelas vão até **1856 dias** (60,98 meses) para cobrir 60 meses completos.
3. Estatura/idade tem **descontinuidade em 730/731 dias** (deitado → em pé).
4. Após reproduzir os gráficos, **conferir sistematicamente as linhas contra as tabelas**.

## 3. Regras clínicas de referência (pesquisa)

| Situação | Referência | Eixo de idade | Fonte |
|---|---|---|---|
| Nascido a termo (IG ≥ 37 s) | OMS 2006, 0–5 anos | idade cronológica | OMS |
| Pré-termo (IG < 37 s), até **64 semanas pós-menstruais** | **INTERGROWTH-21st Postnatal Growth Standards for Preterm Infants** (peso, comprimento, PC; tabela semanal 27–64 s) | idade pós-menstrual (IG + idade cronológica) | INTERGROWTH-21st; SBP Manual nº 64/2023 |
| Pré-termo, **após 64 semanas** | **OMS**, com idade corrigida | idade corrigida (literatura: maioria recomenda corrigir até 2 anos; não achei limite oficial explícito MS/SBP) | SBP; revisões |
| Pré-termo com IG < 33 s | INTERGROWTH válido, mas amostra pequena ("robustas a partir de 33 semanas") | — | SBP |
| Pré-termo com IG < 32 s | canal de crescimento definido pelo peso quando **recomeça o ganho**, não pelo peso ao nascer | — | SBP |
| Curvas de **tamanho ao nascer** INTERGROWTH (33–42 s e "very preterm" 24–32 s) | **não** usar para crescimento pós-natal | — | INTERGROWTH-21st |

Trecho da SBP (Manual de Orientação nº 64, 08/05/2023, "Avaliação do crescimento: o quê o Pediatra precisa saber"):

> "A Sociedade Brasileira de Pediatria recomenda que os recém-nascidos pré-termos tenham seu peso, comprimento e perímetro cefálico acompanhados utilizando as curvas de crescimento pós-natal do Intergrowth®, até 64 semanas pós-concepcionais, quando deverão ser acompanhadas usando as curvas de crescimento da OMS."

Continuidade INTERGROWTH → OMS confere nos dados: aos 64 s (= 24 s pós-termo = dia 168 OMS), meninas: mediana 7,11 kg nos dois; −2z 5,50 vs 5,58; +2z 9,19 vs 9,10. A transição é suave.

Pontos de corte/interpretação (tabela "Como interpretar os gráficos", já em `docs/`): z < −3 muito baixo; −3 ≤ z < −2 baixo; −2 ≤ z < −1 e +1 < z ≤ +2 "atenção"; −1 ≤ z ≤ +1 adequado; z > +2 elevado; z > +3 (IMC) obesidade. OMS/CDC usam ±2 como corte de anormalidade.

## 4. Estado atual do sistema — achados

### Críticos (bloqueiam uso clínico)

**A. O z-score de peso nunca é calculado, nem para termo nem para pré-termo.**
`CalcularZ` (`ZScoreService.cs:157`) procura a chave `{tipo}/peso_{sexo}` no dicionário `_cache`. Mas:
- `oms/peso_f` e `oms/peso_m` são carregados em `_cacheWeightData` (formato `weeks/z_-3`), nunca em `_cache` (`LoadAll` faz `continue` antes).
- Não existe `INTERGROWTH/peso_f.json` nem `peso_m.json` (foram apagados no commit `cdd7586`; sobraram `peso_pretermo_*`, `peso_intergrowth_*_full`, etc.).
Resultado: `ZScorePeso = null` em toda consulta → `AlertaRCEU` e `AlertaQuedaPonderal` nunca disparam; export, dashboards e chat IA ficam sem z. (Conclusão por leitura do código; a conexão ao banco para confirmar falhou — `OperationalError`.)

**B. Estatura e perímetro cefálico: referência inexistente.**
`OMS/estatura_*.json` e `OMS/perimetro_*.json` estão **vazios** (`[]`), e o controller pede as medidas `"comprimento"` e `"pc"` — chaves que não correspondem a nenhum arquivo. Z nulo sempre.

**C. Fórmula errada quando funcionar.**
Usa aproximação linear `(valor − M) / ((SD+1 − SD−1)/2)`. A distribuição de peso é assimétrica; a OMS usa LMS: `z = ((y/M)^L − 1) / (L·S)`, com ajuste além de ±3 (`z = 3 + (y − SD3)/(SD3 − SD2)`). Erro medido com a tabela expandida (meninas):

| idade | peso | z LMS (correto) | z linear (atual) | erro |
|---|---|---|---|---|
| dia 0 | 2,0 kg | −3,09 | −2,69 | 0,40 |
| 1 ano | 6,5 kg | −2,69 | −2,22 | 0,47 |
| 2 anos | 8,0 kg | −3,07 | −2,43 | 0,64 |
| 3 anos | 20,0 kg | +2,69 | +3,42 | 0,73 |
| 5 anos | 10,5 kg | −3,92 | −2,83 | 1,08 |
| 5 anos | 30,0 kg | +3,10 | +4,33 | 1,23 |

Muda classificação (ex.: "muito baixo peso" vira "baixo peso").

**D. Resolução de idade e qualidade dos dados OMS atuais.**
- `CalcularZ` pega qualquer ponto a ±1 semana, sem interpolar. Na 2ª semana de vida a mediana varia 0,19 kg entre o dia 7 e o dia 13.
- `OMS/peso_*.json` atual é **quinzenal** (0–260 s, 131 pontos), gerado por interpolação linear da tabela mensal. Erro de até 0,10 kg na mediana da semana 2 (3,67 vs 3,569 real) e perde a estabilidade/queda fisiológica dos primeiros dias (tabela real: dia 0 = dia 3 = 3,232 kg).
- A tabela expandida diária resolve os dois pontos.

**E. Pré-termo não pode ser acompanhado após 64 semanas.**
`ConsultaController.cs:128` devolve `BadRequest("IGC ultrapassa o limite de 64 semanas...")` e o gráfico descarta pontos > 64 s. Uma criança pré-termo deixa de poder registrar consulta a partir de ~5,5 meses de idade corrigida. Contraria a regra (passar para OMS).

**F. Gráfico a termo truncado e pesos ≥ 15 kg destruídos.**
- `GraficosZScore.tsx:489`: descarta consultas > 64 semanas mesmo com domínio até 260 s. Na prática o gráfico OMS a termo mostra só até ~15 meses.
- `GraficosZScore.tsx:455`: `if (peso > 15) peso = peso / 1000`. Peso ≥ 15 kg é normal a partir de ~3 anos (e +2z aos 2 anos já é 14,8/15,3 kg). Esses pontos viram 0,015 kg.

### Importantes

**G. Eixo X e recortes.** Tudo em semanas; meses aproximados por 4,33 s (OMS: 30,4375 dias). Não existem os 5 recortes OMS — há um único gráfico 0–260 s com zoom manual. Rótulos no eixo não seguem o padrão (semanas 0–13 → meses → anos).

**H. Linhas.** Desenha 7 linhas com ±1 **pretas** (OMS usa preto só em ±3) — ambíguo na leitura. Sugestão: 5 linhas OMS por padrão; ±1 opcional em **amarelo**, coerente com a tabela de interpretação da equipe.

**I. Dados INTERGROWTH misturados no diretório de produção.**
- `peso_intergrowth_{f,m}_full*.json` (33,0–42,9 s) = **tamanho ao nascer** (Newborn Standards), não crescimento pós-natal.
- `peso_pretermo_{f,m}_corrected.json` (24,0–32,9 s) = **very preterm birth size**.
- `peso_padrao_m.json` existe só para meninos.
- 10 arquivos `.backup`, `.full`, `.pre32_backup`, `.synthetic_backup` no diretório; `ZScoreService` carrega todos os `.json`.
- O que está correto: `peso_pretermo_{f,m}.json` (27–64 s, semanal) **confere com a tabela oficial** INTERGROWTH (verifiquei meninas nas semanas 27, 40 e 64 — idênticos). É o arquivo que o gráfico pré-termo usa hoje. Resolução semanal apenas (interpolar por dia no cálculo).

**J. Sem testes.** Nenhum teste nos cálculos de idade, IGC, z-score ou seleção de curva.

**K. Classificação não está no backend.** A tabela de interpretação só existe como interpolação linear entre bandas no tooltip do gráfico (`GraficosZScore.tsx:1506`) e como cor no frontend. Nenhum campo de classificação por indicador é persistido.

**L. Frontend e backend calculam idade/IGC em duplicidade** (`calcularIGC` no componente e no controller), com lógica equivalente mas não compartilhada.

## 5. O que implementar

### Fase 1 — Dados e cálculo (backend) — pré-requisito de tudo
1. **Importar as tabelas expandidas** (xlsx desta pasta) para JSON diário com `day, L, M, S` (peso/idade, M/F). Baixar e importar também **estatura/idade** e **PC/idade** (expandidas disponíveis no site OMS). Opcional: IMC/idade e peso/comprimento.
2. **Reescrever `ZScoreService`**: idade em **dias**; fórmula **LMS** com ajuste OMS além de ±3; interpolação linear entre dias (e entre semanas no INTERGROWTH); chaves padronizadas (`oms/peso`, `oms/estatura`, `oms/pc`, `intergrowth/peso`, ...); um único formato de arquivo; remover formatos legados, backups e os arquivos de tamanho ao nascer.
3. **Serviço único de seleção de referência** (usado por consulta, gráfico, seed e IA):
   - IG ≥ 37 s → OMS, idade cronológica (0–1856 dias).
   - IG < 37 s e IPM ≤ 64 s → INTERGROWTH pós-natal (27–64 s); IPM < 27 s → sem referência, sinalizar.
   - IG < 37 s e IPM > 64 s → OMS com **idade corrigida** até limite configurável (sugestão: 24 meses de idade corrigida), depois cronológica.
   - Persistir na consulta: referência usada, idade usada (dias) e tipo de idade (cronológica/pós-menstrual/corrigida).
4. **Remover o bloqueio de 64 semanas** no POST/PUT de consulta; comando para **recalcular z** das consultas existentes.
5. **Testes unitários** com valores da própria tabela (ex.: peso = `SD2` no dia X ⇒ z = 2,00; pontos oficiais INTERGROWTH).

### Fase 2 — Gráficos (frontend)
6. Componente OMS com os **5 recortes como filtro** (seletor), eixo X em dias com rótulos em semanas/meses/anos conforme o recorte (30,4375 d/mês), domínios Y por recorte e sexo (tabela §2), 5 linhas com cores OMS, ±1 opcional em amarelo, moldura rosa/azul, grade 0,1 kg e 1 linha por semana/mês.
7. Curvas servidas por endpoint diário (ou amostradas 1 ponto/semana para desempenho). Pontos do paciente em dias; para pré-termo após 64 s, plotar em idade corrigida e marcar a transição INTERGROWTH → OMS.
8. Recorte 1 (0–13 semanas) como padrão para termo em UTIN; INTERGROWTH (já existe) para pré-termo.
9. Remover o hack `peso > 15`; validar unidade no formulário (kg, 3 decimais; alertar se < 0,3 ou > 35).
10. Gráficos de estatura e PC (OMS tem os mesmos recortes) — depois do item 1.

### Fase 3 — Classificação e alertas
11. Codificar a tabela de interpretação no backend (classificação por z, por indicador) e expor no detalhe da criança; `AlertaRCEU` e `AlertaQuedaPonderal` voltam a funcionar.
12. ADR com as regras de §3 e a política de idade corrigida.

### Status
- **Fase 1 implementada em 2026-10-28** — ver `docs/ADR-001-curvas-de-referencia-e-zscore.md`.
  Achados A, B, C, D, E, I, J e L resolvidos no backend.
- **Fase 2 implementada em 2026-10-28** — achados F, G e H resolvidos (`GraficoOms` com os 5
  recortes); K (classificação no backend) fica para a Fase 3.

## 6. Decisões que dependem da equipe clínica
- Até quando usar idade corrigida na OMS após 64 s (sugestão: 24 meses de idade corrigida).
- Mostrar linhas ±1? (OMS não mostra; a tabela de interpretação da equipe usa).
- Incluir estatura/PC/IMC já na Fase 1 ou depois.
- Como sinalizar IG < 33 s (limitação do INTERGROWTH) e IPM < 27 s.
- Reprocessar o z das consultas já registradas.

## 7. Fontes
- OMS — Weight-for-age (gráficos por recorte, tabelas, expandidas): https://www.who.int/tools/child-growth-standards/standards/weight-for-age
- OMS — Length/height-for-age (expandidas disponíveis): https://www.who.int/tools/child-growth-standards/standards/length-height-for-age
- OMS — Head circumference-for-age (expandidas disponíveis): https://www.who.int/tools/child-growth-standards/standards/head-circumference-for-age
- OMS — Instruções para tabelas expandidas (PDF nesta pasta).
- Ajuste LMS além de ±3 (DHS Guide, método OMS 2006): https://dhsprogram.com/data/Guide-to-DHS-Statistics/Nutritional_Status.htm
- CDC — cortes ±2 z nas curvas OMS: https://www.cdc.gov/growth-chart-training/hcp/using-growth-charts/who-using.html
- INTERGROWTH-21st — Postnatal Growth Standards for Preterm Infants (até 64 s, depois OMS; não usar tamanho ao nascer): https://intergrowth21.com/node/142
- Villar et al., Lancet Glob Health 2015;3:e681-91 (tabela oficial em `Data/Referencias/INTERGROWTH/grow_preterm-zs-*_bw_table.pdf`): https://openaccess.sgul.ac.uk/id/eprint/107857/1/1-s2.0-S2214109X15001631-main.pdf
- SBP — Manual de Orientação nº 64 (2023), Avaliação do crescimento: https://www.sbp.com.br/fileadmin/user_upload/24038c-ManOrient_-_AvalCrescim_o_que_PediatraPrecisaSaber.pdf
- Jornal de Pediatria — padrões de crescimento pós-natal do pré-termo: https://www.scielo.br/j/jped/a/hBC84cmnQRPmgg6psnYq75c/?lang=pt
- Idade corrigida até ~2 anos (revisão): https://inscricoes-cbcenf.cofen.gov.br/anais/15/14748/trabalhoresumodownload
