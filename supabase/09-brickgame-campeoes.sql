-- COMPRAS RÁPIDAS — Desafio Brick Game, parte 2: campeões, recado do campeão, "quem passou quem" e aviso no celular.
-- Precisa do arquivo 08-brickgame-desafio.sql rodado antes.
-- Rode UMA vez no Supabase: SQL Editor > New query > cole este arquivo inteiro > Run. Pode rodar de novo sem problema.
-- Cria SOMENTE objetos novos com prefixo cr_brick_ (4 tabelas pequenas, funções e um gatilho na tabela cr_brick_partidas,
-- que também é do Desafio). Nada da loja é alterado ou apagado.
--
--  * cr_brick_campeoes: o 1º lugar atual de cada jogo (10 linhas no máximo) e o recado que ele escolheu.
--    O recado é o NÚMERO de uma frase pronta (lista em js/brickgame-desafio.js): ninguém digita texto.
--  * cr_brick_feitos: "JOÃO passou MARIA na Corrida" (guarda só os 100 mais recentes).
--  * cr_brick_jogadores: liga o código do aparelho à inscrição de notificações (só de quem tocou em "Ativar avisos").
--  * cr_brick_avisos: fila dos avisos "passaram seu recorde", enviada pela função send-push (a cada 5 minutos,
--    respeitando o horário de silêncio). No máximo 1 aviso pendente por aparelho e jogo; enviados somem em 7 dias.
do $$ begin
 if to_regclass('public.cr_brick_partidas') is null then
  raise exception 'Rode antes o arquivo supabase/08-brickgame-desafio.sql (Desafio Brick Game).'; end if;
 if to_regclass('public.cr_push_subscriptions') is null then
  raise exception 'Projeto errado: não encontrei as notificações da Compras Rápidas (cr_push_subscriptions).'; end if; end $$;

create table if not exists cr_brick_campeoes(
 jogo char(1) primary key check (jogo between 'A' and 'J'),
 aparelho uuid not null,
 apelido text not null,
 pontos int not null,
 frase smallint check (frase between 0 and 11),
 desde timestamptz not null default now()
);
create table if not exists cr_brick_feitos(
 id bigserial primary key,
 jogo char(1) not null check (jogo between 'A' and 'J'),
 quem text not null, de text not null, pontos int not null, antes int not null,
 em timestamptz not null default now()
);
create table if not exists cr_brick_jogadores(
 aparelho uuid primary key,
 endpoint text not null,
 atualizado_em timestamptz not null default now()
);
create table if not exists cr_brick_avisos(
 id bigserial primary key,
 endpoint text not null,
 jogo char(1) not null,
 titulo text not null, corpo text not null, url text,
 criado_em timestamptz not null default now(),
 enviado_em timestamptz, erro text
);
create unique index if not exists cr_brick_avisos_pendente on cr_brick_avisos(endpoint, jogo) where enviado_em is null;
create index if not exists cr_brick_feitos_em on cr_brick_feitos(em desc);

do $$ declare t text; begin
 foreach t in array array['cr_brick_campeoes','cr_brick_feitos','cr_brick_jogadores','cr_brick_avisos'] loop
  execute format('alter table %I enable row level security', t);
  if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='cr_admin_all') then
   execute format('create policy cr_admin_all on %I for all using (cr_is_admin()) with check (cr_is_admin())', t); end if;
  execute format('revoke all on %I from anon, authenticated', t);
  execute format('grant select, update, delete on %I to authenticated', t);   -- na prática só administradores (política acima)
 end loop; end $$;

-- Nome dos jogos (para o texto do aviso)
create or replace function cr_brick_nome(j text) returns text language sql immutable as $$
 select case j when 'A' then 'Corrida' when 'B' then 'Blocos' when 'C' then 'Cobrinha' when 'D' then 'Tanque' when 'E' then 'Muralha'
  when 'F' then 'Quebra-tijolos' when 'G' then 'Travessia' when 'H' then 'Pingue-pongue' when 'I' then 'Chuva' else 'Saltador' end
$$;

-- Confere o 1º lugar de um jogo. p_passou = true quando foi uma partida nova (aí registra "quem passou quem" e avisa
-- o campeão anterior); false quando foi o painel apagando um resultado (troca o campeão em silêncio).
create or replace function cr_brick_conferir(p_jogo text, p_passou boolean) returns void
language plpgsql security definer set search_path=public as $$
declare novo record; velho cr_brick_campeoes; ep text; site text;
begin
 select p.aparelho, a.apelido, p.pontos into novo
  from cr_brick_partidas p
  join lateral (select apelido from cr_brick_partidas x where x.aparelho=p.aparelho and x.finalizada_em is not null and x.apelido is not null
                order by x.finalizada_em desc limit 1) a on true
  where p.jogo=p_jogo and p.finalizada_em is not null and p.pontos > 0
  order by p.pontos desc, p.finalizada_em asc limit 1;
 select * into velho from cr_brick_campeoes where jogo=p_jogo;
 if novo.aparelho is null then delete from cr_brick_campeoes where jogo=p_jogo; return; end if;
 if velho.jogo is null then
  insert into cr_brick_campeoes(jogo, aparelho, apelido, pontos) values (p_jogo, novo.aparelho, novo.apelido, novo.pontos); return; end if;
 if velho.aparelho = novo.aparelho then
  if velho.pontos <> novo.pontos or velho.apelido <> novo.apelido then
   update cr_brick_campeoes set pontos=novo.pontos, apelido=novo.apelido where jogo=p_jogo; end if;
  return; end if;
 -- campeão novo
 update cr_brick_campeoes set aparelho=novo.aparelho, apelido=novo.apelido, pontos=novo.pontos, frase=null, desde=now() where jogo=p_jogo;
 if p_passou and novo.pontos > velho.pontos then
  insert into cr_brick_feitos(jogo, quem, de, pontos, antes) values (p_jogo, novo.apelido, velho.apelido, novo.pontos, velho.pontos);
  delete from cr_brick_feitos where id < (select min(id) from (select id from cr_brick_feitos order by id desc limit 100) k);
  select endpoint into ep from cr_brick_jogadores where aparelho=velho.aparelho;
  if ep is not null then
   select coalesce(nullif(rtrim(s.site_url,'/'),''),'') into site from cr_notification_settings s where s.id=1;
   insert into cr_brick_avisos(endpoint, jogo, titulo, corpo, url)
    values (ep, p_jogo, '😱 ' || novo.apelido || ' passou seu recorde!',
            cr_brick_nome(p_jogo) || ': ' || novo.pontos || ' pontos contra os seus ' || velho.pontos || '. Vem recuperar o 1º lugar! 🏆',
            coalesce(site,'') || '/brickgame.html?jogo=' || p_jogo)
    on conflict (endpoint, jogo) where enviado_em is null
    do update set titulo=excluded.titulo, corpo=excluded.corpo, criado_em=now();
  end if;
 end if;
 delete from cr_brick_avisos where (enviado_em is not null and enviado_em < now()-interval '7 days') or criado_em < now()-interval '2 days';
