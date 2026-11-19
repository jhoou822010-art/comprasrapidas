-- COMPRAS RÁPIDAS — Robô de conferência da Shopee + catálogo em português.
-- Rode no Supabase: SQL Editor > New query > cole este arquivo inteiro > Run. Pode rodar de novo sem problema.
--
-- O que este arquivo faz (e só isto):
--  1) cr_products: ACRESCENTA colunas (ADD COLUMN IF NOT EXISTS) e preenche só essas colunas novas
--     (códigos da Shopee tirados dos links). Nenhum nome, preço, link ou status existente é alterado.
--     Exceção pedida: o único produto com nome em inglês recebe o nome em português e guarda o original em name_original.
--  2) Cria tabelas novas: cr_shopee_sync_runs, cr_shopee_sync_log, cr_category_translations (RLS: só administradores).
--  3) Cria uma chave interna no cofre (vault) para o agendador chamar o robô, e funções cr_shopee_*.
--  4) Agenda: a cada 15 min o banco pergunta "está na hora?" (robô ligado + intervalo escolhido); limpeza diária (60 dias).
--  5) Configuração cr_site_settings.data.shopee_sync = {"on": false, "horas": 6} — só se ainda não existir (robô DESLIGADO).
-- Nada é apagado. Desfazer: bloco DESFAZER no fim.

do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null or to_regclass('public.cr_products') is null then
  raise exception 'Projeto errado: abra o projeto "Loja" da Compras Rápidas.'; end if; end $$;

-- 1) Colunas novas em cr_products ---------------------------------------------------------------
alter table public.cr_products add column if not exists shopee_item_id text;
alter table public.cr_products add column if not exists shopee_shop_id text;
alter table public.cr_products add column if not exists shopee_last_check timestamptz;
alter table public.cr_products add column if not exists shopee_miss_count int not null default 0;
alter table public.cr_products add column if not exists shopee_status text;          -- ok | sumiu | desativado_robo | sem_codigo
alter table public.cr_products add column if not exists shopee_conferir boolean not null default false;  -- preço mudou mais de 50%
alter table public.cr_products add column if not exists shopee_commission_rate numeric;
alter table public.cr_products add column if not exists name_original text;           -- nome original quando o nome foi traduzido
create index if not exists cr_products_shopee_check on public.cr_products (shopee_last_check nulls first) where shopee_item_id is not null;

-- códigos da Shopee a partir do link: .../product/LOJA/ITEM (também codificado como %2F) ou nome-i.LOJA.ITEM
create or replace function public.cr_shopee_codigos(u text) returns text[] language sql immutable set search_path = public as $$
  select case
    when u ~* 'product(%2F|/)[0-9]+(%2F|/)[0-9]+' then array[(regexp_match(u, 'product(?:%2F|/)([0-9]+)(?:%2F|/)([0-9]+)', 'i'))[1], (regexp_match(u, 'product(?:%2F|/)([0-9]+)(?:%2F|/)([0-9]+)', 'i'))[2]]
    when u ~ '-i\.[0-9]+\.[0-9]+' then array[(regexp_match(u, '-i\.([0-9]+)\.([0-9]+)'))[1], (regexp_match(u, '-i\.([0-9]+)\.([0-9]+)'))[2]]
    else null end
$$;
revoke all on function public.cr_shopee_codigos(text) from public, anon;
grant execute on function public.cr_shopee_codigos(text) to authenticated, service_role;   -- usada pelo gatilho quando o painel salva um produto

-- loja Shopee (pelo nome cadastrado em cr_merchants)
create or replace function public.cr_shopee_loja() returns uuid language sql stable security definer set search_path = public as $$
  select id from cr_merchants where lower(trim(name)) = 'shopee' order by id limit 1
$$;
revoke all on function public.cr_shopee_loja() from public, anon;
grant execute on function public.cr_shopee_loja() to authenticated, service_role;

-- preenche os códigos de quem ainda não tem (só colunas novas)
update public.cr_products p
   set shopee_shop_id = (public.cr_shopee_codigos(p.affiliate_url))[1],
       shopee_item_id = (public.cr_shopee_codigos(p.affiliate_url))[2],
       shopee_status = coalesce(p.shopee_status, 'ok')
 where p.shopee_item_id is null and p.merchant_id = public.cr_shopee_loja()
   and public.cr_shopee_codigos(p.affiliate_url) is not null;
update public.cr_products p set shopee_status = 'sem_codigo'
 where p.merchant_id = public.cr_shopee_loja() and p.shopee_item_id is null and p.shopee_status is null;

