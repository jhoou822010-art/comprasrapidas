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

## Desafio Brick Game, parte 2: campeões, recado e avisos

- **Recado do campeão:** quem vira o 1º lugar de um jogo escolhe uma de 12 frases prontas (curtas, ex.: “Cadê o próximo?”, “Vamos lá, jogar!”).
  Ninguém digita texto: o banco guarda só o número da frase. Aparece junto do nome do líder.
- **Últimos recordes:** “JOÃO passou MARIA em Corrida: 52 × 40” (os 100 mais recentes ficam guardados; o site mostra 8).
- **Avisos:** depois de entrar no ranking, convite opcional “Ativar avisos” (recebe o aviso do Desafio e as ofertas da loja).
  Quando alguém toma o 1º lugar, o campeão anterior recebe “😱 FULANO passou seu recorde!” com link para o jogo.
  Sai pela função `send-push` a cada 5 minutos, respeitando o horário de silêncio; não conta no limite diário de ofertas.
- **Instalar:** rodar uma vez `supabase/09-brickgame-campeoes.sql` (depois do 08) e publicar de novo a função `send-push`.
  Sem o 09, o Desafio continua como antes (sem recado, mural e avisos).
- Apagar um resultado no painel troca o campeão sem gerar aviso nem “quem passou quem”.
- **Desfazer:** bloco DESFAZER no fim do arquivo 09 + publicar a versão anterior da função.

# Conferência Shopee (Operações › Conferência Shopee) e catálogo em português

**Robô de conferência** (função `shopee-sync` + `sql/shopee_sync.sql`):
- Confere os produtos da loja Shopee que têm código (tirado do link: `…/product/LOJA/ITEM` ou `nome-i.LOJA.ITEM`) na API de afiliados
  (`productOfferV2`, um item por consulta, 5 por pedido, pausa entre pedidos).
- Atualiza **preço, preço máximo, preço original (pelo desconto), comissão, link de oferta e foto de capa**.
  Nunca mexe em nome, descrição, categoria ou destaque. O link só é trocado se o atual não apontar para o mesmo item.
  A foto só é trocada se a capa atual for foto da Shopee (foto enviada por você fica).
- Não apareceu: soma 1; na 2ª vez seguida, desativa (`shopee_status = desativado_robo`). **Nunca apaga.**
- Voltou: zera e reativa **só** o que o robô desativou. Se você mudar o status à mão, vale a sua decisão.
- Preço mudou mais de 50%: atualiza e marca para conferir.
- Erro geral da API (assinatura, fora do ar, limite): nada é desativado; o erro fica registrado na rodada.
- Agendamento: a cada 15 min o banco pergunta se está na hora (robô ligado + intervalo escolhido). Cada chamada confere até 200
  produtos (os mais antigos primeiro) e a próxima continua de onde parou. Começa **desligado**.
- Registro: `cr_shopee_sync_runs` (rodadas) e `cr_shopee_sync_log` (mudanças), só administradores leem; apagados após 60 dias.
- Chaves: Supabase › Edge Functions › Secrets › `SHOPEE_APP_ID` e `SHOPEE_APP_SECRET`
  (sem elas, usa `SHOPEE_AFFILIATE_APP_ID`/`SHOPEE_AFFILIATE_SECRET`, as da prévia do catálogo).

**Catálogo em português** (aba Teste Shopee): categorias traduzidas por `js/shopee-categorias.js`; as que faltarem aparecem em
"Categorias sem tradução" e o que você digitar fica em `cr_category_translations`. A busca acha em português e em inglês,
sem diferenciar acento e maiúsculas (ex.: vestido = dress).

**Como tirar o robô sem afetar a vitrine:** a loja e a vitrine não usam nada do robô. Para remover:
1. Desligue em Conferência Shopee (opcional, o passo 2 já para tudo).
2. Rode `sql/shopee_sync_remover.sql` no SQL Editor: para o agendador, tira o gatilho do cadastro, as funções, as tabelas,
   a configuração `shopee_sync` e as colunas novas, nessa ordem. Não apaga produtos. Pode rodar mais de uma vez.
   Tem duas linhas OPCIONAIS: recolocar na vitrine o que o robô desativou e voltar nomes traduzidos ao original.
3. (Opcional) Apague a função `shopee-sync` no Supabase.
O painel continua funcionando: a aba Conferência Shopee só mostra um aviso, e o catálogo segue em português pelo dicionário.
O gatilho que preenche os códigos é à prova de falha: um erro nele nunca impede salvar um produto.

## Guia da loja (mascote)

Um homenzinho de camisa azul ("comprasrapidas") que mostra a loja. Ele só aparece no **Início** e só é carregado depois que a página termina de abrir. Se der qualquer erro no guia, ele some e a loja continua normal.

**Como funciona para o cliente**
- **Primeira visita:** tour completo. Ele anda até cada parte (carrossel, categorias, ofertas, jogos, menu), escurece o resto da tela e aponta. O balão tem "Próximo", o X (pular) e o contador "2 de 7". Depois vêm "Instalar o app" e "Avisar de ofertas":
  - essas duas etapas só aparecem quando fazem sentido;
  - a permissão de notificação só é pedida depois que o cliente toca em "Quero ser avisado";
  - no iPhone, as notificações só são oferecidas com o app já instalado.
- **Visitas seguintes:** ele entra pelo canto, acena e pergunta se pode ajudar, sem escurecer a página, com uma barrinha de tempo. Se ninguém responder em 15 s, ele se despede e vai embora. Aparece no máximo uma vez por visita.
- **Esc** fecha o tour.
- **Desligar:**
  - o cliente pode tocar em "Não mostrar mais" (boas-vindas) ou em "Desativar guia" (final);
  - no rodapé ficam os botões "🧭 Chamar o guia" e "🧭 Ativar/Desativar guia".

**No painel:** Vitrine › Aparência › "Guia (mascote) ligado". Desmarcado e salvo, o guia e os botões dele somem para todos.

**Arquivos (pasta `js/tour/`)**
- `etapas.js`: textos, ordem das etapas e `CONFIG.espera` (segundos que ele espera na visita rápida). Uma etapa cujo elemento não existe é pulada sozinha.
- `personagem.js`: troca do personagem por imagens (`IMAGENS`, poses parado/andando/apontando/acenando, desenhadas olhando para a direita) e o tamanho.
- `tour.js`: o funcionamento.
- `tour.css`: o visual.
- No `js/app.js` ficam só a captura do "Instalar app" do Chrome e os botões do rodapé.

**Guardado no aparelho:** `cr_guia_visto`, `cr_guia_off` (localStorage) e `cr_guia_sessao` (sessionStorage).
- Para ver a primeira visita de novo, apague esses itens no navegador. Outra forma: abra `…/?guia=1`, que abre o tour na hora.
- Com login de cliente no futuro, o registro de "já viu" e "desligou" pode ser ligado ao perfil em `CONFIG.perfil` (em `etapas.js`).
- Para usar outro serviço de push, defina `CONFIG.ativarNotificacoes`. Sem ele, o guia usa as notificações que a loja já tem.

**Remover:** desmarque a chave no painel. Para tirar de vez, apague a pasta `js/tour/` e a linha do guia no fim do `index.html`. O resto da loja não depende dele.
