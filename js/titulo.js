// Títulos mais limpos para exibição. NÃO altera o nome salvo no banco: o nome completo continua
// aparecendo na página do produto ("Nome completo na loja") e nas buscas.
// Funciona no navegador e no Node (usado também por scripts/gerar-previas.mjs).
const MIN = new Set('a o as os e de da do das dos com sem para por em no na nos nas ao à um uma ou até tipo'.split(' '));
const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// expressões de marketplace que não descrevem o produto
const JUNK = [
  /^\s*(d[eê] uma olhada (em|no|na|nesse|nessa)|confira|olha s[oó]|novo lan[cç]amento|lan[cç]amento|promo[cç][aã]o|oferta|super oferta|imperd[ií]vel|queima de estoque)[\s:!-]+/i,
  /[\s,;|–-]*\b(envio (imediato|r[aá]pido|em 24h)|pronta entrega|frete gr[aá]tis|entrega r[aá]pida|promo[cç][aã]o|oferta imperd[ií]vel|mais vendido|top de vendas|sucesso de vendas|lan[cç]amento \d{4})\b[!.]*/gi,
];

function caseWord(w, i) {
  const lw = w.toLowerCase();
  if (i > 0 && MIN.has(lw)) return lw;
  return w;
}

export function cleanTitle(name, max = 80) {
  let s = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const orig = s;
  for (const r of JUNK) s = s.replace(r, ' ');
  // "Produto | Categoria | Frase de marketing | ..." → fica com as duas primeiras partes
  const parts = s.split(/\s*[|]\s*/).filter(Boolean);
  if (parts.length > 2) s = parts.slice(0, 2).join(' — ');
  else s = parts.join(' — ');
  // título todo em MAIÚSCULAS fica difícil de ler: passa para iniciais maiúsculas (siglas curtas ficam)
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length > 12 && letters === letters.toUpperCase())
    s = s.toLowerCase().replace(/(^|[\s(/-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  s = s.split(/\s+/).map(caseWord).join(' ');
  s = s.replace(/\s+([,.;:!?])/g, '$1').replace(/[\s,;:–—-]+$/g, '').replace(/^[\s,;:–—-]+/, '').trim();
  if (s.length > max) {
    let cut = s.slice(0, max + 1).replace(/[\s,;:(–—-]+\S*$/, '');
    // não termina em preposição/conjunção ("Bolsa Feminina com")
    let ws = cut.split(' ');
    while (ws.length > 3 && (MIN.has(strip(ws[ws.length - 1])) || /^[,;:(–—-]+$/.test(ws[ws.length - 1]))) ws.pop();
    s = ws.join(' ').replace(/[\s,;:(–—-]+$/g, '');
  }
  if (s.length) s = s[0].toUpperCase() + s.slice(1);
  return s.length >= 8 ? s : orig.slice(0, max);
}