-- produto novo ou link trocado: descobre os códigos sozinho (só mexe nas colunas novas; se não achar, não apaga os que já tinha)
create or replace function public.cr_shopee_codigos_gatilho() returns trigger language plpgsql set search_path = public as $$
declare c text[];
begin
  -- uma PESSOA mudou o status de um produto que o robô tinha desativado: a partir daí vale a decisão dela (o robô não reativa sozinho)
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.shopee_status = 'desativado_robo'
     and coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') <> 'service_role' then
    new.shopee_status := 'ok';
  end if;
  if new.merchant_id is distinct from public.cr_shopee_loja() then return new; end if;
  if tg_op = 'UPDATE' and new.affiliate_url is not distinct from old.affiliate_url and new.merchant_id is not distinct from old.merchant_id then return new; end if;
  c := public.cr_shopee_codigos(new.affiliate_url);
  if c is not null then
    new.shopee_shop_id := c[1]; new.shopee_item_id := c[2];
    if new.shopee_status is null or new.shopee_status = 'sem_codigo' then new.shopee_status := 'ok'; end if;
  elsif new.shopee_item_id is null then new.shopee_status := 'sem_codigo';
  end if;
  return new;
end $$;
drop trigger if exists cr_products_shopee_codigos on public.cr_products;
create trigger cr_products_shopee_codigos before insert or update of affiliate_url, merchant_id, status on public.cr_products
  for each row execute function public.cr_shopee_codigos_gatilho();

-- nome em inglês já cadastrado (traduzido uma vez; o original fica em name_original)
update public.cr_products set name_original = name,
       name = 'Máscara Facial BIODANCE Real Deep 34 g (colágeno, ceramida e alga marinha)'
 where name like '[NEW] BIODANCE real deep mask%' and name_original is null;

-- 2) Registro das rodadas e das mudanças --------------------------------------------------------
create table if not exists public.cr_shopee_sync_runs (
  id bigserial primary key,
  inicio timestamptz not null default now(),
  fim timestamptz,
  origem text not null default 'agendado' check (origem in ('agendado', 'manual')),
  status text not null default 'rodando' check (status in ('rodando', 'ok', 'falhou')),
  verificados int not null default 0,
  atualizados int not null default 0,
  desativados int not null default 0,
  reativados int not null default 0,
  erros int not null default 0,
  erro text check (erro is null or char_length(erro) <= 500)
);
create index if not exists cr_shopee_sync_runs_inicio on public.cr_shopee_sync_runs (inicio desc);

create table if not exists public.cr_shopee_sync_log (
  id bigserial primary key,
  run_id bigint references public.cr_shopee_sync_runs(id) on delete cascade,
  product_id uuid references public.cr_products(id) on delete set null,
  em timestamptz not null default now(),
  tipo text not null check (tipo in ('preco', 'saiu', 'sumiu', 'voltou', 'conferir', 'foto', 'link', 'comissao')),
  preco_antes numeric,
  preco_depois numeric,
  detalhe text check (detalhe is null or char_length(detalhe) <= 300)
);
create index if not exists cr_shopee_sync_log_tipo on public.cr_shopee_sync_log (tipo, em desc);
create index if not exists cr_shopee_sync_log_produto on public.cr_shopee_sync_log (product_id);

