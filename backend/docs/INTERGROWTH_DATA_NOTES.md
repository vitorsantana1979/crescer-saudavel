# Intergrowth Peso Pré-Termo – Notas de Integração

## Fontes utilizadas

| Faixa | Fonte | Arquivo | Observações |
| ----- | ----- | ------- | ----------- |
| 24 + 0 até 26 + 6 semanas (dias completos) | **INTERGROWTH‑21st – Very Preterm Size at Birth Reference Charts** | `INTERGROWTH-21st_pre_Weight_Z_Scores_Boys (1).pdf`, `INTERGROWTH-21st_pre_Weight_Z_Scores_Girls.pdf` | Dados intrauterinos (peso ao nascer); disponibilizados em semanas + dias e z-scores −3 a +3. |
| 27 até 64 semanas (apenas dia 0 de cada semana) | **International Postnatal Growth Standards for Preterm Infants** | `grow_preterm-zs-boys_bw_table.pdf`, `grow_preterm-zs-girls_bw_table.pdf` | Dados pós-natais (bebês já nascidos); tabela única por semana com z-scores −3 a +3. |

Os arquivos JSON consumidos pela API (`CrescerSaudavel.Api/Data/Referencias/INTERGROWTH/peso_pretermo_m.json` e `peso_pretermo_f.json`) são derivados diretamente dessas fontes:

* semanas 24–26 usam os valores originais **sem qualquer ajuste**;
* semanas 27–64 são transcritas diretamente das tabelas pós-natais.

Backups dos estágios anteriores ficam salvos como:
* `peso_pretermo_*.json.pre32_backup` – somente 24–32 (pré 27–64);
* `peso_pretermo_*.json.before_64_backup` – versão com 24–42 antes da extensão 64;
* `peso_intergrowth_*.json` – versões intermediárias (formato wide semanal).

## Por que existe um salto em 26 → 27 semanas?

As duas referências descrevem **populações diferentes**:

* **Até 26 semanas**: curvas de **peso ao nascer** (intrauterinas). Exemplo (meninos):
  * 26 + 6 sem → z0 = **1,92 kg**.
* **A partir de 27 semanas**: curvas de **crescimento pós-natal**. Exemplo:
  * 27 sem → z0 = **0,67 kg**.

Essa queda brusca se repete em todos os z-scores porque os padrões pós-natais assumem a perda de peso logo após o parto. No gráfico oficial do Intergrowth, o eixo X inicia em 27 semanas; portanto o degrau nunca é mostrado.

## Implicações

* O degrau entre 26 e 27 semanas **não é erro de conversão**; é um efeito esperado ao unir duas curvas distintas (intrauterina × pós-natal).
* Valores mostrados no sistema coincidem ponto a ponto com os PDFs acima (meninos e meninas).

## Estratégias caso seja necessário suavizar

1. **Iniciar o gráfico em 27 semanas**, replicando o layout oficial.
2. **Interpolar/extrapolar** as semanas 24–26 a partir da curva pós-natal (apenas dia 0) para evitar a mudança de patamar.
3. **Mistura gradual** (por exemplo, média ponderada) nas semanas 26–28 para minimizar o degrau.

Qualquer ajuste extra exigirá alterar deliberadamente os dados originais ou aplicar uma camada de processamento no backend/frontend. Este documento deve ser consultado antes de explicar o comportamento para stakeholders ou decidir por uma dessas abordagens.
