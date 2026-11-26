-- Números de uso e depoimentos para a inscrição (rodar no SQL Editor do Supabase).

-- 1. Funil por dia: aberturas da página, revelações (participando ou explorando),
--    respostas gravadas e cartões compartilhados.
select d.data,
       count(*) filter (where u.etapa = 'inicio')                          as aberturas,
       count(*) filter (where u.etapa = 'revelacao' and u.modo = 'participou') as revelacoes_participando,
       count(*) filter (where u.etapa = 'revelacao' and u.modo = 'explorou')   as revelacoes_explorando,
       (select count(*) from public.respostas r where r.data_resposta = d.data)      as respostas,
       (select count(*) from public.compartilhamentos c where c.data = d.data)       as compartilhamentos
from (select distinct data from public.uso) d
left join public.uso u on u.data = d.data
group by d.data order by d.data;

-- 2. Totais e origem (utm_source) das aberturas.
select origem, count(*) as aberturas from public.uso where etapa = 'inicio' group by origem order by 2 desc;

-- 3. Depoimentos que podem ser citados (sem nome), mais recentes primeiro.
select data, uf, decada_nascimento, texto from public.depoimentos where pode_citar order by data desc;
