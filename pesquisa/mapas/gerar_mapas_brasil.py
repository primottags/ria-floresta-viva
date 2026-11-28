"""
Mapas por ano para o Brasil inteiro (seis biomas), em paralelo.

Igual a gerar_mapas.py, mas lê os seis arquivos public/dados/<bioma>.json e pinta o mesmo
indicador da página de cada bioma:
- Amazônia e Mata Atlântica: floresta (3, 4, 5, 6, 7, 49) -> public/mapas/
- Cerrado, Caatinga, Pampa e Pantanal: vegetação nativa (floresta + 10, 11, 12, 29, 32, 50, 77, 84)
  -> public/mapas-nativa/
Um município que está em dois biomas de indicadores diferentes ganha os dois mapas.

Como rodar (Colab ou computador com Earth Engine):

    python gerar_mapas_brasil.py --projeto SEU-PROJETO --dados ../../public/dados --saida ../../public

Pula o que já existe. Cada PNG é reduzido a 4 cores no fim (fica bem menor).
"""
import argparse, json, pathlib, struct, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

import ee
import requests
from PIL import Image

ASSET = "projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3"
ANOS = list(range(1985, 2026))
FLORESTA = [3, 4, 5, 6, 7, 49]
NATIVA = FLORESTA + [10, 11, 12, 29, 32, 50, 77, 84]
AGUA = [31, 33]
CORES = ["edde8e", "1f8d49", "2e7dd7"]  # resto, natural, água
BIOMAS = ["amazonia", "mata-atlantica", "cerrado", "caatinga", "pampa", "pantanal"]
PASTA = {"floresta": "mapas", "vegetacao_nativa": "mapas-nativa"}
CLASSES = {"floresta": FLORESTA, "vegetacao_nativa": NATIVA}
IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{cod}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria"


def geometria(cod):
    for tentativa in range(4):
        try:
            r = requests.get(IBGE.format(cod=cod), timeout=60)
            r.raise_for_status()
            gj = r.json()
            feats = gj.get("features") or [gj]
            return ee.Geometry(feats[0]["geometry"])
        except Exception:
            if tentativa == 3:
                raise
            time.sleep(3 * (tentativa + 1))


def tira(cod, indicador, dimensao):
    mapa = ee.Image(ASSET)
    geom = geometria(cod)
    natural = CLASSES[indicador]
    quadros = []
    for ano in ANOS:
        classe = (mapa.select(f"classification_{ano}")
                  .remap(natural + AGUA, [1] * len(natural) + [2] * len(AGUA), 0).clip(geom))
        quadros.append(classe.visualize(min=0, max=2, palette=CORES).set("ano", ano))
    url = ee.ImageCollection(quadros).getFilmstripThumbURL(
        {"dimensions": dimensao, "region": geom.bounds(), "format": "png", "crs": "EPSG:3857"})
    for tentativa in range(3):
        r = requests.get(url, timeout=600)
        if r.ok:
            return r.content
        time.sleep(5 * (tentativa + 1))
    raise RuntimeError(f"{r.status_code}: {r.text[:200]}")


def tarefas(pasta_dados):
    quer = {}
    for b in BIOMAS:
        d = json.loads((pathlib.Path(pasta_dados) / f"{b}.json").read_text(encoding="utf-8"))
        for m in d["m"]:
            quer[(m[1], d["indicador"])] = True
    return list(quer)


def rodar(pasta_dados, saida, projeto=None, dimensao=200, paralelo=8, so=None):
    if projeto:
        ee.Initialize(project=projeto)
    saida = pathlib.Path(saida)
    indices = {}
    for ind, pasta in PASTA.items():
        (saida / pasta).mkdir(parents=True, exist_ok=True)
        arq = saida / pasta / "indice.json"
        indices[ind] = json.loads(arq.read_text()) if arq.exists() else {}
    lista = [(c, i) for c, i in tarefas(pasta_dados)
             if not ((saida / PASTA[i] / f"{c}.png").exists() and str(c) in indices[i])]
    if so:
        lista = [t for t in lista if str(t[0]) in set(map(str, so))]
    print(f"{len(lista)} mapas para gerar", flush=True)
    falhas = []
    with ThreadPoolExecutor(paralelo) as pool:
        fut = {pool.submit(tira, c, i, dimensao): (c, i) for c, i in lista}
        for n, f in enumerate(as_completed(fut), 1):
            c, i = fut[f]
            try:
                arq = saida / PASTA[i] / f"{c}.png"
                arq.write_bytes(f.result())
                img = Image.open(arq).convert("RGBA")
                w, h = img.size
                img.quantize(colors=4, method=Image.Quantize.FASTOCTREE).save(arq, optimize=True)
                indices[i][str(c)] = [w, h // len(ANOS)]
                if n % 25 == 0 or n == len(lista):
                    for ind, pasta in PASTA.items():
                        (saida / pasta / "indice.json").write_text(json.dumps(indices[ind], separators=(",", ":")))
                    print(f"[{n}/{len(lista)}] ok", flush=True)
            except Exception as erro:
                falhas.append((c, i))
                print(f"[{n}/{len(lista)}] {c} {i} FALHOU: {erro}", file=sys.stderr, flush=True)
    for ind, pasta in PASTA.items():
        (saida / pasta / "indice.json").write_text(json.dumps(indices[ind], separators=(",", ":")))
    print(f"Pronto. Falhas: {len(falhas)} {falhas[:20]}", flush=True)
    return falhas


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--projeto", required=True)
    p.add_argument("--dados", default="../../public/dados")
    p.add_argument("--saida", default="../../public")
    p.add_argument("--dimensao", type=int, default=200)
    p.add_argument("--so", nargs="*")
    a = p.parse_args()
    rodar(a.dados, a.saida, a.projeto, a.dimensao, so=a.so)
