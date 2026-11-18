-- COMPRAS RÁPIDAS — Desafio Brick Game: ranking geral e da semana de cada um dos 10 jogos (só diversão, SEM prêmios).
-- Rode UMA vez no Supabase: SQL Editor > New query > cole este arquivo inteiro > Run. Pode rodar de novo sem problema.
-- Cria SOMENTE objetos novos com prefixo cr_brick_ (a tabela cr_brick_partidas e as funções cr_brick_*).
-- Nada existente é alterado ou apagado.
--
-- Como funciona:
--  1. Ao apertar START, o site pede uma partida (cr_brick_iniciar). O SERVIDOR guarda a hora de início.
--  2. No fim, o site envia os pontos (cr_brick_enviar). O servidor recusa pontos impossíveis para o tempo jogado
--     (cada jogo tem um máximo de pontos por segundo) e cada partida só pode ser enviada uma vez.
--  Limite conhecido: impede inventar pontos absurdos, mas não é uma conferência jogada a jogada como a da Cobrinha.
--  Por isso o painel › Jogos tem o botão "Apagar" para tirar do ranking um resultado suspeito ou um apelido impróprio.
--
-- Tamanho: cada aparelho guarda no máximo a melhor partida geral e a melhor da semana de cada jogo
-- (as outras são apagadas na hora); partidas abertas e nunca enviadas somem depois de 1 dia.
-- Privacidade: só o apelido, os pontos e um código aleatório do aparelho (sem nome, e-mail, IP ou login).
-- O código do aparelho nunca é mostrado. Ler e apagar a tabela: só administradores (cr_admins).
do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null then
  raise exception 'Projeto errado: este projeto não tem as tabelas da Compras Rápidas. Abra o projeto usado no config.js.'; end if; end $$;

create table if not exists cr_brick_partidas(
 id uuid primary key default gen_random_uuid(),
 jogo char(1) not null check (jogo between 'A' and 'J'),
 aparelho uuid not null,                                     -- código aleatório gerado no aparelho do jogador
 iniciada_em timestamptz not null default now(),
 finalizada_em timestamptz,                                  -- vazio = partida pedida e ainda não enviada
 pontos int check (pontos >= 0),
 apelido text check (apelido is null or char_length(apelido) between 2 and 12)
);
create index if not exists cr_brick_partidas_rank on cr_brick_partidas(jogo, pontos desc, finalizada_em) where finalizada_em is not null;
create index if not exists cr_brick_partidas_aparelho on cr_brick_partidas(aparelho, jogo, iniciada_em desc);
create index if not exists cr_brick_partidas_abertas on cr_brick_partidas(iniciada_em) where finalizada_em is null;

alter table cr_brick_partidas enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='cr_brick_partidas' and policyname='cr_admin_all') then
  create policy cr_admin_all on cr_brick_partidas for all using (cr_is_admin()) with check (cr_is_admin());
 end if;
end $$;
-- O visitante não lê nem grava a tabela diretamente: só pelas funções abaixo.
revoke all on cr_brick_partidas from anon, authenticated;
grant select, delete on cr_brick_partidas to authenticated;   -- na prática só administradores, por causa da política acima

-- Apelido: 2 a 12 letras, números, espaço, ponto, hífen ou sublinhado; bloqueia palavrões comuns (mesma regra da Cobrinha).
create or replace function cr_brick_apelido(p text) returns text language plpgsql immutable set search_path=public as $$
declare a text; c text; w text;
begin
 a := regexp_replace(btrim(coalesce(p,'')), '\s+', ' ', 'g');
 if char_length(a) < 2 or char_length(a) > 12 or a !~ '^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ._-]+$' then return null; end if;
 c := translate(lower(a), 'áàâãäéèêëíìîïóòôõöúùûüçñ013457@', 'aaaaaeeeeiiiiooooouuuucnoieasta');
 if regexp_replace(c, '[^a-z]', '', 'g') ~ '(caralh|porra|bucet|merd|arrombad|xoxot|xerec|piroc|cacete|fdp|pqp|cuzao|vagabund|hitler|nazis)' then return null; end if;
 foreach w in array regexp_split_to_array(c, '[ ._-]+') loop
  if w ~ '^(puta|puto|viad|fod|fud|corn|bost|cu$|pau$|rola$|pinto$|penis|vagin|safad|otari|babac|idiot|imbecil|retardad)' then return null; end if;
 end loop;
 return a;
end $$;
revoke all on function cr_brick_apelido(text) from public, anon, authenticated;

