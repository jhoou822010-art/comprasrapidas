-- SOMENTE LEITURA: não altera nada. Rode cada bloco e confira o resultado.
-- 1) Tabelas existentes (do outro site). Nenhuma deve começar com cr_
select table_name from information_schema.tables where table_schema='public' order by 1;
-- 2) Funções existentes (nenhuma deve começar com cr_)
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1;
-- 3) Buckets existentes (não deve existir 'compras-rapidas')
select id, name, public from storage.buckets order by 1;
-- 4) Regras de segurança existentes (apenas para você conhecer)
select tablename, policyname from pg_policies where schemaname='public' order by 1,2;
-- 5) Quantidade de usuários cadastrados (serão reaproveitados)
select count(*) as usuarios from auth.users;
