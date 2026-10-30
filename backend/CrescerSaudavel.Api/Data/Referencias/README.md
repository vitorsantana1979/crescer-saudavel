# Tabelas de referência de crescimento

Carregadas por `Services/ZScoreService.cs` na inicialização.

## OMS (`OMS/{peso,estatura,perimetro}_{f,m}.json`)

Tabelas expandidas diárias da OMS (WHO Child Growth Standards, "Expanded tables for constructing
national health cards"), dia 0 a 1856, com os parâmetros LMS:

```json
[{"dia":0,"l":0.3809,"m":3.2322,"s":0.14171}, ...]
```

- `peso`: weight-for-age; `estatura`: length/height-for-age; `perimetro`: head circumference-for-age.
- z = ((valor/M)^L − 1) / (L·S). Para o peso, além de ±3 aplica-se o ajuste da OMS
  (z = 3 + (valor − SD3)/(SD3 − SD2), e o simétrico abaixo de −3).
- Idade em dias. Para rótulos em meses: 1 mês = 30,4375 dias.
- Geradas por `scripts/importar_referencias_oms.py` a partir das planilhas oficiais (`.xlsx`);
  o script confere cada linha contra a fórmula LMS. Fonte: https://www.who.int/tools/child-growth-standards/standards

## INTERGROWTH-21st (`INTERGROWTH/{peso,estatura,perimetro}_{f,m}.json`)

Postnatal Growth Standards for Preterm Infants (Villar et al., Lancet Glob Health 2015;3:e681-91),
peso (kg), comprimento (cm) e perímetro cefálico (cm) por semana pós-menstrual exata, 27 a 64
semanas, valores nas linhas z = −3..+3:

```json
[{"semana":27,"zN3":0.33,"zN2":0.40,"zN1":0.50,"z0":0.61,"zP1":0.75,"zP2":0.93,"zP3":1.14}, ...]
```

- Fonte: tabelas oficiais `grow_preterm-zs-{girls,boys}_{bw,lt,hc}_table.pdf` (neste diretório),
  baixadas de https://intergrowth21.com/sites/default/files/2023-02/. `scripts/importar_referencias_intergrowth.py`
  gera `estatura`/`perimetro` a partir delas e confere o `peso` (`--verificar` confere as seis).
- O z é obtido por interpolação linear entre semanas e entre as linhas de z; além de ±3, extrapola
  com a largura da banda vizinha.
- Uso livre para profissionais, © University of Oxford — manter o crédito na interface e nos relatórios.
- Os demais PDFs são material de referência (tabelas de tamanho ao nascer, que **não** devem ser
  usadas para crescimento pós-natal, e gráficos).

## Regra de seleção

`Services/Crescimento/ReferenciaCrescimentoService.cs`: a termo → OMS (idade cronológica);
pré-termo até 64 semanas pós-menstruais → INTERGROWTH; depois → OMS com idade corrigida até
`Crescimento:LimiteIdadeCorrigidaMeses` (padrão 24), em seguida idade cronológica.
