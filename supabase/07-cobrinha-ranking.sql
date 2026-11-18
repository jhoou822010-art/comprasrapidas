-- COMPRAS RÁPIDAS — Ranking geral do Jogo da Cobrinha, com a pontuação conferida pelo servidor.
-- Rode UMA vez no Supabase: SQL Editor > New query > cole este arquivo inteiro > Run. Pode rodar de novo sem problema.
-- Cria SOMENTE objetos novos com prefixo cr_ (a tabela cr_jogos_ranking e as funções cr_cobrinha_*).
-- Nada existente é alterado ou apagado (projeto compartilhado com outro site).
--
-- Como funciona (proteção contra pontuação falsa):
--  1. Ao abrir o jogo, o navegador pede uma partida (cr_cobrinha_iniciar). O SERVIDOR sorteia a "semente" que decide
--     onde cada fruta vai nascer e guarda a hora de início.
--  2. No fim, o navegador envia só a lista de viradas (em qual passo virou e para onde). Ele NÃO envia os pontos.
--  3. O servidor (cr_cobrinha_enviar) refaz a partida inteira com a mesma semente e as mesmas regras de js/cobrinha.js,
--     calcula os pontos ele mesmo e confere se deu tempo de jogar aquilo (a cobrinha tem velocidade máxima).
--  4. Cada partida só pode ser enviada uma vez.
-- Limite conhecido: isso impede inventar pontos, mas não impede um programa que jogue de verdade, em tempo real.
--
-- Privacidade: guarda só o apelido escolhido, a pontuação e um código aleatório do aparelho (sem nome, e-mail, IP ou login).
-- O código do aparelho nunca é mostrado no ranking. Ler e apagar a tabela: só administradores (cr_admins).
do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null then
  raise exception 'Projeto errado: este projeto não tem as tabelas da Compras Rápidas. Abra o projeto usado no config.js.'; end if; end $$;

create table if not exists cr_jogos_ranking(
 id uuid primary key default gen_random_uuid(),
 jogo text not null default 'cobrinha' check (jogo in ('cobrinha')),
 aparelho uuid not null,                                     -- código aleatório gerado no aparelho do jogador
 semente bigint not null check (semente between 1 and 2147483646),
 iniciada_em timestamptz not null default now(),
 finalizada_em timestamptz,                                  -- vazio = partida pedida e ainda não enviada
 pontos int check (pontos >= 0),
 passos int check (passos >= 0),
 apelido text check (apelido is null or char_length(apelido) between 2 and 12)
);
create index if not exists cr_jogos_ranking_melhor on cr_jogos_ranking(jogo, aparelho, pontos desc, finalizada_em) where finalizada_em is not null;
create index if not exists cr_jogos_ranking_aparelho on cr_jogos_ranking(aparelho, iniciada_em desc);
create index if not exists cr_jogos_ranking_abertas on cr_jogos_ranking(iniciada_em) where finalizada_em is null;

alter table cr_jogos_ranking enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='cr_jogos_ranking' and policyname='cr_admin_all') then
  create policy cr_admin_all on cr_jogos_ranking for all using (cr_is_admin()) with check (cr_is_admin());
 end if;
end $$;
-- O visitante não lê nem grava a tabela diretamente: só pelas funções abaixo.
revoke all on cr_jogos_ranking from anon, authenticated;
grant select, delete on cr_jogos_ranking to authenticated;   -- na prática só administradores, por causa da política acima

-- Apelido: 2 a 12 letras, números, espaço, ponto, hífen ou sublinhado; bloqueia palavrões comuns.
-- Retorna o apelido arrumado, ou null se não for permitido. Uso interno.
create or replace function cr_cobrinha_apelido(p text) returns text language plpgsql immutable set search_path=public as $$
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
revoke all on function cr_cobrinha_apelido(text) from public, anon, authenticated;

