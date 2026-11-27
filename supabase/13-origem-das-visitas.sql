-- COMPRAS RÁPIDAS — De onde vêm as visitas (Estatísticas do painel › Visitantes)
-- Só cria coisas novas: 2 colunas novas em cr_visitor_sessions e 2 funções novas. Nada existente é alterado.
-- Guarda apenas a ORIGEM da visita (youtube, instagram, tiktok, facebook, whatsapp, internet, outros, direto)
-- e, quando vem de outro site ou de uma busca, só o DOMÍNIO (ex.: google.com). Nenhum dado pessoal: sem IP, sem navegador.
-- Rode este arquivo inteiro UMA vez no SQL Editor do Supabase, no MESMO projeto do site (o do config.js).
-- Pode rodar de novo sem problema.
do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null then
  raise exception 'Projeto errado: este projeto não tem as tabelas da Compras Rápidas. Abra o projeto usado no config.js.'; end if;
 if to_regclass('public.cr_visitor_sessions') is null then
  raise exception 'Rode antes o arquivo supabase/03-visitantes.sql (ele cria a tabela de visitas).'; end if; end $$;

alter table cr_visitor_sessions add column if not exists source text, add column if not exists ref_host text;
create index if not exists cr_visitor_sessions_source on cr_visitor_sessions(started_at, source);

-- Chamada pelo site quando uma visita NOVA começa. Pode chegar antes ou depois do 'start' de cr_visit_track.
-- Só preenche a origem uma vez (não troca depois) e só em visitas de até 1 hora.
create or replace function cr_visit_source(p_sid uuid, p_source text, p_ref text) returns text
language plpgsql security definer set search_path=public as $$
declare s text := lower(coalesce(p_source,'')); r text;
begin
 if p_sid is null then return 'invalid'; end if;
 if s not in ('youtube','instagram','tiktok','facebook','whatsapp','internet','outros','direto') then s := 'outros'; end if;
 r := left(regexp_replace(lower(coalesce(p_ref,'')), '[^a-z0-9.-]', '', 'g'), 100);
 if r = '' then r := null; end if;
 insert into cr_visitor_sessions as v (id, source, ref_host) values (p_sid, s, r)
 on conflict (id) do update
   set source = coalesce(v.source, excluded.source),
       ref_host = case when v.source is null then coalesce(v.ref_host, excluded.ref_host) else v.ref_host end
   where v.started_at > now() - interval '1 hour' and (v.source is null or v.ref_host is null);
 return 'ok';
end $$;
revoke all on function cr_visit_source(uuid,text,text) from public;
grant execute on function cr_visit_source(uuid,text,text) to anon, authenticated;

-- Resumo para o painel (somente administradores). Datas no fuso de Brasília.
-- Visitas antigas (de antes deste arquivo), sem origem, contam como 'direto'.
create or replace function cr_visit_sources(p_days int default 30) returns jsonb
language plpgsql security definer set search_path=public as $$
declare tz text := 'America/Sao_Paulo'; d0 date; hoje date; res jsonb;
begin
 if not cr_is_admin() then raise exception 'Sem permissão'; end if;
 p_days := greatest(1, least(coalesce(p_days,30), 366));
 hoje := (now() at time zone tz)::date;
 d0 := hoje - (p_days-1);
 with v as (
   select coalesce(source,'direto') src, ref_host, (started_at at time zone tz)::date dia
   from cr_visitor_sessions where started_at >= (d0::timestamp at time zone tz))
 select jsonb_build_object(
   'days', p_days,
   'period', coalesce((select jsonb_object_agg(src, n) from (select src, count(*) n from v group by src) x), '{}'::jsonb),
   'today',  coalesce((select jsonb_object_agg(src, n) from (select src, count(*) n from v where dia = hoje group by src) x), '{}'::jsonb),
   'refs',   coalesce((select jsonb_agg(jsonb_build_object('host', ref_host, 'source', src, 'n', n) order by n desc, ref_host)
                       from (select ref_host, src, count(*) n from v where src in ('outros','internet') and ref_host is not null
                             group by ref_host, src order by count(*) desc, ref_host limit 10) x), '[]'::jsonb)
 ) into res;
 return res;
end $$;
revoke all on function cr_visit_sources(int) from public, anon;
grant execute on function cr_visit_sources(int) to authenticated;
