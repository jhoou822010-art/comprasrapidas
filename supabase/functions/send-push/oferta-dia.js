// Oferta do dia (Painel › Notificações): escolhe sozinha o produto e monta o texto.
// Arquivo único usado pela função send-push (Supabase) e pela prévia do painel (admin/), sem dependências.
// Configuração: cr_site_settings.data.push_oferta_dia (nenhuma tabela ou coluna nova).

export const OD_CRIT = { cheap: 'Mais barato', discount: 'Maior desconto (%)', category: 'Melhor oferta por categoria' };
export const OD_MAX = 2; // no máximo 2 envios da Oferta do dia por dia
export const OD_MODOS = { geral: 'Igual para todos', personalizado: 'Personalizado por interesse' };
export const OD_INTERVALO_H = 4; // modo personalizado: no máximo 1 de manhã e 1 à noite por cliente, com pelo menos 4 h de intervalo
// turno pelo horário de Brasília: 0 = manhã (antes das 14h), 1 = noite (das 14h em diante)
export const OD_VIRADA = 14;
export const odTurnoSP = (hSP) => (hSP < OD_VIRADA ? 0 : 1);
export const OD_TURNOS = ['manhã', 'noite'];
export const OD_PADRAO = { on: false, modo: 'geral', sem_perfil: 'geral', hora_pessoal: true, times: ['10:00', '19:00'], min: 10, norep: 7, crit: 'cheap', cats: [], title: '🔥 Oferta do dia', body: '{nome} por {preco}' };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// lê a configuração salva, sempre com valores válidos
export function odCfg(S) {
  const o = S && typeof S.push_oferta_dia === 'object' && S.push_oferta_dia ? S.push_oferta_dia : {};
  const times = Array.isArray(o.times) ? [...new Set(o.times.filter(t => HHMM.test(t)))].sort().slice(0, OD_MAX) : OD_PADRAO.times;
  const num = (v, d, a, b) => { const n = Number(v); return v === '' || v == null || !isFinite(n) ? d : Math.min(b, Math.max(a, n)); };
  return {
    on: o.on === true,
    modo: OD_MODOS[o.modo] ? o.modo : 'geral',
    sem_perfil: o.sem_perfil === 'nada' ? 'nada' : 'geral',
    hora_pessoal: o.hora_pessoal !== false, // modo personalizado: enviar na hora em que cada cliente costuma usar o site
    times,
    min: num(o.min, OD_PADRAO.min, 0, 100000),
    norep: Math.round(num(o.norep, OD_PADRAO.norep, 0, 60)),
    crit: OD_CRIT[o.crit] ? o.crit : 'cheap',
    cats: Array.isArray(o.cats) ? o.cats.filter(x => typeof x === 'string' && x) : [],
    title: String(o.title || '').trim().slice(0, 80) || OD_PADRAO.title,
    body: String(o.body ?? OD_PADRAO.body).trim().slice(0, 200),
  };
}

// horário de Brasília (UTC-3, sem horário de verão)
const OFF = 3 * 3600e3;
export const spDay = (ms = Date.now()) => Math.floor((ms - OFF) / 864e5);
export const spDayStart = (ms = Date.now()) => spDay(ms) * 864e5 + OFF;
export const slotISO = (day, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(day * 864e5 + OFF + (h * 60 + m) * 6e4).toISOString(); };
// horários de hoje que já chegaram (e ainda estão dentro da janela de 2 h para envio)
export function odDue(c, now = Date.now(), win = 2 * 3600e3) {
  const d = spDay(now);
  return c.times.map((t, i) => ({ i, t, at: slotISO(d, t) })).filter(s => { const ms = Date.parse(s.at); return now >= ms && now < ms + win; });
}

export const offerOn = (p, now = Date.now()) => !!p.offer && (!p.offer_end || Date.parse(p.offer_end) > now) && (!p.offer_start || Date.parse(p.offer_start) <= now);
export const desconto = p => p.old_price != null && p.price != null && +p.old_price > +p.price ? (p.old_price - p.price) / p.old_price : 0;
const hasImg = p => (p.product_images || []).some(i => i && i.url);
const byCheap = (a, b) => a.price - b.price || String(a.id).localeCompare(String(b.id));
const byBest = (a, b) => desconto(b) - desconto(a) || byCheap(a, b);

