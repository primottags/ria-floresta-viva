-- Exporta as respostas para a análise (rodar no SQL editor do Supabase, conta da Priscila).
-- Exclui linhas de teste. A página nunca lê esta tabela: a chave pública só insere.
select id_resposta, data_resposta, versao_questionario, cod_ibge_municipio, ano_nascimento,
       ano_referencia, chute_infancia_pct, chute_hoje_pct, ainda_mora,
       chute_futuro_pct, real_infancia_pct, real_hoje_pct, colecao_mapbiomas, origem
from public.respostas
where versao_questionario <> 'teste'
order by data_resposta;
