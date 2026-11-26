# Mapas reais do MapBiomas na revelação

A revelação mostra, ao lado da lembrança da pessoa, o mapa do município ano a ano (1985 a 2025), com as classes da Coleção 11 agrupadas em floresta, água e outros usos.

Sem os mapas, a página mostra o bloco 3D com o percentual medido. Os mapas entram quando existirem `public/mapas/indice.json` e `public/mapas/<cod_ibge>.png`.

## Gerar (uma vez)

No computador com conta no Google Earth Engine:

```bash
pip install earthengine-api requests
earthengine authenticate
cd pesquisa/mapas
python gerar_mapas.py --projeto SEU-PROJETO --so 1502954   # teste com Eldorado do Carajás
python gerar_mapas.py --projeto SEU-PROJETO                # todos os 540
```

- Asset: `projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3`.
- Limites municipais: API de malhas do IBGE (qualidade intermediária).
- Cada PNG é uma tira com 41 quadros (um por ano), de cima para baixo.
- Pode interromper e rodar de novo: o script pula o que já existe.