-- Ranking: a melhor pontuação de cada aparelho que já escolheu um apelido (vale o apelido mais recente).
-- Nunca devolve o código dos aparelhos; "voce" marca a linha do próprio jogador.
create or replace function cr_cobrinha_ranking(p_aparelho uuid default null, p_limite int default 10) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
 p_limite := greatest(1, least(coalesce(p_limite,10), 50));
 with b as (select distinct on (aparelho) aparelho, pontos, finalizada_em from cr_jogos_ranking
            where jogo='cobrinha' and finalizada_em is not null and pontos > 0
            order by aparelho, pontos desc, finalizada_em asc),
      a as (select distinct on (aparelho) aparelho, apelido from cr_jogos_ranking
            where jogo='cobrinha' and finalizada_em is not null and apelido is not null
            order by aparelho, finalizada_em desc),
      rk as (select b.aparelho, a.apelido, b.pontos, rank() over (order by b.pontos desc) pos,
                    row_number() over (order by b.pontos desc, b.finalizada_em asc) rn
             from b join a using (aparelho))
 select jsonb_build_object(
  'top', coalesce((select jsonb_agg(jsonb_build_object('pos',pos,'apelido',apelido,'pontos',pontos,'voce',aparelho=p_aparelho) order by rn) from rk where rn <= p_limite), '[]'::jsonb),
  'voce', (select jsonb_build_object('pos',pos,'apelido',apelido,'pontos',pontos) from rk where aparelho=p_aparelho),
  'total', (select count(*) from rk)) into res;
 return res;
end $$;

-- Início de partida: o servidor sorteia a semente. Só funciona com o jogo ligado no painel.
create or replace function cr_cobrinha_iniciar(p_aparelho uuid) returns jsonb
language plpgsql volatile security definer set search_path=public as $$
declare v_id uuid; v_sem bigint;
begin
 if p_aparelho is null then raise exception 'Aparelho inválido'; end if;
 if coalesce((select (data->'jogos'->>'cobrinha')::boolean from cr_site_settings where id=1), false) is not true then
  raise exception 'O Jogo da Cobrinha está desligado'; end if;
 if (select count(*) from cr_jogos_ranking where aparelho=p_aparelho and iniciada_em > now()-interval '1 hour') >= 300
    or (select count(*) from cr_jogos_ranking where iniciada_em > now()-interval '1 minute') >= 600 then
  raise exception 'Muitas partidas em pouco tempo. Tente de novo mais tarde.'; end if;
 -- limpeza: partidas pedidas e nunca enviadas, com mais de 1 dia (não contam em nada)
 delete from cr_jogos_ranking where finalizada_em is null and iniciada_em < now()-interval '1 day';
 v_sem := 1 + floor(random()*2147483646)::bigint;
 insert into cr_jogos_ranking(aparelho, semente) values (p_aparelho, v_sem) returning id into v_id;
 return jsonb_build_object('id', v_id, 'semente', v_sem);
end $$;

-- Fim de partida: refaz a partida com as regras de js/cobrinha.js e grava os pontos calculados AQUI.
-- p_movs = [passo, direção, passo, direção, ...]; direção: 0 cima, 1 baixo, 2 esquerda, 3 direita.
create or replace function cr_cobrinha_enviar(p_id uuid, p_aparelho uuid, p_apelido text, p_movs int[]) returns jsonb
language plpgsql volatile security definer set search_path=public as $$
declare
 r cr_jogos_ranking; n constant int := 20; m constant bigint := 2147483647;
 x bigint; occ boolean[]; cel int[]; t int := 1; dx int := 1; dy int := 0; nx int; ny int; hd int; hx int; hy int; j int;
 comida int; v_pts int := 0; passo int := 0; k int := 1; nm int; livres int; alvo int; i int;
 min_ms bigint := 0; ap text; fim boolean := false;
