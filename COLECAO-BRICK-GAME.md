# Continuar o projeto — texto para colar numa nova conversa

Copie tudo o que está dentro do bloco abaixo e cole no começo da próxima conversa, trocando a última linha pelo pedido novo.
Atualize este arquivo sempre que uma etapa importante for concluída.

```
CONTEXTO DO PROJETO — Compras Rápidas Andrade (continuação)

Site: https://comprasrapidasandrade.com.br (painel em /admin)
Repositório: jhoou822010-art/comprasrapidas (o site publica a partir da branch main, GitHub Pages)
Supabase: projeto "Loja" (id pmozxjkdtknqyochwdrf). O projeto "lojaCRA" NÃO é usado pela loja.
O site é uma vitrine de links de afiliado (Shopee, Mercado Livre, AliExpress): não vende nem tem checkout.

COMO EU QUERO QUE VOCÊ TRABALHE
- Antes de mexer: analise o que já existe e me mostre um plano curto (arquivos, se mexe no banco, como desfazer).
- Reaproveite o que existe; não duplique módulos, tabelas ou funções.
- Não remova nem renomeie abas/funções; não altere produtos, categorias, banners ou configurações sem eu pedir.
- Excluir/remover qualquer coisa sempre pede confirmação.
- Se der para resolver só na interface, não mexa no banco. Mudança no banco só com minha autorização
  (o Supabase pede confirmação na minha tela; se não chegar, me passe o SQL para o SQL Editor).
- Não publique (merge na main nem deploy de função) sem eu autorizar.
- Teste no celular e no computador com dados simulados, sem enviar, gravar ou apagar nada real.
- Fale comigo em português simples; no fim, diga o que mudou e como desfazer.

ESTRUTURA PRINCIPAL
- admin/index.html: painel inteiro (menu lateral agrupado: Visão geral, Catálogo, Vitrine, Comunicação, Operações).
- js/app.js (base do site), js/db.js (cliente leve), js/vitrine.js (Sistema Inteligente da Vitrine),
  js/banners.js (banners ligados ao produto), js/jogos.js (Raspadinha/Roleta), sw.js (cache sem internet).
- Configurações ficam em cr_site_settings.data (sempre reler antes de salvar, para não apagar outras chaves).
- Documentação: PAINEL-ADMIN.md e VITRINE-INTELIGENTE.md.

O QUE JÁ EXISTE E FUNCIONA
- Painel redesenhado; Banners com 3 modos (escolher produto, automático, personalizados).
- Notificações: manuais, automáticas, "Oferta do dia" e modo personalizado por interesse
  (função send-push no Supabase; tabela cr_push_entregas; no máximo 1 por cliente por dia;
  limpeza diária de entregas com mais de 90 dias).
- Shopee: aba Operações › Teste Shopee lê o catálogo da API de afiliados (função shopee-affiliate-preview-v1,
  só leitura), com filtros, busca no catálogo inteiro, filtros salvos e importação com aprovação
  (até 50 por vez, sempre inativos, oferta a partir de 10% de desconto, botão desfazer).

ÁREA DE JOGOS (só diversão, sem prêmios)
- jogos.html lista os jogos; ligados em painel › Jogos (cr_site_settings.data.jogos).
- Raspadinha e Roleta: dentro de jogos.html (js/jogos.js).
- Cobrinha: cobrinha.html + js/cobrinha.js (ranking conferido pelo servidor, supabase/07-cobrinha-ranking.sql).
- Brick Game 2 em 1 (A Corrida, B Blocos): brickgame.html + js/brickgame.js, canvas puro, estilo LCD anos 90.
  Aparece junto com a área de jogos (sem botão próprio no painel).
- Padrão para um jogo novo: página própria (copiar o esqueleto de cobrinha.html), um arquivo js/<jogo>.js
  com MOTOR (regras puras, testáveis) + TELA, um card em jogos.html, e incluir página e js na lista JOGOS
  do sw.js (subindo a versão de OFFLINE_CACHE). Não usar nomes ou visuais de jogos com marca registrada.

PEDIDO DE AGORA:
[escreva aqui o que você quer fazer]
```
