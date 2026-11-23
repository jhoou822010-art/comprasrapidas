-- CATEGORIAS EXTERNAS DO MERCADO LIVRE (painel › Catálogo › Categorias Mercado Livre)
-- Duas tabelas NOVAS e independentes. Nenhuma tabela existente (cr_categories, cr_products…) é alterada.
-- Cada categoria é só um cartão com link para a vitrine do Mercado Livre: não há produtos cadastrados aqui.
-- Pode ser executado mais de uma vez sem erro.

-- 1. categorias do Mercado Livre
create table if not exists public.categorias_mercado_livre (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 1 and 80),
  descricao_curta text check (descricao_curta is null or length(descricao_curta) <= 200),
  link text not null check (link ~* '^https?://\S+$' and length(link) <= 2000),
  imagem_url text check (imagem_url is null or imagem_url = '' or imagem_url ~* '^https?://\S+$'),
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categorias_mercado_livre_ordem_idx on public.categorias_mercado_livre (ordem, created_at);

-- 2. configuração da vitrine (uma linha só, id = 1): como as categorias Shopee e Mercado Livre se misturam na grade
create table if not exists public.configuracoes_vitrine (
  id integer primary key default 1 check (id = 1),
  modo_exibicao text not null default 'intercalado' check (modo_exibicao in ('intercalado', 'shopee_primeiro', 'ml_primeiro')),
  updated_at timestamptz not null default now()
);
insert into public.configuracoes_vitrine (id, modo_exibicao) values (1, 'intercalado') on conflict (id) do nothing;

-- updated_at automático
create or replace function public.ml_set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists ml_updated_at on public.categorias_mercado_livre;
create trigger ml_updated_at before update on public.categorias_mercado_livre for each row execute function public.ml_set_updated_at();
drop trigger if exists cv_updated_at on public.configuracoes_vitrine;
create trigger cv_updated_at before update on public.configuracoes_vitrine for each row execute function public.ml_set_updated_at();

-- 3. segurança (RLS): o público lê só as categorias ATIVAS; gravar/editar/excluir só o administrador
--    (mesma autenticação do painel: tabela cr_admins + função cr_is_admin()).
alter table public.categorias_mercado_livre enable row level security;
alter table public.configuracoes_vitrine enable row level security;

drop policy if exists ml_pub_leitura on public.categorias_mercado_livre;
create policy ml_pub_leitura on public.categorias_mercado_livre for select to anon, authenticated using (ativo);
drop policy if exists ml_admin_tudo on public.categorias_mercado_livre;
create policy ml_admin_tudo on public.categorias_mercado_livre for all to authenticated using (public.cr_is_admin()) with check (public.cr_is_admin());

drop policy if exists cv_pub_leitura on public.configuracoes_vitrine;
create policy cv_pub_leitura on public.configuracoes_vitrine for select to anon, authenticated using (true);
drop policy if exists cv_admin_tudo on public.configuracoes_vitrine;
create policy cv_admin_tudo on public.configuracoes_vitrine for all to authenticated using (public.cr_is_admin()) with check (public.cr_is_admin());

grant select on public.categorias_mercado_livre, public.configuracoes_vitrine to anon, authenticated;
grant insert, update, delete on public.categorias_mercado_livre, public.configuracoes_vitrine to authenticated;

-- Fotos enviadas pelo painel usam o bucket já existente "compras-rapidas" (leitura pública, gravação só do admin).
-- O caminho principal é colar o endereço (URL) da imagem, que não ocupa armazenamento.