begin
 if p_id is null or p_aparelho is null then raise exception 'Partida inválida'; end if;
 select * into r from cr_jogos_ranking where id=p_id for update;
 if not found or r.aparelho <> p_aparelho then raise exception 'Partida não encontrada'; end if;
 if r.finalizada_em is not null then raise exception 'Esta partida já foi enviada'; end if;
 if r.iniciada_em < now()-interval '6 hours' then raise exception 'Partida expirada'; end if;
 if nullif(btrim(coalesce(p_apelido,'')),'') is not null then
  ap := cr_cobrinha_apelido(p_apelido);
  if ap is null then raise exception 'Apelido não permitido. Use de 2 a 12 letras ou números.'; end if;
 end if;
 p_movs := coalesce(p_movs, '{}'); nm := coalesce(array_length(p_movs,1), 0);
 if nm % 2 <> 0 or nm > 20000 then raise exception 'Jogadas inválidas'; end if;

 -- estado inicial (igual a novo() em js/cobrinha.js): 3 gomos no meio, indo para a direita
 occ := array_fill(false, array[n*n]);             -- casa c (0..399) fica em occ[c+1]
 cel := array[10*n+7, 10*n+8, 10*n+9];             -- do rabo (cel[t]) até a cabeça (último)
 occ[10*n+8] := true; occ[10*n+9] := true; occ[10*n+10] := true;
 x := r.semente;
 -- primeira fruta
 livres := n*n - 3; x := (x*48271) % m; alvo := ((x*livres)/m)::int; comida := -1;
 for i in 0..n*n-1 loop if not occ[i+1] then if alvo = 0 then comida := i; exit; end if; alvo := alvo-1; end if; end loop;

 while not fim loop
  if passo >= 40000 then raise exception 'Partida inválida'; end if;
  min_ms := min_ms + greatest(70, 160 - (v_pts/10)*4);           -- mesmo intervalo de intervalo() no jogo
  if k <= nm and p_movs[k] < passo then raise exception 'Jogadas inválidas'; end if;
  if k <= nm and p_movs[k] = passo then
   case p_movs[k+1] when 0 then nx:=0; ny:=-1; when 1 then nx:=0; ny:=1; when 2 then nx:=-1; ny:=0; when 3 then nx:=1; ny:=0;
    else raise exception 'Jogadas inválidas'; end case;
   if (nx=dx and ny=dy) or (nx=-dx and ny=-dy) then raise exception 'Jogadas inválidas'; end if;   -- só vira de lado
   dx := nx; dy := ny; k := k+2;
  end if;
  hd := cel[array_upper(cel,1)]; hx := hd % n + dx; hy := hd / n + dy; passo := passo+1;
  if hx < 0 or hy < 0 or hx >= n or hy >= n then fim := true;                -- bateu na parede
  else
   j := hy*n + hx;
   if j = comida then                                                         -- comeu: cresce e pontua
    occ[j+1] := true; cel := cel || j; v_pts := v_pts + 10;
    livres := n*n - (array_upper(cel,1) - t + 1);
    if livres = 0 then fim := true;                                           -- tabuleiro cheio
    else
     x := (x*48271) % m; alvo := ((x*livres)/m)::int; comida := -1;
     for i in 0..n*n-1 loop if not occ[i+1] then if alvo = 0 then comida := i; exit; end if; alvo := alvo-1; end if; end loop;
    end if;
   else
    occ[cel[t]+1] := false; t := t+1;                                         -- a ponta do rabo sai no mesmo passo
    if occ[j+1] then fim := true;                                             -- bateu no próprio corpo
    else occ[j+1] := true; cel := cel || j; end if;
   end if;
  end if;
 end loop;
 if k <= nm then raise exception 'Jogadas inválidas'; end if;                -- viradas depois do fim da partida
 if extract(epoch from (now() - r.iniciada_em))*1000 < min_ms*0.9 then
  raise exception 'Partida rápida demais para ser verdadeira'; end if;

 update cr_jogos_ranking set finalizada_em=now(), pontos=v_pts, passos=passo, apelido=ap where id=p_id;
 return jsonb_build_object('pontos', v_pts, 'ranking', cr_cobrinha_ranking(p_aparelho, 10));
end $$;

revoke all on function cr_cobrinha_ranking(uuid,int) from public;
revoke all on function cr_cobrinha_iniciar(uuid) from public;
revoke all on function cr_cobrinha_enviar(uuid,uuid,text,int[]) from public;
grant execute on function cr_cobrinha_ranking(uuid,int) to anon, authenticated;
grant execute on function cr_cobrinha_iniciar(uuid) to anon, authenticated;
grant execute on function cr_cobrinha_enviar(uuid,uuid,text,int[]) to anon, authenticated;

-- Conferir (opcional): select cr_cobrinha_ranking();
-- Reverter (se um dia quiser remover o ranking):
--   drop function if exists cr_cobrinha_enviar(uuid,uuid,text,int[]);
--   drop function if exists cr_cobrinha_iniciar(uuid);
--   drop function if exists cr_cobrinha_ranking(uuid,int);
--   drop function if exists cr_cobrinha_apelido(text);
--   drop table if exists cr_jogos_ranking;
