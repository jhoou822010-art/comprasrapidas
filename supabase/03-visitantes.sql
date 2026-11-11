-- COMPRAS RÁPIDAS — Monitoramento de visitantes (Estatísticas do painel)
-- Cria somente objetos novos com prefixo cr_visit*. Nada existente é alterado.
-- Registra apenas: entradas, saídas, atividade (último sinal) e permanência, por sessão anônima.
-- Nenhum dado pessoal é guardado (sem IP, sem navegador, sem usuário): só um código aleatório da sessão.
-- Rode este arquivo inteiro UMA vez no SQL Editor do Supabase, no MESMO projeto do site (o do config.js).
do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null then
  raise exception 'Projeto errado: este projeto não tem as tabelas da Compras Rápidas. Abra o projeto usado no config.js.'; end if; end $$;

create table if not exists cr_visitor_sessions(
 id uuid primary key,                         -- código anônimo gerado no navegador (crypto.randomUUID)
 started_at timestamptz not null default now(),-- entrada
 last_seen timestamptz not null default now(), -- último sinal de atividade
 ended_at timestamptz                          -- saída (fechou a página ou ficou inativa)
);
create index if not exists cr_visitor_sessions_started on cr_visitor_sessions(started_at);
create index if not exists cr_visitor_sessions_ended on cr_visitor_sessions(ended_at);
create index if not exists cr_visitor_sessions_open on cr_visitor_sessions(last_seen) where ended_at is null;

-- Somente administradores leem/alteram a tabela diretamente; visitantes usam apenas a função cr_visit_track.
alter table cr_visitor_sessions enable row level security;
do $$ begin if not exists(select 1 from pg_policies where tablename='cr_visitor_sessions' and policyname='cr_admin_all') then
create policy cr_admin_all on cr_visitor_sessions for all using (cr_is_admin()) with check (cr_is_admin());
end if; end $$;

-- Encerra sessões sem sinal há mais de 3 minutos (aba fechada sem aviso, celular bloqueado, queda de internet).
-- A saída é registrada no horário do último sinal recebido.
create or replace function cr_visit_close_stale() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
 update cr_visitor_sessions set ended_at=last_seen where ended_at is null and last_seen < now()-interval '3 minutes';
 get diagnostics n=row_count; return n;
end $$;
revoke all on function cr_visit_close_stale() from public, anon, authenticated;

-- Chamada pelo site: p_event = 'start' (abriu página), 'ping' (continua ativo) ou 'end' (fechou/saiu).
-- Atualizar a página ou navegar entre páginas reaproveita a mesma sessão: não conta nova entrada.
-- Retorna 'ok', ou 'expired' quando a sessão já terminou há mais de 30 min (o navegador cria outra).
create or replace function cr_visit_track(p_sid uuid, p_event text) returns text language plpgsql security definer set search_path=public as $$
declare r cr_visitor_sessions;
begin
 if p_sid is null or p_event not in ('start','ping','end') then return 'invalid'; end if;
 select * into r from cr_visitor_sessions where id=p_sid for update;
 if not found then
  if p_event='end' then return 'ok'; end if;
  insert into cr_visitor_sessions(id) values(p_sid) on conflict (id) do nothing;   -- nova entrada
  if p_event='start' then perform cr_visit_close_stale(); end if;
  return 'ok';
 end if;
 if r.ended_at is not null and r.ended_at < now()-interval '30 minutes' then return 'expired'; end if;
 if r.started_at < now()-interval '12 hours' then return 'expired'; end if;      -- limite de segurança
 if p_event='end' then
  update cr_visitor_sessions set last_seen=now(), ended_at=coalesce(ended_at,now()) where id=p_sid;
 else
  -- voltou (recarregou a página, trocou de página ou reabriu a aba em até 30 min): continua a mesma visita
  update cr_visitor_sessions set last_seen=now(), ended_at=null where id=p_sid;
 end if;
 return 'ok';
end $$;
revoke all on function cr_visit_track(uuid,text) from public;
grant execute on function cr_visit_track(uuid,text) to anon, authenticated;

-- Resumo para o painel (somente administradores). Datas no fuso de Brasília.
create or replace function cr_visit_stats(p_days int default 30) returns jsonb language plpgsql security definer set search_path=public as $$
declare tz text:='America/Sao_Paulo'; d0 date; res jsonb;
begin
 if not cr_is_admin() then raise exception 'Sem permissão'; end if;
 perform cr_visit_close_stale();
 p_days:=greatest(1,least(coalesce(p_days,30),366));
 d0:=(now() at time zone tz)::date-(p_days-1);
 with dias as (select generate_series(d0,(now() at time zone tz)::date,interval '1 day')::date dia),
 ent as (select (started_at at time zone tz)::date dia, count(*) n from cr_visitor_sessions
         where started_at >= (d0::timestamp at time zone tz) group by 1),
 sai as (select (ended_at at time zone tz)::date dia, count(*) n,
                avg(extract(epoch from (ended_at-started_at))) media
         from cr_visitor_sessions where ended_at >= (d0::timestamp at time zone tz) group by 1)
 select jsonb_build_object(
  'online',(select count(*) from cr_visitor_sessions where ended_at is null and last_seen > now()-interval '75 seconds'),
  'now',now(),
  'days',coalesce((select jsonb_agg(jsonb_build_object('day',d.dia,'entries',coalesce(e.n,0),'exits',coalesce(s.n,0),'avg_seconds',round(coalesce(s.media,0))) order by d.dia desc)
          from dias d left join ent e on e.dia=d.dia left join sai s on s.dia=d.dia),'[]'::jsonb)) into res;
 return res;
end $$;
revoke all on function cr_visit_stats(int) from public, anon;
grant execute on function cr_visit_stats(int) to authenticated;
