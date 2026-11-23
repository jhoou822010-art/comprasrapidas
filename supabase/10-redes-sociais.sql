-- COMPRAS RÁPIDAS — Cliques nas redes sociais do rodapé (Instagram e Facebook) · Estatísticas do painel
-- Cria somente objetos novos com prefixo cr_social*. Nada existente é alterado (cr_click_events e visitantes seguem iguais).
-- Guarda apenas: rede, onde o link estava (rodapé ou seção "redes sociais" do Início), página e horário. Nenhum dado pessoal.
-- Rode este arquivo inteiro UMA vez no SQL Editor do Supabase, no MESMO projeto do site (o do config.js). Pode rodar de novo.
do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null then
  raise exception 'Projeto errado: este projeto não tem as tabelas da Compras Rápidas. Abra o projeto usado no config.js.'; end if; end $$;

create table if not exists cr_social_clicks(
 id uuid primary key,                                   -- código do clique gerado no navegador: reenvio do mesmo clique não duplica
 network text not null check (network in ('instagram','facebook')),
 origin text not null default 'rodape' check (origin in ('rodape','redes')),
 sid uuid,                                              -- sessão anônima do visitante (a mesma do monitoramento de visitantes)
 page text,                                             -- página onde o link foi tocado (ex.: index.html)
 created_at timestamptz not null default now()
);
create index if not exists cr_social_clicks_created on cr_social_clicks(created_at);
create index if not exists cr_social_clicks_sid on cr_social_clicks(sid, network, created_at) where sid is not null;

-- Somente administradores leem/alteram a tabela; visitantes usam apenas a função cr_social_track.
alter table cr_social_clicks enable row level security;
do $$ begin if not exists(select 1 from pg_policies where tablename='cr_social_clicks' and policyname='cr_admin_all') then
create policy cr_admin_all on cr_social_clicks for all using (cr_is_admin()) with check (cr_is_admin());
end if; end $$;

-- Chamada pelo site no momento do toque, antes de abrir a rede social.
-- Evita duplicados: (1) o mesmo código de clique só entra uma vez; (2) toque duplo / clique repetido da mesma sessão
-- na mesma rede em menos de 3 segundos conta uma vez só. Retorna 'ok', 'dup' ou 'invalid'.
create or replace function cr_social_track(p_id uuid, p_network text, p_origin text default 'rodape', p_sid uuid default null, p_page text default null)
returns text language plpgsql security definer set search_path=public as $$
declare n int;
begin
 if p_id is null or p_network not in ('instagram','facebook') then return 'invalid'; end if;
 if p_origin is null or p_origin not in ('rodape','redes') then p_origin:='rodape'; end if;
 if p_sid is not null then
  perform pg_advisory_xact_lock(hashtext(p_sid::text||p_network));          -- dois envios simultâneos da mesma sessão
  if exists(select 1 from cr_social_clicks where sid=p_sid and network=p_network and created_at > now()-interval '3 seconds') then return 'dup'; end if;
 end if;
 insert into cr_social_clicks(id,network,origin,sid,page) values(p_id,p_network,p_origin,p_sid,left(p_page,120)) on conflict (id) do nothing;
 get diagnostics n=row_count;
 return case when n=1 then 'ok' else 'dup' end;
end $$;
revoke all on function cr_social_track(uuid,text,text,uuid,text) from public;
grant execute on function cr_social_track(uuid,text,text,uuid,text) to anon, authenticated;

-- Resumo para o painel (somente administradores). Mesmo período do filtro da aba Estatísticas. Datas no fuso de Brasília.
create or replace function cr_social_stats(p_days int default 30) returns jsonb language plpgsql security definer set search_path=public as $$
declare tz text:='America/Sao_Paulo'; d0 date; t0 timestamptz; res jsonb;
begin
 if not cr_is_admin() then raise exception 'Sem permissão'; end if;
 p_days:=greatest(1,least(coalesce(p_days,30),366));
 d0:=(now() at time zone tz)::date-(p_days-1); t0:=d0::timestamp at time zone tz;
 with dias as (select generate_series(d0,(now() at time zone tz)::date,interval '1 day')::date dia),
 c as (select (created_at at time zone tz)::date dia, count(*) filter (where network='instagram') ig, count(*) filter (where network='facebook') fb
       from cr_social_clicks where created_at >= t0 group by 1)
 select jsonb_build_object(
  'now',now(),
  'instagram',(select count(*) from cr_social_clicks where network='instagram' and created_at >= t0),
  'facebook',(select count(*) from cr_social_clicks where network='facebook' and created_at >= t0),
  'total_instagram',(select count(*) from cr_social_clicks where network='instagram'),
  'total_facebook',(select count(*) from cr_social_clicks where network='facebook'),
  'days',coalesce((select jsonb_agg(jsonb_build_object('day',d.dia,'instagram',coalesce(c.ig,0),'facebook',coalesce(c.fb,0)) order by d.dia desc)
          from dias d left join c on c.dia=d.dia),'[]'::jsonb)) into res;
 return res;
end $$;
revoke all on function cr_social_stats(int) from public, anon;
grant execute on function cr_social_stats(int) to authenticated;

-- DESFAZER (apaga só o que este arquivo criou):
-- drop function if exists cr_social_stats(int); drop function if exists cr_social_track(uuid,text,text,uuid,text); drop table if exists cr_social_clicks;
