# Auditoria e melhorias — Compras Rápidas Andrade (novembro de 2026)

Modelo de negócio mantido: **vitrine de ofertas com links de afiliado**. O site não vende, não tem checkout e não processa pagamentos.
Backup antes das mudanças: tag Git `backup-antes-auditoria-2026-11-14` (e a branch `main` intacta até o merge).

## 1. Diagnóstico

| # | Problema encontrado | Gravidade | Impacto na confiança | Impacto na conversão | Solução aplicada |
|---|---|---|---|---|---|
| 1 | Expressão regular com *lookbehind* em `js/app.js`: iPhones com iOS anterior ao 16.4 não entendem e **o site inteiro ficava em branco** | Crítica | Alto | Alto | Expressão reescrita sem lookbehind |
| 2 | Todo o site dependia da biblioteca supabase-js baixada do `cdn.jsdelivr.net`. Se o CDN falhasse ou fosse bloqueado, **página em branco** | Crítica | Alto | Alto | Cliente leve próprio (`js/db.js`), sem dependência externa no site público |
| 3 | Nenhuma mensagem de carregamento ou de erro; falhas de rede deixavam a tela vazia | Alta | Alto | Alto | Esqueletos de carregamento, mensagens amigáveis com “Tentar de novo”, vigia para navegador sem suporte e aviso `noscript` |
| 4 | Contato dizia “preencha o formulário”, mas **não existia formulário**; e-mail pessoal (Gmail) exposto | Alta | Alto | Médio | Formulário real (Supabase) com validação, anti-spam, LGPD e alternativa por WhatsApp; e-mail pessoal removido |
| 5 | Botões “Comprar” / “Comprar agora” sem indicar que levam a outro site | Alta | Alto | Médio | “Ver oferta na Shopee/Mercado Livre” + ícone de link externo + aviso logo abaixo |
| 6 | Página intermediária `saindo.html` exigia um clique a mais antes da loja | Média | Baixo | Alto | Botão do produto leva direto ao link de afiliado (com aviso e contagem de clique); `saindo.html` continua para links antigos, com redirecionamento automático em 4 s |
| 7 | Modelo de afiliado só aparecia no rodapé | Alta | Alto | Médio | Faixa no topo de todas as páginas, bloco “Como funciona esta vitrine”, sinais de confiança e página Sobre com transparência |
| 8 | Cores do painel fora da identidade (botão quase preto, destaque cinza) | Média | Médio | Médio | As cores de Aparência continuam valendo; o padrão (sem cor no painel) é azul-marinho #0b2a5b + azul #1a5fd6. Recomendado configurar essas duas no painel |
| 9 | Erros de digitação vindos do painel nos títulos do Início (“Destsque”, “Categoria ”) | Média | Médio | Baixo | Títulos das seções definidos no layout novo |
| 10 | Páginas internas sem H1, sem descrição e sem URL canônica; títulos “x” ou genéricos | Alta (SEO) | Baixo | Médio | Title, description, canonical e Open Graph únicos por página; H1 em todas |
| 11 | Sobre e Privacidade em `pagina.html?p=…` e só existiam via JavaScript | Média | Médio | Baixo | `sobre.html` e `privacidade.html` com texto gravado no HTML (o gerador atualiza de hora em hora); endereços antigos redirecionam |
| 12 | Títulos de produto longos, em CAIXA ALTA ou com “Dê uma olhada em”, “Envio imediato” | Média | Médio | Médio | `js/titulo.js` limpa só na exibição; o nome completo continua na página do produto |
| 13 | Página de produto sem breadcrumbs, sem dados estruturados, sem compartilhamento nativo | Média | Médio | Médio | Breadcrumbs, JSON-LD (Product + BreadcrumbList, sem avaliações nem estoque inventados), botão Compartilhar |
| 14 | Início com ordem pouco clara e sensação de produtos aleatórios (grade “arraste para os lados”) | Média | Médio | Médio | Ordem nova: topo → explicação → ofertas → categorias principais → novidades/destaques → como funciona → redes → rodapé |
| 15 | Acessibilidade: sem “pular para o conteúdo”, foco pouco visível, etiqueta “Oferta” com contraste baixo, botões de ícone sem rótulo, galeria sem teclado | Média | Médio | Baixo | Foco visível, link de pular, contraste AA, `aria-label`, galeria e ampliação por teclado (Esc/setas) |
| 16 | Sitemap sem as páginas institucionais e categorias | Baixa | — | Baixo | Sitemap com Início, Ofertas, Destaques, categorias, grupos, Sobre, Contato e Privacidade |
| 17 | Carrossel trocando sozinho sem como parar | Baixa | Baixo | Baixo | Para ao tocar/clicar, pausa com o mouse e respeita “reduzir movimento”; setas escondidas no celular |

