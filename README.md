# Ria Floresta Viva

Construa "A floresta da sua infância", uma experiência web interativa em português do Brasil, mobile-first (a maioria vai abrir pelo WhatsApp no celular), para uma pesquisa de percepção sobre a "síndrome da linha de base móvel" no Pará. Projeto inscrito no 9º Prêmio MapBiomas, categoria Comunicação. Quero algo MUITO criativo e memorável, mas fiel aos dados e às regras abaixo.

## Ideia central
A pessoa escolhe o município do Pará onde morava aos 10 anos e o ano em que nasceu, chuta quanta floresta havia no município quando tinha 10 anos, e então vê o dado real do MapBiomas naquele ano e hoje (2025).

## Direção criativa (proposta, pode melhorar)
- Uma "máquina do tempo da paisagem": a tela é uma paisagem ilustrada em camadas (SVG/canvas, sem fotos de banco), com uma linha de copa de árvores no horizonte.
- O chute é feito "plantando" floresta: ao arrastar o dedo para cima/baixo (ou a barra acessível equivalente), a mata cresce ou recua na paisagem e aparece o número em %. Mostre também a metáfora "de cada 100 pedaços de terra, quantos eram floresta" com uma grade 10x10 de copas de árvore.
- A revelação é o momento principal: um contador de anos corre do ano dos 10 anos da pessoa até 2025 enquanto a paisagem muda de acordo com a série anual real do município (a mata recua e aparece terra/pasto em tom de barro). O chute da pessoa fica marcado como uma linha amarela "fantasma" sobre a paisagem, para comparar memória x realidade.
- Depois, um gráfico simples da série 1985–2025 do município com o ponto do chute e o ponto real.
- Cartão para compartilhar (imagem PNG 1080x1350 gerada em canvas) com município, chute, valor real e valor de 2025, e a frase "E você, quanta floresta lembra?". Botão usa Web Share API com arquivo; se não houver, baixa a imagem.
- Paleta: verde-mata profundo para a floresta medida, amarelo-ipê para a memória/chute, vermelho-barro para a perda, fundo claro esverdeado; modo escuro também. Tipografia: Bricolage Grotesque (títulos) e Atkinson Hyperlegible (texto), porque o público inclui pessoas idosas. Nada de emojis como ícones.
- Respeite prefers-reduced-motion (sem animação longa) e mantenha tudo acessível por teclado e leitor de tela. Letras grandes, botões de 48px.

## Dados (arquivos anexados — copie para /public e carregue com fetch)
- dados_pagina.json: {ano0:1985, anoN:2025, colecao:"11", m:[[nome, cod_ibge, [pct_floresta_1985, ..., pct_floresta_2025]], ...]} com os 144 municípios do Pará. pct = % da área do município coberta pelo grupo Floresta do MapBiomas Coleção 11. NÃO altere nem arredonde os dados na fonte; mostre inteiros na tela.
- termo_v1.json: lista de parágrafos do termo de consentimento completo. Mostre-os sem alterar o texto, num painel expansível "Ler o termo completo".

