"""
Gera, para cada município da página, uma tira JPEG com fotos de satélite em cores naturais
(Landsat, Coleção 2, nível 2), uma por ano escolhido, empilhadas de cima para baixo.

É a "foto" que a pessoa reconhece: verde-escuro da mata, bege do pasto, estradas e rios.
Os percentuais da página continuam vindo do MapBiomas; a foto só ajuda a ver o lugar.

Cada quadro é a mediana da estação seca (junho a setembro) do ano e dos vizinhos (ano-1 a ano+1),
sem nuvens nem sombras (máscara QA_PIXEL). Buracos que sobram são preenchidos com uma janela maior.
O contorno do município (IBGE) aparece em branco.

Como rodar (no Colab ou em computador com acesso ao Google Earth Engine):

    pip install earthengine-api requests pillow
    earthengine authenticate
    python gerar_fotos.py --projeto SEU-PROJETO --so 1502954   # teste
    python gerar_fotos.py --projeto SEU-PROJETO                # todos

Grava <saida>/<cod_ibge>.jpg e <saida>/indice.json ({cod: [largura, altura_do_quadro]}).
Pode parar e rodar de novo: pula o que já existe.
"""
import argparse, io, json, pathlib, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

import ee
import requests
from PIL import Image

ANOS = [1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025]
IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{cod}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria"
VIS = {"min": 0, "max": 0.13, "gamma": 1.3}


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


def preparar(img, bandas):
    qa = img.select("QA_PIXEL")
    limpo = qa.bitwiseAnd(0b11010).eq(0)  # bits 1 (nuvem dilatada), 3 (nuvem) e 4 (sombra)
    rgb = img.select(bandas, ["r", "g", "b"]).multiply(0.0000275).add(-0.2)
    return rgb.updateMask(limpo).copyProperties(img, ["system:time_start"])


def landsat(regiao, inicio, fim):
    # Filtra antes de transformar: a aritmética descarta as datas das cenas.
    def colecao(nome, bandas, de=None, ate=None):
        c = ee.ImageCollection(nome).filterBounds(regiao).filterDate(de or inicio, ate or fim)
        c = c.filter(ee.Filter.calendarRange(6, 9, "month"))
        return c.map(lambda i: preparar(i, bandas))
    antigas = ["SR_B3", "SR_B2", "SR_B1"]; novas = ["SR_B4", "SR_B3", "SR_B2"]
    todas = (colecao("LANDSAT/LT05/C02/T1_L2", antigas)
             .merge(colecao("LANDSAT/LE07/C02/T1_L2", antigas).filterDate("1999-01-01", "2003-05-31"))
             .merge(colecao("LANDSAT/LC08/C02/T1_L2", novas))
             .merge(colecao("LANDSAT/LC09/C02/T1_L2", novas)))
    return todas.median()


def quadro(ano, regiao, contorno):
    seca = landsat(regiao, f"{ano - 1}-01-01", f"{min(ano + 1, 2025)}-12-31")
    larga = landsat(regiao, f"{ano - 3}-01-01", f"{min(ano + 3, 2025)}-12-31")
    foto = seca.unmask(larga).visualize(bands=["r", "g", "b"], **VIS)
    return foto.blend(contorno).set("ano", ano)


def tira(cod, dimensao):
    geom = geometria(cod)
    regiao = geom.bounds()
    contorno = ee.Image().byte().paint(ee.FeatureCollection([ee.Feature(geom)]), 1, 2).visualize(palette=["ffffff"], opacity=0.85)
    colecao = ee.ImageCollection([quadro(ano, regiao, contorno) for ano in ANOS])
    url = colecao.getFilmstripThumbURL({"dimensions": dimensao, "region": regiao, "format": "png", "crs": "EPSG:3857"})
    r = requests.get(url, timeout=600)
    if not r.ok:
        raise RuntimeError(f"{r.status_code}: {r.text[:300]}")
    # O filmstrip só sai em PNG; JPEG fica bem menor para foto.
    saida = io.BytesIO()
    Image.open(io.BytesIO(r.content)).convert("RGB").save(saida, "JPEG", quality=78, optimize=True, progressive=True)
    return saida.getvalue()


def tamanho_jpg(dados):
    i = 2
    while i < len(dados):
        marcador, tam = dados[i + 1], int.from_bytes(dados[i + 2:i + 4], "big")
        if marcador in (0xC0, 0xC1, 0xC2):
            return int.from_bytes(dados[i + 7:i + 9], "big"), int.from_bytes(dados[i + 5:i + 7], "big")
        i += 2 + tam
    raise ValueError("JPEG sem cabeçalho de tamanho")


def rodar(codigos, saida, dimensao=240, paralelo=6):
    saida = pathlib.Path(saida); saida.mkdir(parents=True, exist_ok=True)
    indice_arq = saida / "indice.json"
    indice = json.loads(indice_arq.read_text()) if indice_arq.exists() else {}
    faltam = [c for c in codigos if not ((saida / f"{c}.jpg").exists() and str(c) in indice)]
    falhas = []
    with ThreadPoolExecutor(paralelo) as pool:
        tarefas = {pool.submit(tira, cod, dimensao): cod for cod in faltam}
        for n, t in enumerate(as_completed(tarefas), 1):
            cod = tarefas[t]
            try:
                dados = t.result()
                (saida / f"{cod}.jpg").write_bytes(dados)
                w, h = tamanho_jpg(dados)
                indice[str(cod)] = [w, h // len(ANOS)]
                indice_arq.write_text(json.dumps(indice, separators=(",", ":")))
                print(f"[{n}/{len(faltam)}] {cod} ok ({len(dados) // 1024} KB)", flush=True)
            except Exception as erro:
                falhas.append(cod)
                print(f"[{n}/{len(faltam)}] {cod} FALHOU: {erro}", file=sys.stderr, flush=True)
    print(f"Pronto. {len(indice)} municípios com foto. Falhas: {falhas or 'nenhuma'}")
    return falhas


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--projeto", required=True)
    p.add_argument("--dados", default="../../public/dados_pagina.json")
    p.add_argument("--saida", default="../../public/fotos")
    p.add_argument("--dimensao", type=int, default=240)
    p.add_argument("--so", nargs="*")
    a = p.parse_args()
    ee.Initialize(project=a.projeto)
    dados = json.loads(pathlib.Path(a.dados).read_text(encoding="utf-8"))
    codigos = [m[1] for m in dados["m"]]
    if a.so:
        codigos = [c for c in codigos if str(c) in a.so]
    rodar(codigos, a.saida, a.dimensao)


if __name__ == "__main__":
    main()
