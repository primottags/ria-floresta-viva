# A floresta da sua infância

Página interativa sobre a **síndrome da linha de base móvel** na Amazônia: a pessoa escolhe o município onde morava aos 10 anos e o ano em que nasceu, chuta quanta floresta havia ali naquela época e compara a lembrança com os dados de satélite do **MapBiomas (Coleção 11, 1985 a 2025)**. Os chutes anônimos formam uma pesquisa de percepção x realidade por geração e município.

Trabalho inscrito no **9º Prêmio MapBiomas**, categoria Comunicação. Autora: Priscila Motta Gadelha Silva, engenheira cartógrafa e agrimensora.

## Como funciona

1. Consentimento (só maiores de 18 anos; quem não aceita usa o modo explorar, que não grava nada).
2. Município da infância (540 municípios do bioma Amazônia, em 9 estados) e ano de nascimento.
3. Chute de quanta floresta havia aos 10 anos, numa barra que começa sem valor para não puxar a resposta para o meio.
4. Chute de hoje e "ainda mora lá?" (opcionais).
5. Revelação: a paisagem viaja do ano dos 10 anos até 2025 com a série real do município, e o chute fica marcado para comparar.

## Dados

- `public/dados_pagina.json`: percentual de floresta (grupo Floresta da legenda da Coleção 11: formação florestal, floresta alagável, formação savânica, savana alagada, mangue e restinga arbórea) sobre a área total de cada município, de 1985 a 2025.
- `pesquisa/METODO.md`: fonte, classes, denominador, conferências e decisões.
- `pesquisa/dados/`: scripts que geram a tabela a partir da planilha "Biomas, Estados e Municípios, Cobertura 30m, Coleção 11" do MapBiomas.

Fonte: Projeto MapBiomas, Coleção 11 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil.

## Respostas e privacidade

- Sem login, sem cookies de rastreamento e sem analytics. Não pedimos nome, e-mail nem telefone.
- As respostas vão para um banco Supabase (servidor em São Paulo) por uma chave pública que **só permite inserir**, nunca ler. A gravação só acontece no site publicado; na prévia nada é gravado.
- `pesquisa/analise/`: script de análise. Nenhum grupo com menos de 5 respostas é publicado, e os dados abertos trocam o ano de nascimento por faixas de 5 anos e retiram o código de resposta.
- Termo de consentimento completo: `public/termo_v1.json`.

## Rodar localmente

```bash
bun install
bun run dev
```

Testes: `bunx vitest run`.

Página construída com [Lovable](https://lovable.dev) (React, TanStack, Tailwind). O briefing original está em `pesquisa/briefing-lovable.md`.
