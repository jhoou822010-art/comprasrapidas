-- Ofertas personalizadas por notificação (Painel › Notificações › Ofertas automáticas, modo "Personalizado").
-- Reaproveita cr_push_subscriptions, cr_notifications, a função send-push e o agendador (pg_cron) que já existem.
-- Só ACRESCENTA: 3 colunas, 1 tabela, 1 função; ajusta cr_push_click e cr_push_dispatch. Nada é apagado.
-- Desfazer: ver o bloco "DESFAZER" no fim deste arquivo.

-- 1) Resumo de interesses do aparelho (só de quem aceitou notificações; sem nome, e-mail, telefone ou buscas digitadas)
alter table public.cr_push_subscriptions
  add column if not exists interesses jsonb,
  add column if not exists interesses_em timestamptz,
  add column if not exists personalizar boolean not null default true;

-- 2) Entregas personalizadas: quem recebeu qual produto e se tocou. A chave única garante no máximo 1 por cliente por dia.
create table if not exists public.cr_push_entregas (
  id bigserial primary key,
  subscription_id uuid references public.cr_push_subscriptions(id) on delete set null,
  notification_id uuid references public.cr_notifications(id) on delete cascade,
  product_id uuid references public.cr_products(id) on delete set null,
  dia date not null,
  motivo text check (motivo is null or char_length(motivo) <= 80),
  enviada_em timestamptz not null default now(),
  ok boolean,
  erro text check (erro is null or char_length(erro) <= 300),
  tocou_em timestamptz,
  unique (subscription_id, dia)
);
create index if not exists cr_push_entregas_sub_idx on public.cr_push_entregas (subscription_id, enviada_em desc);
create index if not exists cr_push_entregas_notif_idx on public.cr_push_entregas (notification_id);
alter table public.cr_push_entregas enable row level security;
drop policy if exists cr_push_entregas_admin_read on public.cr_push_entregas;
create policy cr_push_entregas_admin_read on public.cr_push_entregas for select using ((select cr_is_admin()));
-- gravação só pela função send-push (chave de serviço) e por cr_push_click (abaixo)

-- 3) O aparelho atualiza o próprio resumo (identificado pelo endpoint, que só ele conhece)
create or replace function public.cr_push_perfil(p_endpoint text, p_interesses jsonb, p_personalizar boolean default true)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then return false; end if;
  if p_interesses is not null and (jsonb_typeof(p_interesses) <> 'object' or octet_length(p_interesses::text) > 3000) then return false; end if;
  update cr_push_subscriptions
     set interesses = case when coalesce(p_personalizar, true) then p_interesses else null end,
         interesses_em = now(),
         personalizar = coalesce(p_personalizar, true)
   where endpoint = p_endpoint;
  return found;
end $$;
revoke all on function public.cr_push_perfil(text, jsonb, boolean) from public;
grant execute on function public.cr_push_perfil(text, jsonb, boolean) to anon, authenticated, service_role;

-- 4) Toque na notificação: continua somando em cr_notifications.clicks e agora marca também a entrega (por cliente)
drop function if exists public.cr_push_click(uuid);
create or replace function public.cr_push_click(p_notification_id uuid, p_entrega bigint default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update cr_notifications set clicks = clicks + 1 where id = p_notification_id and status = 'sent';
  if p_entrega is not null then
    update cr_push_entregas set tocou_em = now() where id = p_entrega and notification_id = p_notification_id and tocou_em is null;
  end if;
end $$;
revoke all on function public.cr_push_click(uuid, bigint) from public;
grant execute on function public.cr_push_click(uuid, bigint) to anon, authenticated, service_role;

-- 5) Agendador: também chama a send-push enquanto a Oferta do dia / Ofertas automáticas estiver ligada
create or replace function public.cr_push_dispatch() returns bigint
language plpgsql security definer set search_path to 'public','vault','net' as $$
declare v_token text; v_req bigint;
begin
  if not exists (select 1 from cr_notifications where status = 'scheduled' and scheduled_at <= now())
     and coalesce((select (data->'push_oferta_dia'->>'on')::boolean from cr_site_settings where id = 1), false) is not true then
    return null;
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cr_push_cron_token';
  if v_token is null then return null; end if;
  select net.http_post(
    url := 'https://pmozxjkdtknqyochwdrf.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token', v_token),
    body := '{"mode":"cron"}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_req;
  return v_req;
end $$;

/* ===================== DESFAZER (rodar no SQL Editor, se precisar voltar) =====================
create or replace function public.cr_push_dispatch() returns bigint
language plpgsql security definer set search_path to 'public','vault','net' as $$
declare v_token text; v_req bigint;
begin
  if not exists (select 1 from cr_notifications where status = 'scheduled' and scheduled_at <= now()) then
    return null;
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'cr_push_cron_token';
  if v_token is null then return null; end if;
  select net.http_post(
    url := 'https://pmozxjkdtknqyochwdrf.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token', v_token),
    body := '{"mode":"cron"}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_req;
  return v_req;
end $$;
drop function if exists public.cr_push_click(uuid, bigint);
create or replace function public.cr_push_click(p_notification_id uuid) returns void
language sql security definer set search_path to 'public' as $$
  update cr_notifications set clicks = clicks + 1 where id = p_notification_id and status = 'sent';
$$;
grant execute on function public.cr_push_click(uuid) to anon, authenticated;
drop function if exists public.cr_push_perfil(text, jsonb, boolean);
drop table if exists public.cr_push_entregas;
alter table public.cr_push_subscriptions drop column if exists interesses, drop column if exists interesses_em, drop column if exists personalizar;
================================================================================================ */