## Fluxo e regras (obrigatórias, não mude)
1. Tela inicial com o gancho "Quanta floresta você viu crescendo?" e o bloco de consentimento, exatamente com este texto: "Esta página faz parte de uma pesquisa sobre como cada geração lembra a floresta do Pará. Se você concordar, guardamos seu município, seu ano de nascimento e seus chutes. Não pedimos nome, e-mail ou telefone, e não gravamos seu IP junto da resposta. As respostas só aparecem somadas, em gráficos e tabelas. Participar é voluntário e só vale para maiores de 18 anos." Caixa (desmarcada) "Tenho 18 anos ou mais, li o termo e concordo em participar." Botão "Começar" só ativa com a caixa marcada. Link "Ver só os dados, sem participar" leva ao mesmo jogo sem gravar nada.
2. P1: "Em que município do Pará você morava quando tinha 10 anos?" com ajuda "Se mudou muito, escolha o lugar que você mais lembra daquela época." Busca com autocompletar que ignora acentos, lista fechada dos 144. Última opção: "Eu não morava no Pará aos 10 anos" → segue em modo explorar (não grava).
3. P2: "Em que ano você nasceu?" lista de 1930 a 2015. ano_referencia = max(1985, nascimento+10). Se nascimento+10 < 1985, aviso: "O MapBiomas começa em 1985. Vamos comparar seu chute com o retrato mais antigo que existe, quando você tinha N anos." Menores de 18 anos podem jogar, mas a resposta não é gravada (avisar).
4. P3 (o chute): "Feche os olhos e lembre de [município] em [ano], quando você tinha 10 anos. De cada 100 pedaços de terra do município, quantos você acha que eram floresta?" Ajuda: "Vale mata de terra firme, de várzea e mangue. Não vale pasto, roça, cidade nem campo natural. Não tem resposta errada: queremos saber o que você lembra." IMPORTANTE: o controle começa SEM posição/valor (para não ancorar em 50%); o valor só aparece após o primeiro toque. Botão "Confirmar meu chute". O dado real NUNCA aparece antes da confirmação e o chute não pode ser trocado depois.
5. P4 (opcional, com "Pular"): "E hoje, quanto de [município] você acha que ainda é floresta?" mesmo controle sem posição inicial.
6. P5 (opcional, com "Pular"): "Você ainda mora em [município]?" opções Sim, moro lá / Não, mas visito / Não, saí de lá (valores sim/visita/saiu).
7. Revelação (descrita acima) + frase do tipo "Em 2000, 71% de Marabá era floresta. Seu chute ficou 12 pontos acima. Hoje são 45%." + nota: "Os dados usam os limites atuais do município. Se ele foi criado depois de 1985, mostramos o mesmo território antes da emancipação." + "Explorar outro município" (modo explorar).
8. Rodapé: "Fonte: Projeto MapBiomas, Coleção 11 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil (1985 a 2025)." e "Pesquisa de Priscila Motta Gadelha Silva, engenheira cartógrafa e agrimensora. Trabalho inscrito no 9º Prêmio MapBiomas."

## Gravação das respostas (anônima)
- NÃO use Lovable Cloud, autenticação, cookies de rastreamento nem analytics. NÃO crie banco novo. Grave num Supabase que já existe, só com INSERT via REST (sem supabase-js, sem select):
  POST https://pdxjejfqzfgnhjsnhivs.supabase.co/rest/v1/respostas com headers apikey: sb_publishable_mYiltuNt9dPS6vVWoWCQtQ_jdmqLb0E, Content-Type: application/json, Prefer: return=minimal.
  Campos: id_resposta (código aleatório formato XXXX-XXXX com letras A-Z sem I/O e dígitos 2-9, gerado com crypto.getRandomValues), versao_questionario "v1", cod_ibge_municipio (int), ano_nascimento, ano_referencia, chute_infancia_pct, chute_hoje_pct (ou null), ainda_mora (ou null), real_infancia_pct, real_hoje_pct (2025), colecao_mapbiomas "11", origem (parâmetro utm_source da URL, senão "direto").
- Compartilhar: POST em /rest/v1/compartilhamentos com {id_resposta (ou null se não gravou), rede:"web-share"}.
- Só grava se: a pessoa aceitou o termo, tem 18+ anos, não escolheu "não morava no Pará", e o localStorage não tem a marca "floresta_respondeu". Após gravar, salva essa marca e mostra: "Seu código de resposta é XXXX-XXXX. Guarde se quiser pedir a exclusão depois." Se já respondeu neste aparelho, avisa que a rodada não foi gravada.
- Interruptor de gravação: grava somente quando o hostname NÃO contém "preview" e NÃO é localhost (ou seja, só no site publicado). Na prévia, mostre uma faixa "Protótipo para testes: nenhuma resposta é gravada" e, na revelação, "no site oficial esta resposta seria gravada com o código X".

Página única, sem login, sem outras rotas além do fluxo. Textos em português do Brasil, linguagem simples e calorosa.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2581c95c-d103-469e-9115-ae5d1d3f895d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
