"""
Gera, de uma vez, as imagens dos outros biomas: texturas do chute, mapas por ano e fotos Landsat.
Feito para rodar no GitHub Actions (.github/workflows/imagens-biomas.yml) com uma conta de serviço
do Earth Engine, mas também roda em qualquer computador:

    python pesquisa/gerar_imagens_brasil.py --chave chave.json   # ou --projeto, com login pessoal

Pula o que já existe em public/, então pode rodar de novo para completar falhas.
"""
import argparse, json, pathlib, sys

import ee

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path[:0] = [str(RAIZ / "pesquisa" / "mapas"), str(RAIZ / "pesquisa" / "fotos")]
import gerar_fotos, gerar_mapas_brasil, gerar_texturas  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--chave", help="arquivo JSON da conta de serviço")
p.add_argument("--projeto", default="prisma-dados-495316")
p.add_argument("--so", choices=["texturas", "mapas", "fotos"], nargs="*")
a = p.parse_args()

if a.chave:
    info = json.loads(pathlib.Path(a.chave).read_text())
    ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], a.chave), project=info.get("project_id", a.projeto))
else:
    ee.Initialize(project=a.projeto)

pub = RAIZ / "public"
etapas = a.so or ["texturas", "mapas", "fotos"]
if "texturas" in etapas:
    gerar_texturas.rodar(pub / "texturas")
    for f in (pub / "texturas").glob("cand-*.jpg"):
        f.unlink()  # candidatos só servem para conferir
if "mapas" in etapas:
    falhas = gerar_mapas_brasil.rodar(pub / "dados", pub, dimensao=200, paralelo=10)
    if falhas:
        gerar_mapas_brasil.rodar(pub / "dados", pub, dimensao=200, paralelo=3)
if "fotos" in etapas:
    dados = {b: json.loads((pub / "dados" / f"{b}.json").read_text(encoding="utf-8")) for b in gerar_mapas_brasil.BIOMAS}
    amaz = {m[1] for m in dados["amazonia"]["m"]}
    cods = sorted({m[1] for b, d in dados.items() if b != "amazonia" for m in d["m"]} - amaz)
    if gerar_fotos.rodar(cods, pub / "fotos", 160, 10):
        gerar_fotos.rodar(cods, pub / "fotos", 160, 3)
