-- COMPRAS RÁPIDAS — Jogos da vitrine (Raspadinha e Roleta): contagem de jogadas e de cliques no resultado.
-- Rode UMA vez no Supabase: SQL Editor > New query > cole este arquivo inteiro > Run. Pode rodar de novo sem problema.
-- Cria SOMENTE a tabela nova cr_jogos_eventos. Nada existente é alterado ou apagado (projeto compartilhado com outro site).
--
-- A CONFIGURAÇÃO dos jogos não precisa de tabela nova: fica na chave "jogos" de cr_site_settings.data, como as demais
-- configurações da loja (Temas, Banners, Vitrine). Essa tabela já tem a segurança pedida: qualquer visitante LÊ
-- (política cr_pub) e só quem está em cr_admins ALTERA (política cr_admin_all).
--
-- Segurança dos eventos: o visitante só consegue INSERIR ("jogou" ou "clicou"), sem ler os eventos de ninguém.
-- Ler e apagar: só administradores (cr_admins). Nenhum dado pessoal é guardado (sem IP, sem navegador, sem usuário).
do $$ begin
 if to_regprocedure('public.cr_is_admin()') is null then
  raise exception 'Projeto errado: este projeto não tem as tabelas da Compras Rápidas. Abra o projeto usado no config.js.'; end if; end $$;

create table if not exists cr_jogos_eventos(
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 jogo text not null check (jogo in ('raspadinha','roleta')),      -- origem: jogo-raspadinha ou jogo-roleta
 tipo text not null check (tipo in ('jogou','clicou')),           -- jogou = raspou/girou; clicou = tocou no botão do resultado
 resultado text check (char_length(resultado) <= 60),             -- texto do resultado que caiu (ex.: "Achadinhos baratos")
 destino text check (destino in ('todas','achadinhos','categoria','produto','link'))
);
create index if not exists cr_jogos_eventos_created on cr_jogos_eventos(created_at);

alter table cr_jogos_eventos enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='cr_jogos_eventos' and policyname='cr_admin_all') then
  create policy cr_admin_all on cr_jogos_eventos for all using (cr_is_admin()) with check (cr_is_admin());
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='cr_jogos_eventos' and policyname='cr_visitor_jogo') then
  create policy cr_visitor_jogo on cr_jogos_eventos for insert with check (true);
 end if;
end $$;

-- Permissões: o visitante só pode inserir estas 4 colunas (a data e o número são sempre preenchidos pelo banco).
revoke all on cr_jogos_eventos from anon, authenticated;
grant insert (jogo, tipo, resultado, destino) on cr_jogos_eventos to anon, authenticated;
grant select, delete on cr_jogos_eventos to authenticated;   -- na prática só administradores, por causa da política acima

-- Conferir (opcional): deve mostrar a tabela com 0 linhas.
--   select count(*) from cr_jogos_eventos;
-- Reverter (se um dia quiser remover os jogos do banco):
--   drop table if exists cr_jogos_eventos;
--   update cr_site_settings set data = data - 'jogos' where id = 1;
