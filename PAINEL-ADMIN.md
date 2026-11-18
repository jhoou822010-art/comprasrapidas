# Painel administrativo — melhorias (novembro de 2026)

Ponto de restauração: tag Git `backup-antes-painel-2026-11-14` (local) e a branch `main` intacta até o merge.

## O que mudou

- **Menu lateral agrupado** (Visão geral, Catálogo, Vitrine, Comunicação, Operações; Sair no final).
  Computador: recolhível (aberto = ícone e nome; recolhido = só ícones; a escolha fica salva no aparelho).
  Celular: abre deslizando pelo botão ☰ (fecha no ✕, tocando fora ou com Esc).
- **Visual:** menu na cor principal (azul-marinho), fundo cinza claro, cartões brancos com borda suave.
  Azul só nos botões principais; vermelho só em excluir. Se “Usar minhas cores personalizadas” estiver ligado em Aparência, o painel usa essas cores.
- **Listas compactas:** cada linha mostra só “Editar”; Arquivar, Excluir, Cancelar envio etc. ficam no menu “⋯”.
  Categorias, Início e Banners personalizados viraram listas (o formulário abre ao tocar em Editar).
- **Botões com 44 px** de altura no celular.
- **Painel inicial:** cartões com Produtos, Ativos, Arquivados, Categorias, Em destaque, Em oferta e Cliques totais;
  aviso de backup em laranja discreto; mais acessados em lista compacta, com o aviso de que cliques não são vendas.
- **Banners** em três modos:
  - *Escolher produto:* busca, “Selecionar”, dados do produto só para leitura, texto curto, texto do botão (“Confira agora”), posição, ativo, prévia e “Publicar banner”.
  - *Automático:* origem (em oferta, em destaque, mais acessados 7 dias, recém-cadastrados), quantidade, tempo de troca; em cada item “⋯” com “Fixar no topo” e “Não mostrar”.
  - *Personalizados:* os banners digitados à mão de antes (tabela `cr_banners`), sem mudanças.
  - Produtos marcados com “Mostrar no banner do topo” no cadastro continuam funcionando (aparecem em *Escolher produto*).
- Remover/excluir qualquer coisa pede confirmação (inclui tirar foto do produto, tirar do carrossel e remover imagem do contato).

Nenhuma aba ou função foi removida ou renomeada.

## Arquivos

| Arquivo | O quê |
|---|---|
| `admin/index.html` | Menu, visual, listas, Painel inicial e aba Banners |
| `js/banners.js` (novo) | Regras dos banners de produto (usadas pelo site e pela prévia do painel) |
| `index.html` | Exibe os banners de produto novos; tempo de troca configurável. Banners antigos seguem iguais |

## Banco de dados

**Nenhuma tabela, coluna, função ou política nova.** A configuração fica na chave `banners_v2` de `cr_site_settings.data`
(o painel relê as configurações e troca só essa chave). Cada banner guarda só o id do produto e as próprias opções;
foto, nome, preço, descrição e link são lidos do produto na hora de exibir. O site público só enxerga produtos ativos,
então produto arquivado, inativo ou excluído some do banner sozinho; com “Esconder quando sair da oferta”, também ao sair da oferta.

“Mais acessados (7 dias)”: o site não tem permissão para ler os cliques, então o painel guarda a lista (só ids)
ao abrir o Painel ou a aba Banners (ou em “Atualizar agora”).

## Desfazer

1. No GitHub, botão **Revert** no pull request destas mudanças.
2. Opcional — apagar a configuração nova (Supabase › SQL Editor). Os outros banners não são afetados:

```sql
update cr_site_settings set data = data - 'banners_v2' where id = 1;
```

# Oferta do dia (Notificações) — novembro de 2026

Em **Notificações › Oferta do dia (automática)**: nos horários escolhidos (até 2 por dia, horário de Brasília),
o sistema escolhe sozinho um produto ativo, em oferta válida, com foto e acima do preço mínimo, que não foi
notificado nos últimos X dias, e envia a notificação com a foto e o link do próprio produto.

- **Critério:** mais barato · maior desconto (%) · melhor oferta por categoria (alterna entre as categorias marcadas).
  Dá para trocar a qualquer momento no painel, sem mexer no código.
- Respeita o horário de silêncio e o limite diário de envios automáticos. Se não puder enviar em até 2 h, o horário é pulado.
- Uma notificação por horário por dia (o horário exato fica em `scheduled_at` e evita repetição). Aparece no histórico como “Auto · oferta”.

