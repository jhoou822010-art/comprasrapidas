-- COMPRAS RÁPIDAS (projeto Supabase COMPARTILHADO com outro site)
-- Tudo aqui usa o prefixo cr_ e o bucket 'compras-rapidas'. Nada existente é alterado ou excluído.
-- Antes: rode supabase/00-verificar-existente.sql (só leitura). Rode ESTE arquivo inteiro UMA vez.
do $$ begin
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name like 'cr\_%' escape '\') then
  raise exception 'Já existem tabelas cr_ neste projeto. Nada foi feito. Verifique antes de continuar.'; end if; end $$;
create extension if not exists pgcrypto;
create table cr_admins(user_id uuid primary key references auth.users on delete cascade);
create function cr_is_admin() returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from cr_admins where user_id=auth.uid()) $$;
create table cr_categories(id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, image_url text, sort int default 0, active boolean default true);
create table cr_merchants(id uuid primary key default gen_random_uuid(), name text not null unique);
create table cr_products(id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, description text, price numeric(12,2) check(price>=0), old_price numeric(12,2) check(old_price>=0), price_max numeric(12,2) check(price_max>=0),
 category_id uuid references cr_categories(id) on delete restrict, merchant_id uuid references cr_merchants(id), affiliate_url text not null check(affiliate_url ~* '^https?://'),
 featured boolean default false, offer boolean default false, offer_start timestamptz, offer_end timestamptz,
 status text default 'active' check(status in ('active','inactive','archived')), created_at timestamptz default now());
create index on cr_products(status,created_at desc); create index on cr_products(category_id); create index on cr_products(name);
create table cr_product_images(id uuid primary key default gen_random_uuid(), product_id uuid not null references cr_products(id) on delete cascade, url text not null, sort int default 0, is_cover boolean default false);
create table cr_product_videos(id uuid primary key default gen_random_uuid(), product_id uuid not null references cr_products(id) on delete cascade, url text not null, sort int default 0);
create index on cr_product_images(product_id); create index on cr_product_videos(product_id);
create table cr_banners(id uuid primary key default gen_random_uuid(), title text, subtitle text, image_url text, button_text text, button_url text, active boolean default true, sort int default 0);
create table cr_site_settings(id int primary key default 1 check(id=1), data jsonb default '{}');
create table cr_homepage_sections(key text primary key, title text, visible boolean default true, sort int default 0, qty int default 8);
create table cr_click_events(id bigserial primary key, product_id uuid references cr_products(id) on delete set null, category_id uuid references cr_categories(id) on delete set null, merchant_id uuid references cr_merchants(id) on delete set null, created_at timestamptz default now());
create index on cr_click_events(created_at);
create function cr_fill_click() returns trigger language plpgsql security definer set search_path=public as $$ begin select category_id,merchant_id into new.category_id,new.merchant_id from cr_products where id=new.product_id; return new; end $$;
create trigger cr_t_click before insert on cr_click_events for each row execute function cr_fill_click();
insert into cr_site_settings(id,data) values(1,'{}');
insert into cr_homepage_sections values('ofertas','Ofertas selecionadas',true,1,8),('destaques','Destaques',true,2,8),('novidades','Novidades',true,3,8),('categorias','Categorias',true,4,12);
-- SEGURANÇA (RLS)
do $$ declare t text; begin foreach t in array array['cr_admins','cr_categories','cr_merchants','cr_products','cr_product_images','cr_product_videos','cr_banners','cr_site_settings','cr_homepage_sections','cr_click_events'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy cr_admin_all on %I for all using (cr_is_admin()) with check (cr_is_admin())',t); end loop; end $$;
create policy cr_own on cr_admins for select using (user_id=auth.uid());
create policy cr_pub on cr_categories for select using (active);
create policy cr_pub on cr_merchants for select using (true);
create policy cr_pub on cr_products for select using (status='active');
create policy cr_pub on cr_product_images for select using (exists(select 1 from cr_products p where p.id=product_id and p.status='active'));
create policy cr_pub on cr_product_videos for select using (exists(select 1 from cr_products p where p.id=product_id and p.status='active'));
create policy cr_pub on cr_banners for select using (active);
create policy cr_pub on cr_site_settings for select using (true);
create policy cr_pub on cr_homepage_sections for select using (true);
create policy cr_visitor_click on cr_click_events for insert with check (product_id is not null);
-- ARMAZENAMENTO (fotos, vídeos, logotipo)
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('compras-rapidas','compras-rapidas',true,52428800,
 array['image/jpeg','image/png','image/webp','image/gif','image/x-icon','image/vnd.microsoft.icon','video/mp4','video/webm']) on conflict (id) do nothing;
create policy cr_media_read on storage.objects for select using (bucket_id='compras-rapidas');
create policy cr_media_admin on storage.objects for all using (bucket_id='compras-rapidas' and cr_is_admin()) with check (bucket_id='compras-rapidas' and cr_is_admin());
-- PRIMEIRO ADMINISTRADOR: o primeiro login feito em /admin/ vira administrador automaticamente.
-- Depois que existe um administrador, esta função não promove mais ninguém.
create function cr_claim_admin() returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return false; end if;
 if exists(select 1 from cr_admins) then return cr_is_admin(); end if;
 insert into cr_admins(user_id) values(auth.uid());
 return true;
end $$;
revoke all on function cr_claim_admin() from public, anon;
grant execute on function cr_claim_admin() to authenticated;
