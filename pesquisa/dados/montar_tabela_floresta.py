"""Monta a tabela de floresta por município do Pará (A floresta da sua infância).

Fonte: MapBiomas Brasil, Coleção 11, Cobertura 30m, estatísticas
"Biomas, Estados e Municípios" (MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY).
Uso: python montar_tabela_floresta.py <arquivo .zip ou .xlsx> <pasta de saída>
"""
import io, json, sys, zipfile, re
from pathlib import Path
import pandas as pd

COLECAO = "MapBiomas Brasil Coleção 11 (Cobertura 30m)"
FORMACAO_FLORESTAL = {3}
# Floresta = grupo "1. Floresta" da legenda da Col. 11 (inclui floresta alagável, savânica e mangue)
FLORESTA = {3, 4, 5, 6, 7, 49}
# Vegetação nativa = grupos "1. Floresta" e "2. Vegetação Herbácea e Arbustiva" da legenda da Col. 11
VEG_NATIVA = {3, 4, 5, 6, 7, 49, 10, 11, 12, 29, 32, 50, 77, 84}
AGUA = {26, 33, 31}

def ler_planilha(caminho):
    caminho = Path(caminho)
    if caminho.suffix.lower() == ".csv":  # recorte do Pará já extraído da aba COVERAGE_11
        return pd.read_csv(caminho), "COVERAGE_11"
    if caminho.suffix.lower() == ".zip":
        with zipfile.ZipFile(caminho) as z:
            nome = [n for n in z.namelist() if n.lower().endswith(".xlsx")][0]
            dados = io.BytesIO(z.read(nome))
    else:
        dados = caminho
    xl = pd.ExcelFile(dados)
    aba = [s for s in xl.sheet_names if s.upper().startswith("COVERAGE")][0]
    return pd.read_excel(xl, aba), aba

def main(entrada, saida):
    df, aba = ler_planilha(entrada)
    df = df[df["state"].isin(["Pará", "PA"])].copy()
    anos = sorted(c for c in df.columns if re.fullmatch(r"y?\d{4}", str(c)))
    col_mun = next(c for c in df.columns if str(c).lower() in ("municipality", "city", "municipio"))
    col_geo = next((c for c in df.columns if str(c).lower() in ("geocode", "geocodigo", "feature_id", "cod_ibge")), None)
    df["class"] = df["class"].astype(int)
    chaves = [col_mun] + ([col_geo] if col_geo else [])
    df[anos] = df[anos].fillna(0)
    total = df.groupby(chaves)[anos].sum()       # soma todos os biomas e classes
    grp = df[df["class"].isin(FLORESTA)].groupby(chaves)[anos].sum().reindex(total.index, fill_value=0)
    flo = df[df["class"].isin(FORMACAO_FLORESTAL)].groupby(chaves)[anos].sum().reindex(total.index, fill_value=0)
    nat = df[df["class"].isin(VEG_NATIVA)].groupby(chaves)[anos].sum().reindex(total.index, fill_value=0)
    agua = df[df["class"].isin(AGUA)].groupby(chaves)[anos].sum().reindex(total.index, fill_value=0)

    linhas, municipios = [], []
    for idx in total.index:
        nome = idx[0] if isinstance(idx, tuple) else idx
        geo = str(int(idx[1])) if col_geo else None
        area_total = float(total.loc[idx, anos[-1]])
        serie = {}
        for a in anos:
            ano = int(str(a).lstrip("y"))
            t = float(total.loc[idx, a]); g = float(grp.loc[idx, a]); f = float(flo.loc[idx, a]); n = float(nat.loc[idx, a]); w = float(agua.loc[idx, a])
            serie[ano] = [round(g), round(100 * g / t, 2), round(f), round(100 * f / t, 2), round(n), round(100 * n / t, 2)]
            linhas.append({"municipio": nome, "cod_ibge": geo, "ano": ano, "area_total_ha": round(t),
                           "agua_ha": round(w), "floresta_ha": round(g), "floresta_pct": round(100 * g / t, 2),
                           "formacao_florestal_ha": round(f),
                           "formacao_florestal_pct": round(100 * f / t, 2),
                           "vegetacao_nativa_ha": round(n), "vegetacao_nativa_pct": round(100 * n / t, 2)})
        municipios.append({"nome": nome, "cod_ibge": geo, "area_total_ha": round(area_total), "serie": serie})
    municipios.sort(key=lambda m: m["nome"])
    saida = Path(saida); saida.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(linhas).sort_values(["municipio", "ano"]).to_csv(saida / "floresta_municipios_para.csv", index=False, encoding="utf-8")
    out = {"fonte": COLECAO, "indicador_principal": "floresta", "aba_origem": aba, "unidade_area": "hectares",
           "colunas_serie": ["floresta_ha", "floresta_pct", "formacao_florestal_ha", "formacao_florestal_pct", "vegetacao_nativa_ha", "vegetacao_nativa_pct"],
           "denominador_pct": "área total do município no MapBiomas (todas as classes, incluindo água)",
           "classes": {"floresta": sorted(FLORESTA), "formacao_florestal": sorted(FORMACAO_FLORESTAL), "vegetacao_nativa": sorted(VEG_NATIVA)},
           "anos": [int(str(a).lstrip("y")) for a in anos], "municipios": municipios}
    (saida / "floresta_municipios_para.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(municipios), "municípios;", len(anos), "anos")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