| Arquivo | O quê |
|---|---|
| `supabase/functions/send-push/oferta-dia.js` (novo) | Regras de escolha e texto (usadas pela função e pela prévia do painel) |
| `supabase/functions/send-push/index.ts` | O agendador cria a Oferta do dia antes de enviar as agendadas; uma falha nela não afeta os outros envios |
| `admin/index.html` | Cartão “Oferta do dia” com prévia |

**Banco:** nada novo. Configuração na chave `push_oferta_dia` de `cr_site_settings.data`.
**Publicação:** a função precisa ser publicada no Supabase (com os dois arquivos da pasta `send-push`).
**Desligar:** desmarcar “Oferta do dia ligada” e salvar. **Desfazer:** reverter o commit e publicar de novo a versão anterior da função.

# Shopee: importar com aprovação (Operações › Teste Shopee)

- Lista os catálogos da API de Afiliados (função `shopee-affiliate-preview-v1`, somente leitura) e carrega 20, 100 ou 500 itens por página.
- Filtros: categoria da Shopee, desconto mínimo, avaliação mínima, faixa de preço e “esconder os que já estão na loja”
  (comparação pelo código do item Shopee dentro do link de afiliado ou pelo `ext_id`).
- Só grava quando você marca itens e toca em **Importar selecionados** (até 50 por vez, com confirmação). Cada produto entra
  **inativo**, na loja Shopee, com `ext_source = 'shopee'` e `ext_id = itemid` (o índice único do banco impede duplicata),
  preço = `sale_price`, preço anterior = `price` quando maior, oferta quando o desconto real é de 10% ou mais, link = `product_short link`, até 10 fotos.
- Lembra a categoria escolhida para cada categoria da Shopee (`cr_site_settings.data.shopee_cat_map`) e guarda as últimas 10 importações
  (`shopee_imports`). **Desfazer esta importação** apaga só os produtos daquela importação que ainda estão inativos.
- Nenhuma mudança no banco: usa as colunas `ext_source`/`ext_id` e o índice único que já existiam.
- **Busca no catálogo inteiro:** “Procurar no catálogo inteiro” percorre o catálogo (500 por vez, até 20.000 itens) e para ao juntar 50 produtos
  importáveis que passem nos filtros, incluindo **categoria da Shopee** (pode digitar parte do nome, ex.: “Women Clothes”) e **palavras no nome**
  (ex.: “vestido, blusa, saia”). Tem botão Parar. Somente leitura.
- **Filtros salvos:** guardados com nome em `cr_site_settings.data.shopee_filters` (até 20); excluir pede confirmação.

# Brick Game 10 em 1 e Desafio (Vitrine › Jogos)

- Caixa **“Brick Game 10 em 1” ligado** em painel › Jogos (chave `jogos.brickgame`). Sem escolha salva, o jogo aparece junto com os outros jogos, como antes.
- **Desafio Brick Game:** abaixo do aparelho, ranking **da semana** (recomeça toda segunda, horário de Brasília) e **geral** de cada um dos 10 jogos,
  com o líder em destaque (“Consegue passar?”). O HI-SCORE do aparelho mostra o recorde do Desafio. Só diversão, sem prêmios.
- Ao fim de uma partida com pontos, quem ainda não tem apelido escolhe um (2 a 12 letras; palavrões são recusados pelo servidor).
- O servidor recusa pontos impossíveis para o tempo jogado e cada partida só é enviada uma vez. Em painel › Jogos › **Desafio Brick Game**,
  “Apagar” (com confirmação) tira um apelido do ranking daquele jogo.
- **Instalar:** rodar uma vez `supabase/08-brickgame-desafio.sql` no SQL Editor (só cria a tabela `cr_brick_partidas` e as funções `cr_brick_*`).
  Antes disso, o Desafio fica escondido e o jogo funciona normalmente com o recorde do aparelho.
- **Tamanho:** cada aparelho guarda no máximo 2 partidas por jogo (a melhor geral e a melhor da semana); partidas abertas somem em 1 dia.
- **Desfazer:** reverter o commit (o Desafio some do site) e, se quiser apagar do banco, o bloco DESFAZER no fim do arquivo 08.
- O app do celular (APK) não usa internet: continua só com o recorde do aparelho.