-- traduções de categorias digitadas no painel (as comuns já vêm prontas em js/shopee-categorias.js)
create table if not exists public.cr_category_translations (
  original text primary key check (char_length(original) between 1 and 200),
  pt text not null check (char_length(pt) between 1 and 200),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
 foreach t in array array['cr_shopee_sync_runs', 'cr_shopee_sync_log', 'cr_category_translations'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon, authenticated', t);
 end loop;
 -- rodadas e registro: só administradores LEEM (quem grava é a função shopee-sync, com a chave de serviço)
 if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cr_shopee_sync_runs' and policyname = 'cr_admin_read') then
  create policy cr_admin_read on public.cr_shopee_sync_runs for select using ((select cr_is_admin())); end if;
 if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cr_shopee_sync_log' and policyname = 'cr_admin_read') then
  create policy cr_admin_read on public.cr_shopee_sync_log for select using ((select cr_is_admin())); end if;
 -- traduções: administradores leem e gravam
 if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cr_category_translations' and policyname = 'cr_admin_all') then
  create policy cr_admin_all on public.cr_category_translations for all using ((select cr_is_admin())) with check ((select cr_is_admin())); end if;
end $$;
grant select on public.cr_shopee_sync_runs, public.cr_shopee_sync_log to authenticated;
grant select, insert, update, delete on public.cr_category_translations to authenticated;

-- 3) Chave interna do agendador (fica no cofre do Supabase; não é a chave da Shopee) --------------
do $$ begin
 if not exists (select 1 from vault.secrets where name = 'cr_shopee_cron_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cr_shopee_cron_token', 'Chave interna: agendador -> função shopee-sync');
 end if; end $$;

-- usada só pela função shopee-sync (chave de serviço) para conferir quem a chamou
create or replace function public.cr_shopee_config() returns jsonb language sql stable security definer set search_path = public, vault as $$
  select jsonb_build_object('token', (select decrypted_secret from vault.decrypted_secrets where name = 'cr_shopee_cron_token'))
$$;
revoke all on function public.cr_shopee_config() from public, anon, authenticated;
grant execute on function public.cr_shopee_config() to service_role;

-- "Está na hora?": robô ligado, nenhuma rodada em andamento e algum produto não conferido dentro do intervalo
create or replace function public.cr_shopee_dispatch() returns bigint language plpgsql security definer set search_path = public, vault, net as $$
declare cfg jsonb; horas numeric; v_token text; v_req bigint;
begin
  select coalesce(data->'shopee_sync', '{}'::jsonb) into cfg from cr_site_settings where id = 1;
  if coalesce((cfg->>'on')::boolean, false) is not true then return null; end if;
  horas := least(greatest(coalesce((cfg->>'horas')::numeric, 6), 1), 48);
  if exists (select 1 from cr_shopee_sync_runs where status = 'rodando' and inicio > now() - interval '10 minutes') then return null; end if;
  if not exists (select 1 from cr_products where merchant_id = cr_shopee_loja() and shopee_item_id is not null
                  and (shopee_last_check is null or shopee_last_check < now() - make_interval(secs => (horas * 3600)::int))) then return null; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cr_shopee_cron_token';
  if v_token is null then return null; end if;
  select net.http_post(
    url := 'https://pmozxjkdtknqyochwdrf.supabase.co/functions/v1/shopee-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', v_token),
    body := '{"mode":"cron"}'::jsonb,
    timeout_milliseconds := 150000) into v_req;
  return v_req;
end $$;
revoke all on function public.cr_shopee_dispatch() from public, anon, authenticated;

-- limpeza: registros com mais de 60 dias (rodadas antigas levam junto o registro delas)
create or replace function public.cr_shopee_limpeza() returns void language sql security definer set search_path = public as $$
  delete from cr_shopee_sync_log where em < now() - interval '60 days';
  delete from cr_shopee_sync_runs where inicio < now() - interval '60 days';
  -- rodada que travou (a função caiu no meio): fecha como falha para não bloquear as próximas
  update cr_shopee_sync_runs set status = 'falhou', fim = now(), erro = coalesce(erro, 'Rodada interrompida')
   where status = 'rodando' and inicio < now() - interval '1 hour';
$$;
revoke all on function public.cr_shopee_limpeza() from public, anon, authenticated;

-- 4) Agendamentos -------------------------------------------------------------------------------
do $$ begin
 if exists (select 1 from cron.job where jobname = 'cr-shopee-sync') then perform cron.unschedule('cr-shopee-sync'); end if;
 if exists (select 1 from cron.job where jobname = 'cr-shopee-limpeza') then perform cron.unschedule('cr-shopee-limpeza'); end if;
 perform cron.schedule('cr-shopee-sync', '*/15 * * * *', 'select public.cr_shopee_dispatch()');
 perform cron.schedule('cr-shopee-limpeza', '41 7 * * *', 'select public.cr_shopee_limpeza()');
end $$;

-- 5) Configuração (só cria se não existir: robô DESLIGADO, a cada 6 horas) ------------------------
update public.cr_site_settings
   set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('shopee_sync', jsonb_build_object('on', false, 'horas', 6))
 where id = 1 and not (coalesce(data, '{}'::jsonb) ? 'shopee_sync');

-- Conferir (opcional):
--   select shopee_status, count(*) from cr_products where merchant_id = cr_shopee_loja() group by 1;
--   select name, affiliate_url from cr_products where shopee_status = 'sem_codigo';
--
-- DESFAZER (não apaga produtos; tira só o que este arquivo criou):
--   select cron.unschedule('cr-shopee-sync'); select cron.unschedule('cr-shopee-limpeza');
--   drop trigger if exists cr_products_shopee_codigos on public.cr_products;
--   drop function if exists public.cr_shopee_codigos_gatilho(); drop function if exists public.cr_shopee_dispatch();
--   drop function if exists public.cr_shopee_limpeza(); drop function if exists public.cr_shopee_config();
--   drop table if exists public.cr_shopee_sync_log; drop table if exists public.cr_shopee_sync_runs; drop table if exists public.cr_category_translations;
--   update cr_site_settings set data = data - 'shopee_sync' where id = 1;
--   (as colunas novas de cr_products podem ficar; para tirar: alter table cr_products drop column if exists shopee_item_id, ... )