## 2. Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `js/db.js` (novo) | Cliente leve do Supabase (leitura pública + RPC), com tempo limite de 15 s |
| `js/titulo.js` (novo) | Limpeza de títulos para exibição (site e prévias) |
| `js/texto.js` (novo) | Formata os textos do painel (títulos, parágrafos, listas) |
| `js/marca.js` (novo) | Dados institucionais (responsável, CNPJ, cidade, horário, prazo, e-mail profissional) — vazios até serem preenchidos |
| `js/app.js` | Usa `db.js`; correção do iOS antigo; topo, faixa de afiliado e rodapé novos; cards com loja e “Ver detalhes”; botões da loja; SEO; erros amigáveis |
| `css/style.css` | Identidade visual nova, responsiva, acessível |
| `index.html` | Início reorganizado, conteúdo principal visível sem JavaScript, dados estruturados Organization/WebSite |
| `produto.html` | Página de produto completa (breadcrumbs, loja, avisos, compartilhar, JSON-LD, relacionados) |
| `lista.html` | H1, breadcrumbs, canonical, grupos de categorias (Tecnologia, Casa, Moda, Beleza), paginação acessível |
| `contato.html` | Formulário funcional, canais, aviso sobre pedidos/trocas na loja parceira |
| `sobre.html`, `privacidade.html` (novos) | Páginas próprias, texto do painel formatado; Privacidade ganhou a lista dos dados técnicos usados |
| `pagina.html` | Redireciona endereços antigos para as páginas novas |
| `saindo.html` | Aviso claro + redirecionamento automático para links antigos |
| `404.html` | Visual do site e atalhos |
| `admin/index.html` | Nova aba **Mensagens**; o painel agora carrega a biblioteca completa por conta própria |
| `js/vitrine.js` | 1 linha: reconhece o novo formato dos cards |
| `supabase/04-contato.sql` (novo) | Tabela e função do formulário (testadas em PostgreSQL local) |
| `scripts/gerar-previas.mjs`, `.github/workflows/previas.yml` | Prévias com título limpo e loja; grava Sobre/Privacidade no HTML; sitemap completo |
| `p/*`, `sitemap.xml` | Regenerados pelo gerador |

## 3. Funcionalidades alteradas (e por quê)

- **Ordem e títulos das seções do Início (painel › Início):** a ordem agora é fixa (a pedida na auditoria). “Visível” e “quantidade” continuam valendo.
- **Carrossel de produtos (painel › Carrossel):** os produtos escolhidos aparecem primeiro em “Ofertas em destaque”, em grade (sem rolagem automática).
- **“Explore a loja”:** virou “Mais produtos para explorar” em grade comum, com até 10 itens.
- **Bloco “Sobre” na página de Contato:** saiu (o texto está na página Sobre). O texto longo do painel (Contato › subtítulo) foi substituído por uma introdução curta.
- **E-mail pessoal:** não aparece mais no site. O e-mail profissional aparece quando `emailAtivo` for `true` em `js/marca.js`.

## 4. Depende de configuração externa

1. **Ligar o formulário:** rodar `supabase/04-contato.sql` no SQL Editor do Supabase. Até lá, o formulário oferece enviar a mensagem pelo WhatsApp.
2. **E-mail profissional:** criar `contato@comprasrapidasandrade.com.br` no provedor do domínio e mudar `emailAtivo` para `true` em `js/marca.js`.
3. **Dados institucionais:** preencher em `js/marca.js` somente o que for verdadeiro (responsável, CNPJ se existir, cidade, horário, prazo de resposta).
4. **Painel › Aparência — cores:** para a identidade azul-marinho/azul, use Cor principal `#0b2a5b`, Cor secundária `#1a5fd6` e Cor do botão `#1a5fd6` (hoje estão roxo `#3b40ce`, cinza `#3b424a` e quase preto `#282235`).
5. **Painel › Aparência — título:** corrigir o “Título para o Google” (hoje: “Compras  Rápidas Andrade | Ofertas, Variedades e economia”, com espaço duplo e “economia” minúsculo).
6. **Redes sociais:** o Instagram cadastrado é um perfil com nome pessoal (`jonatha822010`); se houver um perfil da loja, atualize em painel › Contato.
7. **Preço anterior:** muitos produtos estão marcados como oferta com preço antigo informado. O site só exibe o que está cadastrado e avisa que é “informado pela loja”; vale conferir os valores.
8. **Google Search Console:** enviar o `sitemap.xml` após publicar.
