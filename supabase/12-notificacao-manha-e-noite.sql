-- OFERTAS PERSONALIZADAS: 1 DE MANHÃ E 1 À NOITE POR CLIENTE
-- Antes: cada cliente recebia no máximo 1 notificação personalizada por dia (chave única cliente + dia).
-- Agora: a chave passa a ser cliente + dia + turno (0 = manhã, antes das 14h; 1 = noite, das 14h em diante).
-- Nenhum dado é apagado. Pode ser executado mais de uma vez sem erro.

-- 1. coluna do turno
alter table public.cr_push_entregas add column if not exists turno smallint not null default 0;
alter table public.cr_push_entregas drop constraint if exists cr_push_entregas_turno_check;
alter table public.cr_push_entregas add constraint cr_push_entregas_turno_check check (turno in (0, 1));

-- 2. entregas antigas: turno pelo horário de Brasília em que foram enviadas
update public.cr_push_entregas
   set turno = case when extract(hour from enviada_em at time zone 'America/Sao_Paulo') < 14 then 0 else 1 end
 where turno = 0 and extract(hour from enviada_em at time zone 'America/Sao_Paulo') >= 14;

-- 3. troca a chave única: (cliente, dia) → (cliente, dia, turno)
alter table public.cr_push_entregas drop constraint if exists cr_push_entregas_subscription_id_dia_key;
create unique index if not exists cr_push_entregas_sub_dia_turno_key on public.cr_push_entregas (subscription_id, dia, turno);

-- 4. confira: deve aparecer a chave nova e não a antiga
select indexname from pg_indexes where tablename = 'cr_push_entregas' and indexdef ilike '%unique%';
