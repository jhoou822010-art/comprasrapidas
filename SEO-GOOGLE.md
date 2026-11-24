# Como a vitrine aparece no Google

## O que o site faz sozinho
- **Página própria para cada produto** em `p/<nome-do-produto>/` e **para cada categoria** em `c/<nome-da-categoria>/`.
  O conteúdo (nome, fotos, preço, descrição, loja, produtos relacionados) já vem escrito no HTML, então o Google
  lê a página na hora, sem depender do JavaScript. Para o visitante, a página continua igual.
- **Dados estruturados** (Product, Offer, BreadcrumbList, ItemList): ajudam o Google a mostrar preço e caminho
  ("Início › Categoria › Produto") nos resultados.
- **sitemap.xml com fotos**: lista todas as páginas de produto e categoria, com as fotos (Google Imagens).
- Tudo é refeito de hora em hora pelo GitHub Actions (`.github/workflows/previas.yml`), a partir do Supabase.
  Produto ou categoria nova abre normalmente mesmo antes disso (o `404.html` leva para a página dinâmica).
- Categoria sem produto ativo não ganha página (o Google não gosta de página vazia).

## O que você faz uma vez: Google Search Console
1. Acesse https://search.google.com/search-console e entre com sua conta Google.
2. Escolha **Domínio** e digite `comprasrapidasandrade.com.br`.
3. O Google mostra um registro **TXT**. Copie e cole nas configurações de DNS de onde você comprou o domínio
   (Registro.br ou outro). Volte e clique em **Verificar** (pode levar algumas horas).
4. No menu **Sitemaps**, envie: `https://comprasrapidasandrade.com.br/sitemap.xml`
5. Opcional: no **Bing Webmaster Tools** (https://www.bing.com/webmasters) use "Importar do Google Search Console".

Em 1 a 4 semanas o Search Console começa a mostrar quantas páginas foram indexadas e por quais buscas o site aparece.

## Dicas que fazem diferença
- **Descrição própria** nos produtos mais importantes: o Google valoriza texto que não é cópia da Shopee.
  Duas ou três frases suas (para quem serve, por que vale a pena) já ajudam.
- **Nome da categoria como as pessoas buscam** ("Caixas de Som Bluetooth" em vez de "Som").
- **Compartilhe os links `/p/...`** (botão Compartilhar) no WhatsApp, Instagram, Pinterest e grupos: cada visita e
  cada link externo ajudam o site a ser encontrado.