-- Jogo ligado? Mesma regra do site (js/jogos.js): sem escolha salva, acompanha os outros jogos.
create or replace function cr_brick_ligado() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select case when j ? 'brickgame' then (j->>'brickgame')::boolean
   else coalesce((j->>'raspadinha')::boolean,false) or coalesce((j->>'roleta')::boolean,false) or coalesce((j->>'cobrinha')::boolean,false) end
  from (select coalesce(data->'jogos','{}'::jsonb) j from cr_site_settings where id=1) s), false)
$$;
revoke all on function cr_brick_ligado() from public, anon, authenticated;

-- Início da semana do desafio: segunda-feira 00:00 no horário de Brasília.
create or replace function cr_brick_semana() returns timestamptz language sql stable set search_path=public as $$
 select date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
$$;
revoke all on function cr_brick_semana() from public, anon, authenticated;

-- Ranking de um jogo: a melhor pontuação de cada aparelho que tem apelido (vale o apelido mais recente do aparelho).
-- p_periodo: 'geral' ou 'semana'. Nunca devolve o código dos aparelhos; "voce" marca a linha do próprio jogador.
create or replace function cr_brick_ranking(p_jogo text, p_aparelho uuid default null, p_periodo text default 'geral', p_limite int default 10) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb; desde timestamptz;
begin
 if p_jogo is null or p_jogo !~ '^[A-J]$' then raise exception 'Jogo inválido'; end if;
 p_limite := greatest(1, least(coalesce(p_limite,10), 50));
 desde := case when p_periodo='semana' then cr_brick_semana() else '-infinity'::timestamptz end;
 with b as (select distinct on (aparelho) aparelho, pontos, finalizada_em from cr_brick_partidas
            where jogo=p_jogo and finalizada_em >= desde and pontos > 0
            order by aparelho, pontos desc, finalizada_em asc),
      a as (select distinct on (aparelho) aparelho, apelido from cr_brick_partidas
            where finalizada_em is not null and apelido is not null
            order by aparelho, finalizada_em desc),
      rk as (select b.aparelho, a.apelido, b.pontos, rank() over (order by b.pontos desc) pos,
                    row_number() over (order by b.pontos desc, b.finalizada_em asc) rn
             from b join a using (aparelho))
 select jsonb_build_object(
  'jogo', p_jogo, 'periodo', case when p_periodo='semana' then 'semana' else 'geral' end,
  'top', coalesce((select jsonb_agg(jsonb_build_object('pos',pos,'apelido',apelido,'pontos',pontos,'voce',aparelho=p_aparelho) order by rn) from rk where rn <= p_limite), '[]'::jsonb),
  'voce', (select jsonb_build_object('pos',pos,'apelido',apelido,'pontos',pontos) from rk where aparelho=p_aparelho),
  'total', (select count(*) from rk)) into res;
 return res;
end $$;

-- Recorde geral de cada jogo (para o placar HI-SCORE do aparelho): {"A":{"pontos":..,"apelido":..},...}
create or replace function cr_brick_recordes() returns jsonb
language sql stable security definer set search_path=public as $$
 with a as (select distinct on (aparelho) aparelho, apelido from cr_brick_partidas
            where finalizada_em is not null and apelido is not null order by aparelho, finalizada_em desc),
      m as (select distinct on (p.jogo) p.jogo, p.pontos, a.apelido from cr_brick_partidas p join a using (aparelho)
            where p.finalizada_em is not null and p.pontos > 0 order by p.jogo, p.pontos desc, p.finalizada_em asc)
 select coalesce(jsonb_object_agg(jogo, jsonb_build_object('pontos',pontos,'apelido',apelido)), '{}'::jsonb) from m
$$;

-- Início de partida. Só funciona com o Brick Game ligado no painel.
create or replace function cr_brick_iniciar(p_aparelho uuid, p_jogo text) returns jsonb
language plpgsql volatile security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_aparelho is null then raise exception 'Aparelho inválido'; end if;
 if p_jogo is null or p_jogo !~ '^[A-J]$' then raise exception 'Jogo inválido'; end if;
 if not cr_brick_ligado() then raise exception 'O Brick Game está desligado'; end if;
 if (select count(*) from cr_brick_partidas where aparelho=p_aparelho and iniciada_em > now()-interval '1 hour') >= 300
    or (select count(*) from cr_brick_partidas where iniciada_em > now()-interval '1 minute') >= 600 then
  raise exception 'Muitas partidas em pouco tempo. Tente de novo mais tarde.'; end if;
 -- limpeza: partidas pedidas e nunca enviadas, com mais de 1 dia (não contam em nada)
 delete from cr_brick_partidas where finalizada_em is null and iniciada_em < now()-interval '1 day';
 insert into cr_brick_partidas(jogo, aparelho) values (p_jogo, p_aparelho) returning id into v_id;
 return jsonb_build_object('id', v_id);
