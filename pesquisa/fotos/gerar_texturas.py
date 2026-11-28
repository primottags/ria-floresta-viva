"""
Texturas do chute para cada bioma: um recorte Landsat de paisagem nativa e um de paisagem
convertida (pasto, lavoura). Não representam nenhum município, só dão "cara" de satélite ao terreno.

Grava <bioma>-nativa.jpg e <bioma>-convertida.jpg (os ESCOLHIDOS) e, para conferência, cand-*.jpg.
Para cada candidato, imprime a fração nativa do recorte pelo MapBiomas (Coleção 11, 2025),
para conferir que o nativo é quase todo nativo e o convertido quase todo convertido.

    python gerar_texturas.py --projeto SEU-PROJETO --saida ../../public/texturas
"""
import argparse, io, pathlib

import ee
import requests
from PIL import Image

ASSET = "projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3"
NATIVA = [3, 4, 5, 6, 7, 49, 10, 11, 12, 29, 32, 50, 77, 84]
LADO = 440          # pixels do recorte
METROS = 6600       # meio lado do recorte (13,2 km, perto de 30 m por pixel)
VIS = {"min": 0, "max": 0.13, "gamma": 1.3}
# bioma: (meses secos, [(nome, lon, lat, tipo)]). tipo: nativa ou convertida.
CANDIDATOS = {
    "mata-atlantica": ((6, 9), [("serra-do-mar", -45.15, -23.33, "nativa"), ("intervales", -48.35, -24.28, "nativa"),
                                ("ribeirao-preto", -47.95, -21.28, "convertida"), ("vale-paraiba", -45.55, -22.98, "convertida")]),
    "cerrado": ((6, 9), [("veadeiros", -47.70, -14.10, "nativa"), ("jalapao", -46.90, -10.40, "nativa"),
                         ("luis-eduardo", -45.85, -12.00, "convertida"), ("rio-verde", -50.95, -17.80, "convertida")]),
    "caatinga": ((8, 11), [("capivara", -42.55, -8.75, "nativa"), ("raso-catarina", -38.60, -9.70, "nativa"),
                           ("feira-santana", -39.30, -12.30, "convertida"), ("agreste-pe", -36.60, -8.90, "convertida")]),
    "pampa": ((12, 3), [("ibirapuita", -55.70, -30.40, "nativa"), ("quarai", -56.20, -30.20, "nativa"),
                        ("camaqua", -51.90, -30.90, "convertida"), ("sao-gabriel", -54.30, -30.40, "convertida")]),
    "pantanal": ((7, 10), [("pocone", -56.65, -17.20, "nativa"), ("nhecolandia", -56.30, -19.00, "nativa"),
                           ("miranda", -56.20, -20.10, "convertida"), ("sao-gabriel-oeste", -54.55, -19.35, "convertida")]),
}

# Recortes escolhidos depois de ver os candidatos (fração nativa pelo MapBiomas 2025 entre parênteses).
ESCOLHIDOS = {
    "mata-atlantica": ("intervales", "ribeirao-preto"),   # 97% / 9%
    "cerrado": ("jalapao", "rio-verde"),                  # 99% / 13%
    "caatinga": ("capivara", "feira-santana"),            # 100% / 15%
    "pampa": ("ibirapuita", "camaqua"),                   # 99% / 32%
    "pantanal": ("nhecolandia", "sao-gabriel-oeste"),     # 94% / 7%
}


def preparar(img, bandas):
    qa = img.select("QA_PIXEL")
    limpo = qa.bitwiseAnd(0b11010).eq(0)
    return img.select(bandas, ["r", "g", "b"]).multiply(0.0000275).add(-0.2).updateMask(limpo)


def foto(regiao, meses):
    m0, m1 = meses
    filtro = ee.Filter.calendarRange(m0, m1, "month") if m0 <= m1 else ee.Filter.Or(
        ee.Filter.calendarRange(m0, 12, "month"), ee.Filter.calendarRange(1, m1, "month"))
    novas = ["SR_B4", "SR_B3", "SR_B2"]
    c = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"))
         .filterBounds(regiao).filterDate("2023-01-01", "2025-12-31").filter(filtro)
         .map(lambda i: preparar(i, novas)))
    return c.median().visualize(bands=["r", "g", "b"], **VIS)


def rodar(saida, projeto=None):
    if projeto:
        ee.Initialize(project=projeto)
    saida = pathlib.Path(saida); saida.mkdir(parents=True, exist_ok=True)
    mapa = ee.Image(ASSET).select("classification_2025")
    nativo = mapa.remap(NATIVA, [1] * len(NATIVA), 0)
    for bioma, (meses, lista) in CANDIDATOS.items():
        for nome, lon, lat, tipo in lista:
            regiao = ee.Geometry.Point([lon, lat]).buffer(METROS).bounds()
            frac = nativo.reduceRegion(ee.Reducer.mean(), regiao, 30, maxPixels=1e9).getInfo()
            url = foto(regiao, meses).getThumbURL({"dimensions": LADO, "region": regiao, "format": "png"})
            img = Image.open(io.BytesIO(requests.get(url, timeout=300).content)).convert("RGB")
            arq = saida / f"cand-{bioma}-{tipo}-{nome}.jpg"
            img.resize((LADO, LADO)).save(arq, "JPEG", quality=82, optimize=True)
            print(f"{arq.name}: {round(100 * list(frac.values())[0])}% nativo", flush=True)
            if nome in ESCOLHIDOS[bioma]:
                img.resize((LADO, LADO)).save(saida / f"{bioma}-{tipo}.jpg", "JPEG", quality=82, optimize=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--projeto", required=True)
    p.add_argument("--saida", default="../../public/texturas")
    a = p.parse_args()
    rodar(a.saida, a.projeto)
