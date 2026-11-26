"""Monta a tabela de floresta por município do bioma Amazônia (A floresta da sua infância).

Fonte: MapBiomas Brasil, Coleção 11, Cobertura 30m, estatísticas
"Biomas, Estados e Municípios" (MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY), aba COVERAGE_11.
Uso: python montar_tabela_amazonia.py <arquivo .zip, .xlsx ou .csv> <pasta de saída>

Regra de inclusão: entra todo município com pelo menos 10% da área no bioma Amazônia
(abaixo disso são lascas de limite, de 0% a 9%, em municípios do Cerrado).
Para municípios que cruzam dois biomas (Amazônia + Cerrado ou Pantanal), o percentual
usa o município inteiro (soma dos biomas), como já era feito no Pará; a coluna
pct_area_amazonia mostra quanto do município está no bioma.
Nenhum dado, modelo ou código do SINFAM é usado.
"""
import io, json, sys, zipfile, re
from pathlib import Path
import pandas as pd

FLORESTA = {3, 4, 5, 6, 7, 49}
FORMACAO_FLORESTAL = {3}
VEG_NATIVA = {3, 4, 5, 6, 7, 49, 10, 11, 12, 29, 32, 50, 77, 84}
AGUA = {26, 33, 31}
MIN_PCT_AMAZONIA = 10
UF = {"Rondônia": "RO", "Acre": "AC", "Amazonas": "AM", "Roraima": "RR", "Pará": "PA", "Amapá": "AP",
      "Tocantins": "TO", "Maranhão": "MA", "Mato Grosso": "MT"}

def ler(caminho):
    caminho = Path(caminho)
    if caminho.suffix.lower() == ".csv":
        return pd.read_csv(caminho)
    if caminho.suffix.lower() == ".zip":
        with zipfile.ZipFile(caminho) as z:
            nome = [n for n in z.namelist() if n.lower().endswith(".xlsx")][0]
            dados = io.BytesIO(z.read(nome))
    else:
        dados = caminho
    xl = pd.ExcelFile(dados)
    aba = [s for s in xl.sheet_names if s.upper().startswith("COVERAGE")][0]
    return pd.read_excel(xl, aba)

def main(entrada, saida):
    df = ler(entrada)
    anos = sorted(c for c in df.columns if re.fullmatch(r"y?\d{4}", str(c)))
    df[anos] = df[anos].fillna(0)
    df["class"] = df["class"].astype(int)
    df["geocode"] = df["geocode"].astype(int)
    amaz = set(df.loc[df["biome"] == "Amazônia", "geocode"])
    df = df[df["geocode"].isin(amaz)].copy()
    chaves = ["geocode", "municipality", "state"]
    total = df.groupby(chaves)[anos].sum()
    soma = lambda classes, base=df: base[base["class"].isin(classes)].groupby(chaves)[anos].sum().reindex(total.index, fill_value=0)
    flo, ff, nat, agua = soma(FLORESTA), soma(FORMACAO_FLORESTAL), soma(VEG_NATIVA), soma(AGUA)
    area_amz = df[df["biome"] == "Amazônia"].groupby(chaves)[anos[-1]].sum().reindex(total.index, fill_value=0)

    linhas, pagina = [], []
    for idx in total.index:
        geo, nome, estado = idx
        uf = UF.get(estado, estado)
        t_ult = float(total.loc[idx, anos[-1]])
        pct_amz = round(100 * float(area_amz.loc[idx]) / t_ult, 1)
        if pct_amz < MIN_PCT_AMAZONIA:
            continue
        serie_pct = []
        for a in anos:
            ano = int(str(a).lstrip("y")); t = float(total.loc[idx, a])
            g, f, n, w = (float(x.loc[idx, a]) for x in (flo, ff, nat, agua))
            serie_pct.append(round(100 * g / t, 2))
            linhas.append({"municipio": nome, "uf": uf, "cod_ibge": geo, "ano": ano, "area_total_ha": round(t),
                           "pct_area_amazonia": pct_amz, "agua_ha": round(w),
                           "floresta_ha": round(g), "floresta_pct": round(100 * g / t, 2),
                           "formacao_florestal_ha": round(f), "formacao_florestal_pct": round(100 * f / t, 2),
                           "vegetacao_nativa_ha": round(n), "vegetacao_nativa_pct": round(100 * n / t, 2)})
        pagina.append([nome, uf, geo, serie_pct])
    ordem_uf = ["PA", "AM", "AC", "AP", "MA", "MT", "RO", "RR", "TO"]
    pagina.sort(key=lambda r: (ordem_uf.index(r[1]) if r[1] in ordem_uf else 99, r[0].lower()))
    por_uf = pd.Series([r[1] for r in pagina]).value_counts().to_dict()
    pagina = [[r[0], r[2], r[3]] for r in pagina]  # a página deduz o estado pelo código IBGE
    saida = Path(saida); saida.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(linhas).sort_values(["uf", "municipio", "ano"]).to_csv(saida / "floresta_municipios_amazonia.csv", index=False, encoding="utf-8")
    anos_int = [int(str(a).lstrip("y")) for a in anos]
    # Arquivo da página: m = [nome, cod_ibge, [floresta_pct por ano]], Pará primeiro e depois os outros estados
    (saida / "dados_pagina.json").write_text(json.dumps({"ano0": anos_int[0], "anoN": anos_int[-1], "colecao": "11",
        "recorte": "municípios com área no bioma Amazônia", "m": pagina}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(pagina), "municípios;", len(anos), "anos;", por_uf)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
