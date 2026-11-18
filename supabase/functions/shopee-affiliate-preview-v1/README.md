# shopee-affiliate-preview-v1

Prévia **somente leitura** da API de Afiliados da Shopee (Brasil). Não grava, não altera e não apaga produtos:
toda resposta traz `persisted: false` e `published: false`.

Cópia exata da versão publicada no Supabase (projeto Loja, versão 8, publicada com `verify_jwt = true`).
Usada pela aba do painel **Operações › Teste Shopee**.

## Quem pode chamar

Só um usuário logado no painel que esteja na tabela `cr_admins` (o login precisa ser assinado com as chaves
novas do Supabase, com `kid`; a biblioteca `@supabase/server` recusa tokens antigos com `INVALID_JWT`).

## Segredos (Supabase › Edge Functions › Secrets)

| Nome | Obrigatório |
|---|---|
| `SHOPEE_AFFILIATE_APP_ID` | sim |
| `SHOPEE_AFFILIATE_SECRET` | sim (use sempre a chave nova; a antiga apareceu numa imagem e deve ser trocada) |
| `SHOPEE_AFFILIATE_API_URL` | não (padrão `https://open-api.affiliate.shopee.com.br/graphql`) |

Nunca coloque a chave secreta no `config.js`, no site, no GitHub ou em mensagens.

## Corpo da chamada

- Listar catálogos: `{"feedMode":"FULL"}` ou `{"feedMode":"DELTA"}` → `{ feeds, datafeedIds }`
- Itens de um catálogo: `{"datafeedId":"…","offset":0,"limit":20}` (limite máximo 500) → `{ rows, pageInfo }`

## Erros comuns

| Resposta | O que fazer |
|---|---|
| `INVALID_JWT` / 401 | Entrar de novo no painel; se continuar, ativar as chaves de assinatura JWT no Supabase |
| `Forbidden` / 403 | O usuário não está em `cr_admins` |
| `Shopee Affiliate credentials are not configured` | Cadastrar os segredos acima |
| Shopee `10020` | Assinatura, AppID, chave secreta ou relógio |
| Shopee `10030` | Limite de chamadas: esperar e tentar mais tarde |
| Erro de campo/permissão | O catálogo de itens pode precisar de liberação da Shopee na conta de afiliado |
