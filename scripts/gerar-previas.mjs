// Gera as "prévias de link" (foto, nome e preço que aparecem no WhatsApp, Facebook etc.).
// O WhatsApp não roda JavaScript, então cada produto ganha uma página estática em p/<slug>/
// com as tags Open Graph já preenchidas; quem abre o link é levado na hora para produto.html.
// Também gera sitemap.xml, robots.txt e a prévia da página inicial (index.html).
// Uso: node scripts/gerar-previas.mjs   (roda sozinho pelo GitHub Actions, ver .github/workflows/previas.yml)
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
const store = S.name || 'Compras Rápidas';
const storeDesc = oneLine(S.seo_desc || S.slogan || '');
const storeImg = S.logo || SITE + 'icon-512.png';
// Imagem da prévia da página inicial: o WhatsApp não mostra .webp de forma confiável,
// então, se a logo for .webp, usa a og-image.jpg do site (1200x630, feita a partir da logo).
const isWebp = u => /\.webp(\?|#|$)/i.test(u || '');
const homeImg = S.og_image || (S.logo && !isWebp(S.logo) ? S.logo : SITE + 'og-image.jpg');
const homeImgMeta = homeImg === SITE + 'og-image.jpg'
  ? '<meta property=og:image:type content=image/jpeg><meta property=og:image:width content=1200><meta property=og:image:height content=630>' : '';
const homeTitle = store + (S.slogan ? ' — ' + oneLine(S.slogan) : '');

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

const products = await getAll('cr_products?select=slug,name,price,price_max,description,created_at,product_images:cr_product_images(url,sort,is_cover)&status=eq.active&order=created_at.desc');
if (!products.length) throw new Error('Nenhum produto ativo retornado; nada foi alterado.');

// Páginas dos produtos: apaga as antigas (produtos removidos somem) e recria todas.
rmSync('p', { recursive: true, force: true });
for (const p of products) {
  if (!/^[\w-]+$/.test(p.slug)) { console.warn('slug ignorado:', p.slug); continue; }
  const imgs = [...(p.product_images || [])].sort((a, b) => (b.is_cover - a.is_cover) || (a.sort - b.sort));
  const { url: img, jpg } = await shareImg(imgs[0]?.url || storeImg);
  const price = p.price == null ? '' : money(p.price) + (p.price_max != null && Number(p.price_max) > Number(p.price) ? ' a ' + money(p.price_max) : '');
  const title = p.name + (price ? ' — ' + price : '');
  const desc = cut([price && 'Por ' + price, p.description].filter(Boolean).join(' · '), 200) || store;
  const url = SITE + 'p/' + p.slug + '/';
  const dest = '../../produto.html?produto=' + p.slug;
  mkdirSync('p/' + p.slug, { recursive: true });
  writeFileSync(`p/${p.slug}/index.html`, `<!doctype html><html lang=pt-BR><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>${esc(p.name)} | ${esc(store)}</title><meta name=description content="${esc(desc)}">
<link rel=canonical href="${esc(SITE + 'produto.html?produto=' + p.slug)}">
<meta property=og:type content=product><meta property=og:locale content=pt_BR><meta property=og:site_name content="${esc(store)}">
<meta property=og:title content="${esc(title)}"><meta property=og:description content="${esc(desc)}"><meta property=og:url content="${esc(url)}">
<meta property=og:image content="${esc(img)}"><meta property=og:image:secure_url content="${esc(img)}">${jpg ? '<meta property=og:image:type content=image/jpeg>' : ''}<meta property=og:image:alt content="${esc(p.name)}">
${p.price != null ? `<meta property=product:price:amount content="${Number(p.price).toFixed(2)}"><meta property=product:price:currency content=BRL>\n` : ''}<meta name=twitter:card content=summary_large_image>
<meta http-equiv=refresh content="0;url=${esc(dest)}"><script>location.replace(${JSON.stringify(dest)})</script></head>
<body style="font:16px system-ui,sans-serif;text-align:center;padding:40px 12px"><img src="${esc(img)}" alt="" style="max-width:240px;max-height:240px"><h1 style="font-size:1.2rem">${esc(p.name)}</h1>${price ? `<p><b>${esc(price)}</b></p>` : ''}<p><a href="${esc(dest)}">Ver produto</a></p></body></html>
`);
}

// Apaga as cópias em JPG que nenhum produto usa mais (produto removido ou foto trocada).
for (const f of readdirSync('og')) if (f.endsWith('.jpg') && !ogUsed.has('og/' + f)) rmSync('og/' + f);
console.log(`Fotos em JPG para as prévias: ${ogUsed.size} (${ogNew} novas).`);

// Prévia da página inicial (bloco entre <!--og--> e <!--/og--> no index.html).
// O <title> fica dentro do bloco com o nome real da loja (o WhatsApp lê o título sem rodar JavaScript).
const pageTitle = oneLine(S.seo_title) || store; // mesmo título que o site mostrava na aba (campo "Título para o Google")
const homeOg = `<!--og--><title data-auto>${esc(pageTitle)}</title><meta name=description content="${esc(storeDesc)}"><meta property=og:type content=website><meta property=og:locale content=pt_BR><meta property=og:site_name content="${esc(store)}"><meta property=og:title content="${esc(homeTitle)}"><meta property=og:description content="${esc(storeDesc)}"><meta property=og:url content="${esc(SITE)}"><meta property=og:image content="${esc(homeImg)}"><meta property=og:image:secure_url content="${esc(homeImg)}">${homeImgMeta}<meta property=og:image:alt content="${esc(store)}"><meta name=twitter:card content=summary_large_image><!--/og-->`;
let index = readFileSync('index.html', 'utf8');
index = index.replace(/<title>x<\/title>/, ''); // título provisório antigo: o bloco abaixo traz o título real
index = /<!--og-->[\s\S]*?<!--\/og-->/.test(index) ? index.replace(/<!--og-->[\s\S]*?<!--\/og-->/, () => homeOg) : index.replace('<meta charset=utf-8>', () => '<meta charset=utf-8>' + homeOg);
writeFileSync('index.html', index);

// sitemap.xml e robots.txt (para o Google achar todos os produtos).
const day = d => String(d).slice(0, 10), latest = day(products[0].created_at); // data fixa: só muda quando há produto novo
const urls = [[SITE, latest], [SITE + 'lista.html', latest], ...products.filter(p => /^[\w-]+$/.test(p.slug)).map(p => [SITE + 'produto.html?produto=' + p.slug, day(p.created_at)])];
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `<url><loc>${esc(u)}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /gestor/\nSitemap: ${SITE}sitemap.xml\n`);

console.log(`${products.length} prévias de produto geradas em p/, sitemap.xml com ${urls.length} endereços.`);
