# Fotos de satélite (Landsat) na revelação

Na revelação, abaixo da frase com o resultado, aparece o município "do alto, como uma foto":
a imagem Landsat em cores naturais no ano da lembrança (ano mais próximo entre 1985, 1990, …, 2025) e em 2025.
É o que a pessoa reconhece de cara: mata em verde-escuro, pasto em bege, estradas e rios.
Os percentuais da página continuam vindo só do MapBiomas.

- Coleções: Landsat 5, 7 (1999 a maio de 2003, antes da falha do SLC), 8 e 9, Coleção 2, nível 2 (reflectância de superfície).
- Cada quadro: mediana de junho a setembro (estação seca) do ano e dos vizinhos (ano-1 a ano+1), sem nuvem nem sombra (QA_PIXEL).
  O que sobra sem dado é preenchido com a janela ano-3 a ano+3.
- Cores: vermelho, verde e azul, 0 a 0,13 de reflectância, gama 1,3. Contorno do município (IBGE) em branco.
- Saída: `public/fotos/<cod_ibge>.jpg` (tira com 9 quadros, de cima para baixo) e `public/fotos/indice.json`.

## Gerar

```bash
pip install earthengine-api requests pillow
earthengine authenticate
cd pesquisa/fotos
python gerar_fotos.py --projeto SEU-PROJETO --so 1502954   # teste
python gerar_fotos.py --projeto SEU-PROJETO                # todos
```

## Terreno do chute

O terreno da tela do chute (`src/components/forest/SatTerrain.tsx`) usa dois recortes Landsat reais da região de
Eldorado do Carajás (PA): mata fechada em 1990 e pasto em 2025 (`public/texturas/`). Não representa nenhum município:
a mata some a partir de estradas em espinha de peixe, o desenho típico do desmatamento na Amazônia.