// produtos que podem ser escolhidos: ativos, em oferta válida, com foto, acima do preço mínimo e fora da lista "skip"
export const odEligible = (prods, c, { now = Date.now(), skip = new Set() } = {}) =>
  (prods || []).filter(p => p && p.status === 'active' && offerOn(p, now) && p.price != null && +p.price >= c.min && hasImg(p) && !skip.has(p.id));

// escolhe o produto do envio "slot" (0 = 1º horário do dia, 1 = 2º)
export function odPick(prods, c, { now = Date.now(), skip = new Set(), slot = 0 } = {}) {
  const ok = odEligible(prods, c, { now, skip });
  if (c.crit === 'cheap') return ok.sort(byCheap)[0] || null;
  if (c.crit === 'discount') return ok.filter(p => desconto(p) > 0).sort(byBest)[0] || null;
  // por categoria: alterna entre as categorias marcadas (todas, se nenhuma marcada); se a da vez não tiver oferta, passa para a próxima
  const cats = c.cats.length ? c.cats : [...new Set(ok.map(p => p.category_id).filter(Boolean))].sort();
  const n = cats.length; if (!n) return null;
  const start = ((spDay(now) * OD_MAX + slot) % n + n) % n;
  for (let k = 0; k < n; k++) { const cat = cats[(start + k) % n], p = ok.filter(x => x.category_id === cat).sort(byBest)[0]; if (p) return p; }
  return null;
}

const brl = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const odText = (tpl, p) => String(tpl || '')
  .replace(/\{nome\}/g, String(p.name || '').trim().slice(0, 90))
  .replace(/\{preco\}/g, p.price != null ? brl(p.price) : '')
  .replace(/\{desconto\}/g, desconto(p) > 0 ? Math.round(desconto(p) * 100) + '%' : '');
// mesmo formato de link do painel (cr_notification_settings.product_url_template)
export const odLink = (p, ns, site) => (ns?.product_url_template || '{site}?produto={slug}')
  .replace('{site}', ns?.site_url || site || '/').replace('{slug}', encodeURIComponent(p.slug || '')).replace('{id}', p.id);

// linha de cr_notifications para um envio (a foto vem do produto na hora do envio)
export const odRow = (p, c, slot, ns, site) => ({
  title: odText(c.title, p).slice(0, 80) || OD_PADRAO.title, body: odText(c.body, p).slice(0, 200) || null,
  image_url: null, url: odLink(p, ns, site), product_id: p.id, source: 'auto_offer', status: 'scheduled', scheduled_at: slot.at, error: null,
});

// ===================== Modo personalizado (1 de manhã e 1 à noite por cliente) =====================
// Horário de cada cliente: o aparelho manda, junto do resumo, a hora (UTC) em que a pessoa mais costuma abrir o site (h)
// e em quantos dias diferentes isso foi observado (hn). Só vale com pelo menos 3 dias; antes disso, segue os horários do painel.
export const odHora = (sub) => { const I = sub && sub.interesses; const h = I && Number(I.h), n = I && Number(I.hn);
  return Number.isInteger(h) && h >= 0 && h <= 23 && n >= 3 ? h : null; };
// O aparelho envia só um resumo: { v:1, cat:{idCategoria:peso}, seg:{segmento:peso}, pr:{lo,hi,med} } (sem buscas, sem nome, sem e-mail).
// Só entram produtos com informação confiável: ativos, com foto, preço, link https e nome legível. Nada de avaliação ou desconto inventado:
// o desconto só conta quando o preço anterior é maior que o atual.
export const odConfiavel = (p, c, now = Date.now()) => !!p && p.status === 'active' && p.price != null && +p.price >= c.min && hasImg(p)
  && /^https:\/\/[^\s]+\.[^\s]+/i.test(p.affiliate_url || '') && String(p.name || '').trim().length >= 5;

