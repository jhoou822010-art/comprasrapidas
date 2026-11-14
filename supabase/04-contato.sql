-- Formulário de contato do site (contato.html) → mensagens no painel (aba "Mensagens").
-- Rode UMA vez no Supabase: SQL Editor > New query > cole este arquivo > Run. Pode rodar de novo sem problema.
-- Segurança: o visitante só consegue ENVIAR (pela função cr_contact_send). Ler, marcar e apagar: só administradores.

create table if not exists cr_contact_messages(
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 150),
  phone text check (char_length(phone) <= 30),
  subject text not null check (char_length(subject) between 2 and 80),
  message text not null check (char_length(message) between 10 and 3000),
  page text check (char_length(page) <= 300),
  status text not null default 'nova' check (status in ('nova','lida','respondida'))
);
create index if not exists cr_contact_messages_created on cr_contact_messages(created_at desc);
alter table cr_contact_messages enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where tablename='cr_contact_messages' and policyname='cr_admin_all') then
    create policy cr_admin_all on cr_contact_messages for all using (cr_is_admin()) with check (cr_is_admin());
  end if;
end $$;
revoke all on cr_contact_messages from anon;

-- Envio pelo site: valida os campos e limita o volume (proteção contra robôs/spam).
create or replace function cr_contact_send(p_name text, p_email text, p_phone text, p_subject text, p_message text, p_page text default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_id bigint;
begin
  p_name := btrim(coalesce(p_name,'')); p_email := lower(btrim(coalesce(p_email,'')));
  p_phone := nullif(btrim(coalesce(p_phone,'')),''); p_subject := btrim(coalesce(p_subject,''));
  p_message := btrim(coalesce(p_message,''));
  if char_length(p_name) < 2 or char_length(p_name) > 100 then raise exception 'Nome inválido'; end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(p_email) > 150 then raise exception 'E-mail inválido'; end if;
  if char_length(p_subject) < 2 or char_length(p_subject) > 80 then raise exception 'Assunto inválido'; end if;
  if char_length(p_message) < 10 or char_length(p_message) > 3000 then raise exception 'Mensagem muito curta ou muito longa'; end if;
  if (select count(*) from cr_contact_messages where email = p_email and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from cr_contact_messages where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Muitas mensagens em pouco tempo. Tente novamente mais tarde.';
  end if;
  insert into cr_contact_messages(name,email,phone,subject,message,page)
  values (p_name, p_email, left(p_phone,30), p_subject, p_message, left(p_page,300)) returning id into v_id;
  return v_id;
end $$;
revoke all on function cr_contact_send(text,text,text,text,text,text) from public;
grant execute on function cr_contact_send(text,text,text,text,text,text) to anon, authenticated;

-- Reverter (se um dia quiser remover):
--   drop function if exists cr_contact_send(text,text,text,text,text,text);
--   drop table if exists cr_contact_messages;
