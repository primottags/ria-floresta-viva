-- Painel público "O que a Amazônia lembra".
-- Devolve só médias de grupos com pelo menos 5 respostas (anonimato k ≥ 5).
-- A página chama: POST /rest/v1/rpc/painel_publico (chave publicável).
create or replace function public.painel_publico()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select r.ano_nascimento,
           r.cod_ibge_municipio / 100000 as uf_cod,
           r.chute_infancia_pct as chute,
           r.real_infancia_pct as real
    from public.respostas r
    where r.real_infancia_pct is not null
  ),
  ger as (
    select case
             when ano_nascimento < 1960 then 'Antes de 1960'
             when ano_nascimento < 1970 then '1960–1969'
             when ano_nascimento < 1980 then '1970–1979'
             when ano_nascimento < 1990 then '1980–1989'
             when ano_nascimento < 2000 then '1990–1999'
             else '2000 ou depois'
           end as rotulo,
           min(ano_nascimento) as ordem,
           count(*) as n,
           round(avg(chute), 1) as chute,
           round(avg(real), 1) as real,
           round(avg(chute - real), 1) as diferenca
    from base group by 1
  ),
  est as (
    select case uf_cod when 11 then 'RO' when 12 then 'AC' when 13 then 'AM' when 14 then 'RR'
                       when 15 then 'PA' when 16 then 'AP' when 17 then 'TO' when 21 then 'MA'
                       when 51 then 'MT' end as uf,
           count(*) as n,
           round(avg(chute), 1) as chute,
           round(avg(real), 1) as real,
           round(avg(chute - real), 1) as diferenca
    from base group by 1
  )
  select json_build_object(
    'minimo', 5,
    'total', (select count(*) from base),
    'geracoes', coalesce((select json_agg(json_build_object('rotulo', rotulo, 'n', n, 'chute', chute, 'real', real, 'diferenca', diferenca) order by ordem) from ger where n >= 5), '[]'::json),
    'estados', coalesce((select json_agg(json_build_object('uf', uf, 'n', n, 'chute', chute, 'real', real, 'diferenca', diferenca) order by n desc) from est where n >= 5), '[]'::json),
    'atualizado', (now() at time zone 'America/Sao_Paulo')
  );
$$;

revoke all on function public.painel_publico() from public;
grant execute on function public.painel_publico() to anon, authenticated;