const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const unit = s => h32(s) / 4294967296;

// pesos por categoria do cliente, ajustados pelo que ele fez com as notificações anteriores:
// tocou → a categoria ganha força; recebeu e ignorou → perde um pouco. Um toque NÃO é tratado como compra.
export function odPesos(sub, hist = [], now = Date.now()) {
  const I = sub && sub.personalizar !== false && sub.interesses && typeof sub.interesses === 'object' ? sub.interesses : null;
  const base = I && I.cat && typeof I.cat === 'object' ? I.cat : {};
  const w = {};
  for (const [k, v] of Object.entries(base)) if (+v > 0) w[k] = +v;
  if (!Object.keys(w).length) return null;
  const adj = {};
  for (const h of hist) {
    if (!h.cat) continue;
    if (h.tocou) adj[h.cat] = (adj[h.cat] || 1) + 0.3;
    else if (now - Date.parse(h.enviada_em) > 864e5) adj[h.cat] = (adj[h.cat] || 1) - 0.15;
  }
  for (const [k, a] of Object.entries(adj)) if (w[k]) w[k] *= Math.min(2, Math.max(0.4, a));
  // variedade: categorias das 3 últimas entregas perdem força (abre espaço para produtos complementares)
  hist.slice(0, 3).forEach(h => { if (h.cat && w[h.cat]) w[h.cat] *= 0.7; });
  return { w, pr: I.pr && +I.pr.med > 0 ? I.pr : null };
}

// escolhe o produto de UM cliente. ctx: { now, hist (entregas dele, mais recentes primeiro, com cat e tocou), pop {id:cliques}, norepDias }
export function odEscolher(sub, prods, c, ctx = {}) {
  const now = ctx.now || Date.now(), hist = ctx.hist || [], pesos = odPesos(sub, hist, now);
  if (!pesos) return null;
  const norep = now - (ctx.norepDias ?? c.norep) * 864e5, ja = new Set(hist.filter(h => Date.parse(h.enviada_em) >= Math.min(norep, now - 864e5)).map(h => h.product_id));
  const maxW = Math.max(...Object.values(pesos.w)), maxPop = Math.max(1, ...Object.values(ctx.pop || {})), dia = spDay(now);
  let best = null;
  for (const p of prods) {
    if (ja.has(p.id) || !odConfiavel(p, c, now)) continue;
    const ci = (pesos.w[p.category_id] || 0) / maxW;
    if (ci < 0.15) continue; // pouco a ver com o interesse do cliente
    let fit = 0.5;
    if (pesos.pr) { const r = Math.abs(Math.log(+p.price / +pesos.pr.med)); fit = +p.price >= +pesos.pr.lo && +p.price <= +pesos.pr.hi ? 1 : 1 / (1 + r * 2); }
    const off = offerOn(p, now) ? 1 : 0, rec = now - Date.parse(p.created_at || 0) < 14 * 864e5 ? 1 : 0, pop = (ctx.pop?.[p.id] || 0) / maxPop;
    const sc = ci * 0.55 + fit * 0.15 + Math.min(0.6, desconto(p)) / 0.6 * 0.1 + off * 0.08 + rec * 0.04 + pop * 0.08 + unit(sub.id + '|' + dia + '|' + p.id) * 0.02;
    if (!best || sc > best.sc) best = { p, sc, ci };
  }
  return best;
}

// título "Oferta para você"; o texto traz o produto, o preço e o desconto (só quando real)
export function odMsg(p, sub, now = Date.now(), cat = '') {
  const d = desconto(p);
  const titulo = '🎁 Oferta para você'; // título fixo escolhido pela loja; o texto abaixo varia com o produto
  const preco = p.price != null ? brl(p.price) : '';
  const corpo = (String(p.name || '').trim().slice(0, 120) + (preco ? ' por ' + preco : '') + (d >= 0.05 ? ` (${Math.round(d * 100)}% off)` : '')).slice(0, 200);
  return { titulo, corpo };
}
