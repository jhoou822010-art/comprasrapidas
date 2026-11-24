// Gera as páginas estáticas de produto (p/<slug>/) e de categoria (c/<slug>/): o Google e o WhatsApp leem o conteúdo
// sem rodar JavaScript (nome, foto, preço, descrição, dados estruturados e prévia de link).
// Também gera sitemap.xml, robots.txt e a prévia da página inicial (index.html).
// Uso: node scripts/gerar-previas.mjs   (roda sozinho pelo GitHub Actions, ver .github/workflows/previas.yml)
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cleanTitle } from '../js/titulo.js';
import { fmtText } from '../js/texto.js';

const cfg = readFileSync('config.js', 'utf8');
const SB_URL = process.env.SUPABASE_URL || cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
const SB_KEY = process.env.SUPABASE_KEY || cfg.match(/SUPABASE_KEY\s*=\s*'([^']+)'/)[1];
const SITE = 'https://' + readFileSync('CNAME', 'utf8').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') + '/';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const oneLine = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => (s = oneLine(s)).length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;

async function get(path, from = 0, to = 999) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Range: `${from}-${to}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
async function getAll(path) {
  const out = [];
  for (let i = 0; ; i += 1000) { const page = await get(path, i, i + 999); out.push(...page); if (page.length < 1000) return out; }
}

const S = (await get('cr_site_settings?select=data&id=eq.1'))[0]?.data || {};
const store = oneLine(S.name) || 'Compras Rápidas Andrade';
const storeDesc = oneLine(S.seo_desc || 'Vitrine de ofertas com produtos selecionados da Shopee, Mercado Livre e outras lojas parceiras. Compare, escolha e finalize a compra direto na loja.');
const storeImg = S.logo || SITE + 'icon-512.png';
// Imagem da prévia da página inicial: o WhatsApp não mostra .webp de forma confiável,
// então, se a logo for .webp, usa a og-image.jpg do site (1200x630, feita a partir da logo).
const isWebp = u => /\.webp(\?|#|$)/i.test(u || '');
const homeImg = S.og_image || (S.logo && !isWebp(S.logo) ? S.logo : SITE + 'og-image.jpg');
const homeImgMeta = homeImg === SITE + 'og-image.jpg'
  ? '<meta property=og:image:type content=image/jpeg><meta property=og:image:width content=1200><meta property=og:image:height content=630>' : '';
const homeTitle = store + ' — Ofertas selecionadas de lojas parceiras';

// Fotos .webp: o WhatsApp não mostra esse formato de forma confiável, então cada foto .webp usada
// numa prévia ganha uma cópia em JPG na pasta og/ (só é baixada e convertida uma vez).
// A conversão usa o pacote sharp (instalado pelo GitHub Actions); sem ele, a foto .webp fica como está.
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('sharp não instalado: fotos .webp ficam como estão.'); }
mkdirSync('og', { recursive: true });
const ogUsed = new Set();
let ogNew = 0;
async function shareImg(url) {
  if (!isWebp(url)) return { url, jpg: false };
  const file = 'og/' + createHash('sha1').update(url).digest('hex').slice(0, 20) + '.jpg';
  if (!existsSync(file)) {
    if (!sharp) return { url, jpg: false };
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await sharp(Buffer.from(await r.arrayBuffer()))
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(file);
      ogNew++;
    } catch (e) { console.warn('não converti', url, e.message); return { url, jpg: false }; }
  }
  ogUsed.add(file);
  return { url: SITE + file, jpg: true };
}

const products = await getAll('cr_products?select=id,slug,name,price,price_max,description,affiliate_url,created_at,category_id,merchants:cr_merchants(name),categories:cr_categories(name,slug),product_images:cr_product_images(url,sort,is_cover)&status=eq.active&order=created_at.desc');
if (!products.length) throw new Error('Nenhum produto ativo retornado; nada foi alterado.');
const cats = await get('cr_categories?select=id,name,slug&active=eq.true&order=sort');

// ---- Páginas estáticas que o Google lê sem rodar JavaScript ----
// Cada produto ganha p/<slug>/ e cada categoria c/<slug>/. Elas são cópias de produto.html e lista.html com o conteúdo
// já escrito no HTML (nome, fotos, preço, descrição, dados estruturados). Quando a página abre, o JavaScript de sempre
// carrega por cima, então o visitante vê exatamente a mesma página de antes.
const okSlug = s => /^[\w-]+$/.test(s || '');
const priceOf = p => p.price == null ? '' : money(p.price) + (p.price_max != null && Number(p.price_max) > Number(p.price) ? ' a ' + money(p.price_max) : '');
const imgsOf = p => [...(p.product_images || [])].sort((a, b) => (b.is_cover - a.is_cover) || (a.sort - b.sort)).map(i => i.url).filter(u => /^https?:\/\//.test(u || ''));
const storeOf = p => oneLine(p.merchants?.name || '').replace(/^mercado livre$/i, 'Mercado Livre').replace(/^shopee$/i, 'Shopee');
const cleanDesc = p => String(p.description || '').replace(/https?:\/\/\S+/g, '').replace(/[ \t]+\n/g, '\n').trim();
const ld = o => `<script type=application/ld+json data-ld-fixo>${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const pUrl = p => SITE + 'p/' + p.slug + '/', cUrl = c => SITE + 'c/' + c.slug + '/';
const catName = c => oneLine(c?.name);

// Monta a página a partir do modelo (produto.html ou lista.html): troca o <head> de SEO e o conteúdo do <main>.
function fromTemplate(tpl, { path, title, desc, head, main }) {
  let h = tpl;
  h = h.replace('<meta charset=utf-8>', () => '<meta charset=utf-8><base href="../../">'); // a página fica 2 pastas abaixo: css/, js/ e os links continuam funcionando
  h = h.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  h = h.replace(/<meta name=description content="[^"]*">/, () => `<meta name=description content="${esc(desc)}">`);
  h = h.replace('</head>', () => head + '</head>');
  h = h.replace(/(<main class=w id=m tabindex=-1>)[\s\S]*?(<\/main>)/, (_, a, b) => a + main + b);
  h = h.replace(/href="#m"/g, () => `href="${path}#m"`).replace(/href=""/g, () => `href="${path}"`); // com <base>, "#m" e "" apontariam para o Início
  return h;
}
const seoHead = ({ url, title, desc, img, jpg, type, extra = '' }) => `<link rel=canonical href="${esc(url)}"><meta name=robots content="index,follow,max-image-preview:large">
<meta property=og:type content=${type}><meta property=og:locale content=pt_BR><meta property=og:site_name content="${esc(store)}">
<meta property=og:title content="${esc(title)}"><meta property=og:description content="${esc(desc)}"><meta property=og:url content="${esc(url)}">
${img ? `<meta property=og:image content="${esc(img)}"><meta property=og:image:secure_url content="${esc(img)}">${jpg ? '<meta property=og:image:type content=image/jpeg>' : ''}<meta property=og:image:alt content="${esc(title)}">` : ''}<meta name=twitter:card content=summary_large_image>${extra}`;
const miniCard = p => {
  const n = cleanTitle(p.name), img = imgsOf(p)[0], pr = priceOf(p), st = storeOf(p);
  return `<article class=card><div class=im>${img ? `<img loading=lazy decoding=async width=320 height=320 src="${esc(img)}" alt="${esc(n)}">` : ''}</div><div class=cb><h3><a class=lk href="p/${p.slug}/">${esc(n)}</a></h3>${pr ? `<div class=pr><b>${esc(pr)}</b></div>` : ''}${st ? `<span class=st>Vendido na ${esc(st)}</span>` : ''}</div></article>`;
};

const live = products.filter(p => okSlug(p.slug));
products.filter(p => !okSlug(p.slug)).forEach(p => console.warn('slug ignorado:', p.slug));
const byCat = new Map();
for (const p of live) if (p.category_id) (byCat.get(p.category_id) || byCat.set(p.category_id, []).get(p.category_id)).push(p);

// Produtos
const tplProduto = readFileSync('produto.html', 'utf8');
rmSync('p', { recursive: true, force: true }); // produtos removidos somem
for (const p of live) {
  const imgs = imgsOf(p);
  const { url: shareImgUrl, jpg } = await shareImg(imgs[0] || storeImg);
  const price = priceOf(p), name = cleanTitle(p.name), loja = storeOf(p), d = cleanDesc(p), cat = p.categories;
  const desc = cut([price && 'Por ' + price + (loja ? ' na ' + loja : ''), d].filter(Boolean).join(' · '), 200) || store;
  const url = pUrl(p), aff = /^https:\/\//i.test(p.affiliate_url || '') ? p.affiliate_url : '';
  const isRng = p.price_max != null && Number(p.price_max) > Number(p.price);
  const offer = p.price == null ? undefined : isRng
    ? { '@type': 'AggregateOffer', lowPrice: +p.price, highPrice: +p.price_max, priceCurrency: 'BRL', url, offerCount: 1 }
    : { '@type': 'Offer', price: +p.price, priceCurrency: 'BRL', url, ...(loja ? { seller: { '@type': 'Organization', name: loja } } : {}) };
  const json = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Product', name: p.name, url, image: imgs.slice(0, 5), description: (d || p.name).slice(0, 500), ...(cat ? { category: catName(cat) } : {}), ...(offer ? { offers: offer } : {}) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE }, ...(cat ? [{ '@type': 'ListItem', position: 2, name: catName(cat), item: cUrl(cat) }] : []), { '@type': 'ListItem', position: cat ? 3 : 2, name, item: url }] }] };
  const rel = (byCat.get(p.category_id) || []).filter(x => x.id !== p.id).slice(0, 8);
  const label = loja ? 'Ver oferta na ' + loja : 'Ver produto na loja parceira';
  const main = `<nav class=crumb aria-label="Você está em"><ol><li><a href="./">Início</a></li>${cat ? `<li><a href="c/${esc(cat.slug)}/">${esc(catName(cat))}</a></li>` : ''}<li aria-current=page>${esc(name.length > 48 ? name.slice(0, 46).replace(/\s+\S*$/, '') + '…' : name)}</li></ol></nav>
<div class=pd><div class=gal><div class=main>${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(name)}" fetchpriority=high decoding=async>` : '<img src="icon-512.png" alt="">'}</div>${imgs.length > 1 ? `<div class=th>${imgs.slice(1, 6).map((u, i) => `<img loading=lazy src="${esc(u)}" alt="${esc(name)} — foto ${i + 2}" width=64 height=64>`).join('')}</div>` : ''}</div>
<div class=pi><h1>${esc(name)}</h1><div class=pp>${price ? `<b${isRng ? ' class=rg' : ''}>${esc(price)}</b>` : '<b class=rg>Consulte o preço na loja</b>'}</div>
${loja ? `<p class=seller><span class=st style="font-size:.95rem">Vendido e entregue pela loja parceira: <b>${esc(loja)}</b></span></p>` : ''}
${aff ? `<div class=cta><a class="btn big" href="${esc(aff)}" rel="sponsored nofollow noopener">${esc(label)}</a></div>` : ''}
<div class=warn><ul><li>O preço, o estoque e o frete podem mudar a qualquer momento na loja.</li><li>O pagamento, a entrega, as trocas e as devoluções são feitos pela loja parceira.</li><li>O link é de afiliado: podemos receber uma comissão, sem custo adicional para você.</li></ul></div>
${d || name !== oneLine(p.name) ? `<section><h2>Sobre o produto</h2>${name !== oneLine(p.name) ? `<p class=note><b>Nome completo na loja:</b> ${esc(p.name)}</p>` : ''}${d ? `<div class=desc>${esc(d)}</div>` : ''}</section>` : ''}</div></div>
${rel.length ? `<section class=sec><div class=sh><h2>Produtos relacionados</h2>${cat ? `<a href="c/${esc(cat.slug)}/">Ver mais</a>` : ''}</div><div class=grid>${rel.map(miniCard).join('')}</div></section>` : ''}`;
  mkdirSync('p/' + p.slug, { recursive: true });
  writeFileSync(`p/${p.slug}/index.html`, fromTemplate(tplProduto, {
    path: 'p/' + p.slug + '/', title: name + ' | ' + store, desc, main,
    head: seoHead({ url, title: name + (price ? ' — ' + price : ''), desc, img: shareImgUrl, jpg, type: 'product',
      extra: (p.price != null ? `<meta property=product:price:amount content="${Number(p.price).toFixed(2)}"><meta property=product:price:currency content=BRL>` : '') + ld(json) })
  }));
}

// Categorias
const tplLista = readFileSync('lista.html', 'utf8');
rmSync('c', { recursive: true, force: true });
const catPages = [];
for (const c of cats) {
  if (!okSlug(c.slug)) continue;
  const items = byCat.get(c.id) || [];
  if (!items.length) continue; // categoria vazia não vira página (o Google não gosta de página sem conteúdo)
  const nm = catName(c), url = cUrl(c);
  const prices = items.map(p => Number(p.price)).filter(v => !isNaN(v) && v > 0);
  const lojas = [...new Set(items.map(storeOf).filter(Boolean))];
  const desc = cut(`${nm}: ${items.length} ${items.length === 1 ? 'produto selecionado' : 'produtos selecionados'}${lojas.length ? ' na ' + lojas.join(' e ') : ' em lojas parceiras'}${prices.length ? ', a partir de ' + money(Math.min(...prices)) : ''}. Compare e finalize a compra direto na loja.`, 200);
  const show = items.slice(0, 48);
  const json = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: nm, url, description: desc, isPartOf: { '@id': SITE + '#site' } },
    { '@type': 'ItemList', numberOfItems: items.length, itemListElement: show.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: pUrl(p), name: cleanTitle(p.name) })) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Categorias', item: SITE + 'lista.html?tipo=categorias' }, { '@type': 'ListItem', position: 3, name: nm, item: url }] }] };
  const main = `<nav class=crumb aria-label="Você está em"><ol><li><a href="./">Início</a></li><li><a href="lista.html?tipo=categorias">Categorias</a></li><li aria-current=page id=bc>${esc(nm)}</li></ol></nav><h1 id=t>${esc(nm)}</h1><p class=note id=sub>${esc(desc)}</p><div id=lst><div class=grid>${show.map(miniCard).join('')}</div></div><p class=note>Preços informativos, sujeitos a alteração. A compra é finalizada no site da loja parceira.</p>`;
  mkdirSync('c/' + c.slug, { recursive: true });
  writeFileSync(`c/${c.slug}/index.html`, fromTemplate(tplLista, {
    path: 'c/' + c.slug + '/', title: nm + ' | ' + store, desc, main,
    head: seoHead({ url, title: nm + ' | ' + store, desc, img: (await shareImg(imgsOf(items[0])[0] || storeImg)).url, type: 'website', extra: ld(json) })
  }));
  catPages.push([url, String(items[0].created_at).slice(0, 10)]);
}

// Apaga as cópias em JPG que nenhum produto usa mais (produto removido ou foto trocada).
for (const f of readdirSync('og')) if (f.endsWith('.jpg') && !ogUsed.has('og/' + f)) rmSync('og/' + f);
console.log(`Fotos em JPG para as prévias: ${ogUsed.size} (${ogNew} novas).`);

// Prévia da página inicial (bloco entre <!--og--> e <!--/og--> no index.html).
// O <title> fica dentro do bloco com o nome real da loja (o WhatsApp lê o título sem rodar JavaScript).
const pageTitle = oneLine(S.seo_title) || store + ' | Ofertas selecionadas de lojas parceiras'; // mesmo título que o site mostrava na aba (campo "Título para o Google")
const homeOg = `<!--og--><title data-auto>${esc(pageTitle)}</title><meta name=description content="${esc(storeDesc)}"><meta property=og:type content=website><meta property=og:locale content=pt_BR><meta property=og:site_name content="${esc(store)}"><meta property=og:title content="${esc(homeTitle)}"><meta property=og:description content="${esc(storeDesc)}"><meta property=og:url content="${esc(SITE)}"><meta property=og:image content="${esc(homeImg)}"><meta property=og:image:secure_url content="${esc(homeImg)}">${homeImgMeta}<meta property=og:image:alt content="${esc(store)}"><meta name=twitter:card content=summary_large_image><!--/og-->`;
let index = readFileSync('index.html', 'utf8');
index = index.replace(/<title>x<\/title>/, ''); // título provisório antigo: o bloco abaixo traz o título real
index = /<!--og-->[\s\S]*?<!--\/og-->/.test(index) ? index.replace(/<!--og-->[\s\S]*?<!--\/og-->/, () => homeOg) : index.replace('<meta charset=utf-8>', () => '<meta charset=utf-8>' + homeOg);
writeFileSync('index.html', index);

// Textos do Sobre e da Política de privacidade gravados no HTML (aparecem mesmo sem JavaScript e o Google lê).
for (const [file, txt, skip] of [['sobre.html', S.about, ['Sobre a ' + store, 'Sobre a loja', store]], ['privacidade.html', S.privacy, ['Política de privacidade', store]]]) {
  if (!existsSync(file) || !String(txt || '').trim()) continue;
  const html = readFileSync(file, 'utf8');
  writeFileSync(file, html.replace(/<!--txt-->[\s\S]*?<!--\/txt-->/, () => '<!--txt-->' + fmtText(txt, { skip }) + '<!--/txt-->'));
}

// sitemap.xml e robots.txt (para o Google achar todos os produtos e categorias, com as fotos para o Google Imagens).
const day = d => String(d).slice(0, 10), latest = day(products[0].created_at); // data fixa: só muda quando há produto novo
const urls = [[SITE, latest], [SITE + 'lista.html?tipo=ofertas', latest], [SITE + 'lista.html?tipo=destaques', latest], [SITE + 'lista.html?tipo=categorias', latest],
  ...['tecnologia', 'casa', 'moda', 'beleza'].map(g => [SITE + 'lista.html?tipo=grupo&g=' + g, latest]),
  ...catPages,
  [SITE + 'sobre.html', latest], [SITE + 'contato.html', latest], [SITE + 'privacidade.html', latest],
  ...live.map(p => [pUrl(p), day(p.created_at), imgsOf(p).slice(0, 5), cleanTitle(p.name)])];
const imgTags = (imgs = [], t) => imgs.map(u => `<image:image><image:loc>${esc(u)}</image:loc></image:image>`).join('');
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.map(([u, d, im, t]) => `<url><loc>${esc(u)}</loc><lastmod>${d}</lastmod>${imgTags(im, t)}</url>`).join('\n')}\n</urlset>\n`);
writeFileSync('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /gestor/\nSitemap: ${SITE}sitemap.xml\n`);

console.log(`${live.length} páginas de produto em p/, ${catPages.length} páginas de categoria em c/, sitemap.xml com ${urls.length} endereços.`);
