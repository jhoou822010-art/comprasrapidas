-- Preço em faixa (ex.: produtos da Shopee com variações: R$ 14,50 – R$ 25,90)
-- Rode UMA vez no Supabase (SQL Editor > New query > cole e clique em Run).
-- Só ACRESCENTA uma coluna opcional; não apaga nem altera nenhum produto.
alter table cr_products add column if not exists price_max numeric(12,2) check (price_max >= 0);
