"""
Gera, para cada município da página, uma tira PNG com os mapas do MapBiomas (Coleção 11)
de 1985 a 2025, um quadro por ano, empilhados de cima para baixo.

Três cores: floresta (mesmas classes do indicador da página: 3, 4, 5, 6, 7 e 49),
água (classes 31 e 33) e o resto (pasto, agricultura, cidade, campo e outros usos).
Fora do município fica transparente.

Como rodar (uma vez, no computador com acesso ao Google Earth Engine):

    pip install earthengine-api requests
    earthengine authenticate
    python gerar_mapas.py --projeto SEU-PROJETO-DO-EARTH-ENGINE

Lê public/dados_pagina.json (códigos IBGE) e grava public/mapas/<cod_ibge>.png
e public/mapas/indice.json. Pode parar e rodar de novo: pula o que já existe.
"""
import argparse, json, pathlib, struct, sys, time

import ee
import requests

ASSET = "projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3"
ANOS = list(range(1985, 2026))
FLORESTA = [3, 4, 5, 6, 7, 49]
AGUA = [31, 33]
CORES = ["edde8e", "1f8d49", "2e7dd7"]  # resto, floresta, água
IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{cod}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria"


def tamanho_png(caminho):
    with open(caminho, "rb") as f:
        cab = f.read(24)
    return struct.unpack(">II", cab[16:24])


def geometria(cod):
    for tentativa in range(4):
        try:
            r = requests.get(IBGE.format(cod=cod), timeout=60)
            r.raise_for_status()
            gj = r.json()
            feats = gj.get("features") or [gj]
            return ee.Geometry(feats[0]["geometry"])
        except Exception as erro:  # rede instável: tenta de novo
            if tentativa == 3:
                raise
            time.sleep(3 * (tentativa + 1))


def tira(cod, mapa, dimensao):
    geom = geometria(cod)
    quadros = []
    for ano in ANOS:
        banda = mapa.select(f"classification_{ano}")
        classe = (banda.remap(FLORESTA + AGUA, [1] * len(FLORESTA) + [2] * len(AGUA), 0)
                  .clip(geom).rename("c"))
        quadros.append(classe.visualize(min=0, max=2, palette=CORES).set("ano", ano))
    colecao = ee.ImageCollection(quadros)
    url = colecao.getFilmstripThumbURL({"dimensions": dimensao, "region": geom.bounds(), "format": "png", "crs": "EPSG:3857"})
    return requests.get(url, timeout=300)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--projeto", required=True, help="ID do projeto do Google Cloud ligado ao Earth Engine")
    p.add_argument("--dados", default="../../public/dados_pagina.json")
    p.add_argument("--saida", default="../../public/mapas")
    p.add_argument("--dimensao", type=int, default=240, help="lado maior de cada quadro, em pixels")
    p.add_argument("--so", nargs="*", help="gerar só estes códigos IBGE (teste)")
    a = p.parse_args()

    ee.Initialize(project=a.projeto)
    mapa = ee.Image(ASSET)
    dados = json.loads(pathlib.Path(a.dados).read_text(encoding="utf-8"))
    codigos = [m[1] for m in dados["m"]]
    if a.so:
        codigos = [c for c in codigos if str(c) in a.so]
    saida = pathlib.Path(a.saida); saida.mkdir(parents=True, exist_ok=True)
    indice_arq = saida / "indice.json"
    indice = json.loads(indice_arq.read_text()) if indice_arq.exists() else {}

    falhas = []
    for n, cod in enumerate(codigos, 1):
        arq = saida / f"{cod}.png"
        if arq.exists() and str(cod) in indice:
            continue
        try:
            r = tira(cod, mapa, a.dimensao)
            r.raise_for_status()
            arq.write_bytes(r.content)
            w, h = tamanho_png(arq)
            indice[str(cod)] = [w, h // len(ANOS)]
            indice_arq.write_text(json.dumps(indice, separators=(",", ":")))
            print(f"[{n}/{len(codigos)}] {cod} ok ({w}x{h // len(ANOS)}, {len(r.content) // 1024} KB)")
        except Exception as erro:
            falhas.append(cod)
            print(f"[{n}/{len(codigos)}] {cod} FALHOU: {erro}", file=sys.stderr)
    print(f"Pronto. {len(indice)} municípios com mapa. Falhas: {falhas or 'nenhuma'}")


if __name__ == "__main__":
    main()