end $$;

-- Fim de partida: confere se os pontos cabem no tempo jogado e grava. Depois apaga as partidas antigas
-- deste aparelho neste jogo que não são nem a melhor geral nem a melhor da semana.
create or replace function cr_brick_enviar(p_id uuid, p_aparelho uuid, p_pontos int, p_apelido text) returns jsonb
language plpgsql volatile security definer set search_path=public as $$
declare r cr_brick_partidas; ap text; seg numeric; teto numeric; sem timestamptz := cr_brick_semana(); v_g uuid; v_s uuid;
begin
 if p_id is null or p_aparelho is null then raise exception 'Partida inválida'; end if;
 select * into r from cr_brick_partidas where id=p_id for update;
 if not found or r.aparelho <> p_aparelho then raise exception 'Partida não encontrada'; end if;
 if r.finalizada_em is not null then raise exception 'Esta partida já foi enviada'; end if;
 if r.iniciada_em < now()-interval '6 hours' then raise exception 'Partida expirada'; end if;
 if p_pontos is null or p_pontos < 0 or p_pontos > 99999999 then raise exception 'Pontos inválidos'; end if;
 if nullif(btrim(coalesce(p_apelido,'')),'') is not null then
  ap := cr_brick_apelido(p_apelido);
  if ap is null then raise exception 'Apelido não permitido. Use de 2 a 12 letras ou números.'; end if;
 end if;
 -- máximo de pontos por segundo de cada jogo (com folga), pelas regras de js/brickgame.js
 seg := extract(epoch from (now() - r.iniciada_em));
 teto := 300 + seg * case r.jogo when 'A' then 80 when 'B' then 1500 when 'C' then 300 when 'D' then 150 when 'E' then 200
                                  when 'F' then 400 when 'G' then 1000 when 'H' then 300 when 'I' then 30 else 40 end;
 if p_pontos > teto then raise exception 'Pontuação impossível para o tempo jogado'; end if;

 update cr_brick_partidas set finalizada_em=now(), pontos=p_pontos, apelido=ap where id=p_id;
 -- apelido novo vale para todas as partidas deste aparelho (troca de apelido aparece no ranking inteiro)
 if ap is not null then update cr_brick_partidas set apelido=ap where aparelho=p_aparelho and finalizada_em is not null and apelido is distinct from ap; end if;
 -- arrumação: fica só a melhor geral e a melhor da semana deste aparelho neste jogo (e as partidas em andamento)
 select id into v_g from cr_brick_partidas where aparelho=p_aparelho and jogo=r.jogo and finalizada_em is not null order by pontos desc, finalizada_em asc limit 1;
 select id into v_s from cr_brick_partidas where aparelho=p_aparelho and jogo=r.jogo and finalizada_em >= sem order by pontos desc, finalizada_em asc limit 1;
 delete from cr_brick_partidas where aparelho=p_aparelho and jogo=r.jogo and finalizada_em is not null and id <> v_g and id is distinct from v_s;
 return jsonb_build_object('pontos', p_pontos, 'geral', cr_brick_ranking(r.jogo, p_aparelho, 'geral', 10),
  'semana', cr_brick_ranking(r.jogo, p_aparelho, 'semana', 10), 'recordes', cr_brick_recordes());
end $$;

revoke all on function cr_brick_ranking(text,uuid,text,int) from public;
revoke all on function cr_brick_recordes() from public;
revoke all on function cr_brick_iniciar(uuid,text) from public;
revoke all on function cr_brick_enviar(uuid,uuid,int,text) from public;
grant execute on function cr_brick_ranking(text,uuid,text,int) to anon, authenticated;
grant execute on function cr_brick_recordes() to anon, authenticated;
grant execute on function cr_brick_iniciar(uuid,text) to anon, authenticated;
grant execute on function cr_brick_enviar(uuid,uuid,int,text) to anon, authenticated;

-- Conferir (opcional): select cr_brick_recordes();  select cr_brick_ranking('A');
-- DESFAZER (se um dia quiser remover o desafio; não mexe em mais nada):
--   drop function if exists cr_brick_enviar(uuid,uuid,int,text);
--   drop function if exists cr_brick_iniciar(uuid,text);
--   drop function if exists cr_brick_recordes();
--   drop function if exists cr_brick_ranking(text,uuid,text,int);
--   drop function if exists cr_brick_semana();
--   drop function if exists cr_brick_ligado();
--   drop function if exists cr_brick_apelido(text);
--   drop table if exists cr_brick_partidas;