end $$;
revoke all on function cr_brick_conferir(text,boolean) from public, anon, authenticated;

-- Gatilho: toda partida enviada (ou apelido trocado) confere o 1º lugar; apagar pelo painel também.
create or replace function cr_brick_gatilho() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op = 'DELETE' then
  if old.finalizada_em is not null then perform cr_brick_conferir(old.jogo, false); end if;
  return old; end if;
 if new.finalizada_em is not null and (old.finalizada_em is null or old.apelido is distinct from new.apelido) then
  perform cr_brick_conferir(new.jogo, true); end if;
 return new;
end $$;
drop trigger if exists cr_brick_partidas_campeao on cr_brick_partidas;
create trigger cr_brick_partidas_campeao after update or delete on cr_brick_partidas for each row execute function cr_brick_gatilho();

-- Mural público: campeão de cada jogo (com o número do recado) e os últimos "quem passou quem". Sem códigos de aparelho.
create or replace function cr_brick_mural(p_aparelho uuid default null) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'campeoes', coalesce((select jsonb_object_agg(jogo, jsonb_build_object('apelido',apelido,'pontos',pontos,'frase',frase,'desde',desde,'voce',aparelho=p_aparelho)) from cr_brick_campeoes), '{}'::jsonb),
  'feitos', coalesce((select jsonb_agg(jsonb_build_object('jogo',jogo,'quem',quem,'de',de,'pontos',pontos,'antes',antes,'em',em) order by id desc)
                      from (select * from cr_brick_feitos order by id desc limit 8) f), '[]'::jsonb),
  'avisos', exists(select 1 from cr_brick_jogadores where aparelho=p_aparelho))
$$;

-- O campeão escolhe o recado (número de uma frase pronta). Só funciona para quem é o 1º lugar daquele jogo.
create or replace function cr_brick_frase(p_aparelho uuid, p_jogo text, p_frase int) returns jsonb
language plpgsql volatile security definer set search_path=public as $$
begin
 if p_frase is null or p_frase < 0 or p_frase > 11 then raise exception 'Recado inválido'; end if;
 update cr_brick_campeoes set frase=p_frase where jogo=p_jogo and aparelho=p_aparelho;
 if not found then raise exception 'Só o 1º lugar pode deixar o recado'; end if;
 return cr_brick_mural(p_aparelho);
end $$;

-- "Ativar avisos": liga este aparelho à inscrição de notificações que acabou de ser criada (cr_push_subscribe).
create or replace function cr_brick_vincular(p_aparelho uuid, p_endpoint text) returns boolean
language plpgsql volatile security definer set search_path=public as $$
begin
 if p_aparelho is null or not exists(select 1 from cr_push_subscriptions where endpoint=p_endpoint) then
  raise exception 'Notificações não ativadas neste aparelho'; end if;
 insert into cr_brick_jogadores(aparelho, endpoint) values (p_aparelho, p_endpoint)
  on conflict (aparelho) do update set endpoint=excluded.endpoint, atualizado_em=now();
 return true;
end $$;

revoke all on function cr_brick_mural(uuid) from public;
revoke all on function cr_brick_frase(uuid,text,int) from public;
revoke all on function cr_brick_vincular(uuid,text) from public;
grant execute on function cr_brick_mural(uuid) to anon, authenticated;
grant execute on function cr_brick_frase(uuid,text,int) to anon, authenticated;
grant execute on function cr_brick_vincular(uuid,text) to anon, authenticated;

-- Campeões de hoje (sem "quem passou quem" e sem avisos, só para começar)
select cr_brick_conferir(j, false) from unnest(array['A','B','C','D','E','F','G','H','I','J']) j;

-- Conferir (opcional): select cr_brick_mural();
-- DESFAZER (remove só a parte 2; o Desafio da parte 1 continua):
--   drop trigger if exists cr_brick_partidas_campeao on cr_brick_partidas;
--   drop function if exists cr_brick_gatilho();
--   drop function if exists cr_brick_vincular(uuid,text);
--   drop function if exists cr_brick_frase(uuid,text,int);
--   drop function if exists cr_brick_mural(uuid);
--   drop function if exists cr_brick_conferir(text,boolean);
--   drop function if exists cr_brick_nome(text);
--   drop table if exists cr_brick_avisos; drop table if exists cr_brick_jogadores;
--   drop table if exists cr_brick_feitos; drop table if exists cr_brick_campeoes;
