"""Monta os dados da página por bioma, para todo o Brasil (A floresta da sua infância).

Fonte: MapBiomas Brasil, Coleção 11, Cobertura 30m, estatísticas "Biomas, Estados e Municípios"
(MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY), aba COVERAGE_11.
Uso: python montar_tabela_brasil.py <arquivo .zip ou .pkl> <pasta de saída>

Regras:
- A pessoa escolhe o bioma. Entra no bioma todo município com pelo menos 10% da área nele
  (mesma regra já usada na Amazônia). Um município entre dois biomas aparece nos dois.
- Indicador: Amazônia e Mata Atlântica -> floresta (classes 3, 4, 5, 6, 7, 49);
  Cerrado, Caatinga, Pantanal e Pampa -> vegetação nativa (floresta + formações não florestais
  10, 11, 12, 29, 32, 50, 77, 84), porque ali o natural também é savana, caatinga e campo.
- Percentual sobre a área total do município (todos os biomas, inclusive água).
- Saída: <bioma>.json (m = [nome, cod_ibge, [pct por ano]]) e uma tabela longa em CSV.
  A Amazônia sai idêntica à versão anterior (540 municípios).
Nenhum dado, modelo ou código do SINFAM é usado.
"""
import io, json, re, sys, zipfile
from pathlib import Path
import pandas as pd

FLORESTA = [3, 4, 5, 6, 7, 49]
VEG_NATIVA = FLORESTA + [10, 11, 12, 29, 32, 50, 77, 84]
BIOMAS = {"amazonia": ("Amazônia", FLORESTA), "mata-atlantica": ("Mata Atlântica", FLORESTA),
          "cerrado": ("Cerrado", VEG_NATIVA), "caatinga": ("Caatinga", VEG_NATIVA),
          "pantanal": ("Pantanal", VEG_NATIVA), "pampa": ("Pampa", VEG_NATIVA)}
MIN_PCT = 10

def ler(caminho):
    caminho = Path(caminho)
    if caminho.suffix == ".pkl":
        return pd.read_pickle(caminho)
    with zipfile.ZipFile(caminho) as z:
        nome = [n for n in z.namelist() if n.lower().endswith(".xlsx")][0]
        return pd.read_excel(io.BytesIO(z.read(nome)), "COVERAGE_11")

def main(entrada, saida):
    df = ler(entrada)
    anos = sorted(c for c in df.columns if re.fullmatch(r"y?\d{4}", str(c)))
    anos_int = [int(str(a).lstrip("y")) for a in anos]
    df[anos] = df[anos].fillna(0)
    df["class"] = df["class"].astype(int); df["geocode"] = df["geocode"].astype(int)
    chaves = ["geocode", "municipality", "state"]
    total = df.groupby(chaves)[anos].sum()
    total = total[total[anos[-1]] > 0]
    por_bioma = df.groupby(chaves + ["biome"])[anos[-1]].sum().unstack(fill_value=0).reindex(total.index, fill_value=0)
    saida = Path(saida); saida.mkdir(parents=True, exist_ok=True)
    longas, resumo = [], {}
    for slug, (nome_bioma, classes) in BIOMAS.items():
        pct_area = 100 * por_bioma[nome_bioma] / total[anos[-1]]
        dentro = pct_area[pct_area >= MIN_PCT].index
        ind = df[df["class"].isin(classes)].groupby(chaves)[anos].sum().reindex(dentro, fill_value=0)
        pct = (100 * ind / total.loc[dentro]).round(2)
        m = [[idx[1], idx[0], [round(float(v), 2) for v in pct.loc[idx]]] for idx in dentro]
        m.sort(key=lambda r: (0 if str(r[1]).startswith("15") else 1, r[0].lower()))
        (saida / f"{slug}.json").write_text(json.dumps({"ano0": anos_int[0], "anoN": anos_int[-1], "colecao": "11", "bioma": nome_bioma,
            "indicador": "floresta" if classes is FLORESTA else "vegetacao_nativa", "recorte": f"municípios com pelo menos {MIN_PCT}% da área no bioma {nome_bioma}",
            "m": m}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        longa = pct.copy(); longa.columns = anos_int; longa = longa.stack().rename("indicador_pct").reset_index()
        longa = longa.rename(columns={"level_3": "ano", "geocode": "cod_ibge", "municipality": "municipio", "state": "estado"})
        longa["bioma"] = nome_bioma; longa["indicador"] = "floresta" if classes is FLORESTA else "vegetacao_nativa"
        longa["pct_area_no_bioma"] = longa["cod_ibge"].map({k[0]: round(float(v), 1) for k, v in pct_area.loc[dentro].items()})
        longas.append(longa); resumo[slug] = len(m)
    pd.concat(longas).to_csv(saida / "indicador_municipios_por_bioma.csv", index=False, encoding="utf-8")
    print(resumo)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
