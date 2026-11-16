-- AliExpress (aba AliExpress do painel): guarda de onde o produto veio e o id dele na loja,
-- para atualizar preços e não importar o mesmo produto duas vezes. Produtos antigos ficam com null.
alter table cr_products add column if not exists ext_source text, add column if not exists ext_id text;
create unique index if not exists cr_products_ext_uniq on cr_products(ext_source, ext_id) where ext_id is not null;
-- Desfazer: drop index if exists cr_products_ext_uniq; alter table cr_products drop column if exists ext_id, drop column if exists ext_source;
