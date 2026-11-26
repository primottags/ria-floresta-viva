# A floresta da sua infância: tabela de floresta por município do Pará

Gerado em 26/11/2026. Etapa 1 do plano (dados de cobertura por município).

## Fonte

- **MapBiomas Brasil, Coleção 11, Cobertura e Uso da Terra 30m** (lançada em agosto de 2026), série anual **1985 a 2025**.
- Arquivo: `MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx` (zip de 75 MB), aba `COVERAGE_11`, baixado em 25/11/2026 da página https://brasil.mapbiomas.org/downloads/estatisticas/ , item "Biomas, Estados e Municípios | Cobertura 30m - Coleção 11".
- Citação sugerida: Projeto MapBiomas. Coleção 11 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil. Acesso em 25/11/2026.

## Método

1. Da aba `COVERAGE_11`, ficam só as linhas com `state = Pará` (2.063 linhas, 144 municípios). Áreas em hectares.
2. Municípios que cruzam dois biomas (Amazônia e Cerrado, no sudeste do Pará) têm as linhas dos dois biomas somadas.
3. Para cada município e ano, somam-se as classes de cada indicador:

| Indicador | Classes da legenda Col. 11 | O que é |
|---|---|---|
| `floresta` | 3, 4, 5, 6, 7, 49 | Grupo "1. Floresta": formação florestal, floresta alagável, formação savânica, savana alagada, mangue, restinga arbórea |
| `formacao_florestal` | 3 | Só a classe 1.1 Formação Florestal (terra firme) |
| `vegetacao_nativa` | grupo 1 + grupo 2 (10, 11, 12, 29, 32, 50, 77, 84) | Floresta mais vegetação herbácea e arbustiva natural (campos, campos alagados, afloramento rochoso, apicum, restinga) |

4. Percentual = área do indicador ÷ área total do município no MapBiomas (soma de todas as classes daquele ano, inclusive água e "não observado") × 100.

## Conferência

- A soma dos 144 municípios dá 124.551.221 ha; a planilha por estado da mesma coleção dá 124.541.551 ha para o Pará (diferença de 0,008%, de recorte de limites). Formação florestal em 1985: 102.920.161 ha nos municípios contra 102.911.189 ha no estado.
- Pará inteiro, indicador `floresta`: 90,2% em 1985 e 74,3% em 2025. A mediana de perda por município é de 26,7 pontos percentuais.
- Maiores perdas (`floresta`, 1985→2025, em pontos percentuais): Eldorado do Carajás (85,3), Tucumã (80,9), São Domingos do Araguaia (76,0), São Geraldo do Araguaia (66,4), Piçarra (62,6).

## Decisões e suposições

1. **Número que a página mostra como "floresta": o indicador `floresta` (grupo 1 inteiro)**, decidido em 26/11/2026 (Priscila delegou a escolha). No JSON, `indicador_principal = "floresta"`; as outras duas medidas continuam lá para a análise. Motivo: usar só a formação florestal (classe 3) faz os municípios de várzea e do Marajó parecerem pouco florestados, porque lá a maior parte é floresta alagável: em Breves seriam 51% em vez de 90%, em Afuá 29% em vez de 65%.
2. **Denominador com água**. Municípios com muito rio ou baía (Belém, Afuá, Chaves) ficam com percentuais menores do que teriam só sobre a área de terra. O CSV traz `agua_ha` por ano, então dá para trocar se preferir.
3. **Municípios criados depois de 1985** (por exemplo, os desmembrados nos anos 1990) aparecem com o limite atual em toda a série. É o padrão do MapBiomas e serve para a página: a pessoa escolhe o município de hoje.
4. **Pessoas nascidas antes de 1975**: o primeiro ano é 1985, como já previsto no plano.

## Arquivos

- `dados/floresta_municipios_para.json` (288 KB): o arquivo da página. Estrutura: `municipios[] = {nome, cod_ibge, area_total_ha, serie: {ano: [floresta_ha, floresta_pct, formacao_florestal_ha, formacao_florestal_pct, vegetacao_nativa_ha, vegetacao_nativa_pct]}}`. A ordem das colunas está em `colunas_serie`.
- `dados/floresta_municipios_para.csv`: a mesma tabela em formato longo (município × ano), para conferir no Excel.
- `dados_brutos/pa_coverage_col11.csv`: o recorte do Pará da planilha original, sem nenhuma conta.
- `scripts/extrair_pa.py` e `scripts/montar_tabela_floresta.py`: reproduzem tudo (`python extrair_pa.py <xlsx> <csv>` e depois `python montar_tabela_floresta.py <csv> <pasta>`). Vão para o repositório público no GitHub.

Nenhum dado, modelo ou código do SINFAM foi usado.

## Ampliação para o bioma Amazônia (26/11/2026)

Decidido com a Priscila em 26/11/2026: a página cobre os municípios do bioma Amazônia, com o Pará como destaque na divulgação. Mesma fonte (planilha "Biomas, Estados e Municípios", Coleção 11, aba `COVERAGE_11`), mesmas classes e mesmo denominador descritos acima. Script: `pesquisa/dados/montar_tabela_amazonia.py`.

- **Quem entra:** municípios com pelo menos 10% da área no bioma Amazônia. São **540 municípios em 9 estados**: PA 144, MA 106, MT 92, AM 62, RO 52, TO 31, AC 22, AP 16, RR 15. Ficaram de fora 20 municípios (MA 6, MT 6, TO 8) que só tocam o bioma por lascas de limite, entre 0% e 9% da área.
- **Municípios em dois biomas** (Amazônia e Cerrado ou Pantanal): o percentual usa o município inteiro, somando os biomas, como já era feito no Pará. A tabela longa traz `pct_area_amazonia`. 439 municípios têm 99,9% ou mais da área no bioma.
- **Arquivo da página** (`dados_pagina.json`, 151 KB): `m = [nome, cod_ibge, [floresta_pct de 1985 a 2025]]`, com o Pará primeiro. O estado sai dos dois primeiros dígitos do código IBGE. Há nomes repetidos em estados diferentes (Rio Branco, Presidente Médici, Pau D'Arco, Araguanã), por isso a busca mostra a sigla do estado.
- **Conferência:** os 144 municípios do Pará saem idênticos aos da tabela anterior. No conjunto dos 540 municípios, o indicador `floresta` vai de 89,9% em 1985 para 76,7% em 2025. A mediana de perda por município é de 27,4 pontos percentuais. Maiores perdas: Eldorado do Carajás/PA (85,3), Buritis/RO (83,2), Tucumã/PA (80,9), São Domingos do Araguaia/PA (76,0), Urupá/RO (70,4).
- Arquivos: a tabela longa `floresta_municipios_amazonia.csv` (pasta do projeto) (formato longo, município × ano) e `dados/dados_pagina_amazonia.json`.

## Painel público "O que a Amazônia lembra" (/painel)

A página mostra, em tempo real, a média dos chutes e a média da floresta medida pelo MapBiomas para cada geração (década de nascimento) e cada estado. As médias são calculadas no banco pela função `painel_publico()` (`pesquisa/painel/painel_publico.sql`), que só devolve grupos com pelo menos 5 respostas (anonimato k ≥ 5). A página nunca lê respostas individuais. A diferença é `chute_infancia_pct − real_infancia_pct`: positiva quando a pessoa lembra mais floresta do que havia.
