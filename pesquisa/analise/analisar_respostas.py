"""Análise das respostas de "A floresta da sua infância".

Uso:
    python analisar_respostas.py respostas.csv saida/

respostas.csv = exportação da tabela `respostas` do Supabase (Table editor > Export to CSV,
ou a consulta em exportar_respostas.sql). Gera, na pasta de saída:

  resumo_geracoes.csv      erro médio do chute por geração (pergunta central)
  resumo_municipios.csv    erro por município (só grupos com 5+ respostas)
  resumo_estados_municipios_pequenos.csv  municípios com menos de 5 respostas, juntados por estado
  dados_abertos.csv        tabela anonimizada para o GitHub (faixas de 5 anos, sem código nem origem)
  relatorio.md             números principais em texto

Regras de anonimato (termo v1, item 8, e questionário): nenhum grupo com menos de 5 respostas
é publicado; os dados abertos trocam o ano de nascimento por faixa de 5 anos e tiram id_resposta e origem.
Nenhum dado ou código do SINFAM é usado.
"""
import sys, csv, statistics as st, pathlib
from collections import defaultdict

MIN_GRUPO = 5
GERACOES = [(None, 1974, "até 1974"), (1975, 1984, "1975–1984"), (1985, 1994, "1985–1994"), (1995, 2008, "1995–2008")]

def geracao(ano):
    for a, b, nome in GERACOES:
        if (a is None or ano >= a) and ano <= b:
            return nome
    return "outra"

def faixa5(ano):
    a = ano - ano % 5
    return f"{a}–{a+4}"

def num(x):
    return None if x in ("", None) else float(str(x).replace(",", "."))

def ler(caminho):
    with open(caminho, encoding="utf-8-sig") as f:
        rows = []
        for r in csv.DictReader(f):
            if r.get("versao_questionario", "v1") == "teste":
                continue
            r = dict(r)
            for k in ("chute_infancia_pct", "chute_hoje_pct", "real_infancia_pct", "real_hoje_pct"):
                r[k] = num(r.get(k))
            r["ano_nascimento"] = int(r["ano_nascimento"])
            r["ano_referencia"] = int(r["ano_referencia"])
            r["erro_infancia"] = r["chute_infancia_pct"] - r["real_infancia_pct"]
            r["perda_real"] = r["real_infancia_pct"] - r["real_hoje_pct"]
            if r["chute_hoje_pct"] is not None:
                r["erro_hoje"] = r["chute_hoje_pct"] - r["real_hoje_pct"]
                r["perda_lembrada"] = r["chute_infancia_pct"] - r["chute_hoje_pct"]
            else:
                r["erro_hoje"] = r["perda_lembrada"] = None
            r["geracao"] = geracao(r["ano_nascimento"])
            rows.append(r)
    return rows

def resumir(grupo):
    def m(k):
        v = [g[k] for g in grupo if g[k] is not None]
        return (round(st.mean(v), 1), round(st.median(v), 1), len(v)) if v else (None, None, 0)
    ei, eh, pr, pl = m("erro_infancia"), m("erro_hoje"), m("perda_real"), m("perda_lembrada")
    return {"n": len(grupo), "erro_infancia_media": ei[0], "erro_infancia_mediana": ei[1],
            "erro_hoje_media": eh[0], "n_com_chute_hoje": eh[2],
            "perda_real_media": pr[0], "perda_lembrada_media": pl[0],
            "pct_subestimou_passado": round(100 * sum(g["erro_infancia"] < 0 for g in grupo) / len(grupo), 1)}

def gravar(caminho, linhas):
    if not linhas:
        caminho.write_text("", encoding="utf-8"); return
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0])); w.writeheader(); w.writerows(linhas)

def main(entrada, saida):
    saida = pathlib.Path(saida); saida.mkdir(parents=True, exist_ok=True)
    rows = ler(entrada)
    por_ger = defaultdict(list); por_mun = defaultdict(list)
    for r in rows:
        por_ger[r["geracao"]].append(r); por_mun[r["cod_ibge_municipio"]].append(r)
    ordem = [g[2] for g in GERACOES]
    ger = []
    for nome in ordem:
        g = por_ger.get(nome, [])
        if len(g) >= MIN_GRUPO:
            ger.append({"geracao": nome, **resumir(g)})
        else:
            ger.append({"geracao": nome, "n": len(g), "obs": f"menos de {MIN_GRUPO} respostas: não publicado"})
    gravar(saida / "resumo_geracoes.csv", [g for g in ger if "obs" not in g])
    mun = [{"cod_ibge": k, **resumir(v)} for k, v in sorted(por_mun.items()) if len(v) >= MIN_GRUPO]
    gravar(saida / "resumo_municipios.csv", mun)
    # municípios com menos de 5 respostas são juntados por estado (2 primeiros dígitos do código IBGE)
    UF = {"11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "51": "MT"}
    por_uf = defaultdict(list)
    for k, v in por_mun.items():
        if len(v) < MIN_GRUPO:
            por_uf[UF.get(str(k)[:2], str(k)[:2])].extend(v)
    gravar(saida / "resumo_estados_municipios_pequenos.csv",
           [{"uf": k, **resumir(v)} for k, v in sorted(por_uf.items()) if len(v) >= MIN_GRUPO])
    abertos = [{"cod_ibge_municipio": r["cod_ibge_municipio"], "faixa_nascimento": faixa5(r["ano_nascimento"]),
                "ano_referencia": r["ano_referencia"], "chute_infancia_pct": r["chute_infancia_pct"],
                "chute_hoje_pct": r["chute_hoje_pct"], "ainda_mora": r.get("ainda_mora") or "",
                "real_infancia_pct": r["real_infancia_pct"], "real_hoje_pct": r["real_hoje_pct"],
                "versao_questionario": r.get("versao_questionario", "v1")} for r in rows]
    gravar(saida / "dados_abertos.csv", abertos)
    linhas = [f"# Resultados — A floresta da sua infância", "", f"Respostas válidas: {len(rows)}. "
              f"Municípios com {MIN_GRUPO}+ respostas: {len(mun)}.", "", "| Geração | n | Erro médio do chute (pontos) | Subestimou o passado (%) |", "|---|---|---|---|"]
    for g in ger:
        if "obs" in g: linhas.append(f"| {g['geracao']} | {g['n']} | — | — |")
        else: linhas.append(f"| {g['geracao']} | {g['n']} | {g['erro_infancia_media']} | {g['pct_subestimou_passado']} |")
    linhas += ["", "Erro = chute − valor do MapBiomas no ano dos 10 anos. Negativo = a pessoa lembrou menos floresta do que havia.",
               f"Grupos com menos de {MIN_GRUPO} respostas aparecem como —."]
    (saida / "relatorio.md").write_text("\n".join(linhas), encoding="utf-8")
    print("\n".join(linhas))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
