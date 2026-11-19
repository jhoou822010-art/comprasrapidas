-- COMPRAS RÁPIDAS — REMOVER o robô de conferência da Shopee (tudo o que sql/shopee_sync.sql criou).
-- Rode no Supabase: SQL Editor > New query > cole este arquivo inteiro > Run. Pode rodar de novo sem problema.
--
-- A vitrine NÃO depende de nada daqui: o site e o painel continuam funcionando depois de rodar este arquivo.
-- Os produtos NÃO são apagados. Preços, fotos e links que o robô atualizou continuam como estão.
-- Ordem segura: primeiro para o agendador, depois tira o gatilho do cadastro de produtos, e só então as funções,
-- as tabelas e as colunas.
--
-- ANTES (opcional): veja quais produtos o robô tinha tirado da vitrine:
--   select name from cr_products where shopee_status = 'desativado_robo' order by name;
-- Eles continuam INATIVOS depois da remoção. Para recolocá-los na vitrine, tire o "--" da linha marcada como OPCIONAL 1, abaixo.

do $$ begin
 if to_regclass('public.cr_products') is null then
  raise exception 'Projeto errado: abra o projeto "Loja" da Compras Rápidas.'; end if; end $$;

-- 1) para o agendador
do $$ begin
 if to_regnamespace('cron') is not null then
  if exists (select 1 from cron.job where jobname = 'cr-shopee-sync') then perform cron.unschedule('cr-shopee-sync'); end if;
  if exists (select 1 from cron.job where jobname = 'cr-shopee-limpeza') then perform cron.unschedule('cr-shopee-limpeza'); end if;
 end if; end $$;

-- 2) tira o gatilho do cadastro de produtos (antes das funções, para salvar produto nunca dar erro)
drop trigger if exists cr_products_shopee_codigos on public.cr_products;

-- OPCIONAL 1: recolocar na vitrine os produtos que o ROBÔ desativou (os que você desativou à mão não entram)
-- update public.cr_products set status = 'active' where shopee_status = 'desativado_robo';

-- OPCIONAL 2: voltar o nome original dos produtos que tiveram o nome traduzido
-- update public.cr_products set name = name_original where name_original is not null;

-- 3) funções
drop function if exists public.cr_shopee_dispatch();
drop function if exists public.cr_shopee_limpeza();
drop function if exists public.cr_shopee_config();
drop function if exists public.cr_shopee_codigos_gatilho();
drop function if exists public.cr_shopee_codigos(text);
drop function if exists public.cr_shopee_loja();

-- 4) tabelas novas (rodadas, registro e traduções de categorias)
drop table if exists public.cr_shopee_sync_log;
drop table if exists public.cr_shopee_sync_runs;
drop table if exists public.cr_category_translations;

-- 5) chave interna do agendador e configuração do robô (as outras configurações da loja ficam)
do $$ begin
 if to_regclass('vault.secrets') is not null then delete from vault.secrets where name = 'cr_shopee_cron_token'; end if; end $$;
update public.cr_site_settings set data = data - 'shopee_sync' where id = 1 and data ? 'shopee_sync';

-- 6) colunas novas de cr_products (nenhuma página da loja usa estas colunas)
drop index if exists public.cr_products_shopee_check;
alter table public.cr_products
  drop column if exists shopee_item_id,
  drop column if exists shopee_shop_id,
  drop column if exists shopee_last_check,
  drop column if exists shopee_miss_count,
  drop column if exists shopee_status,
  drop column if exists shopee_conferir,
  drop column if exists shopee_commission_rate,
  drop column if exists name_original;
-- (se rodou o OPCIONAL 2, ele já usou name_original antes de a coluna sair)

-- Depois: no Supabase, Edge Functions › shopee-sync › Delete (opcional; sem o agendador ela não roda sozinha).
-- No painel, a aba "Conferência Shopee" passa a avisar que o robô não está instalado; o catálogo continua, com as categorias
-- traduzidas pelo dicionário do site (sem as traduções que você tinha digitado).
