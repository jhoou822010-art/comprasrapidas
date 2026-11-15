// Oferta do dia (Painel › Notificações): escolhe sozinha o produto e monta o texto.
// Arquivo único usado pela função send-push (Supabase) e pela prévia do painel (admin/), sem dependências.
// Configuração: cr_site_settings.data.push_oferta_dia (nenhuma tabela ou coluna nova).

export const OD_CRIT = { cheap: 'Mais barato', discount: 'Maior desconto (%)', category: 'Melhor oferta por categoria' };
export const OD_MAX = 2; // no máximo 2 envios da Oferta do dia por dia
export const OD_PADRAO = { on: false, times: ['10:00', '19:00'], min: 10, norep: 7, crit: 'cheap', cats: [], title: '🔥 Oferta do dia', body: '{nome} por {preco}' };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// lê a configuração salva, sempre com valores válidos
export function odCfg(S) {
  const o = S && typeof S.push_oferta_dia === 'object' && S.push_oferta_dia ? S.push_oferta_dia : {};
  const times = Array.isArray(o.times) ? [...new Set(o.times.filter(t => HHMM.test(t)))].sort().slice(0, OD_MAX) : OD_PADRAO.times;
  const num = (v, d, a, b) => { const n = Number(v); return v === '' || v == null || !isFinite(n) ? d : Math.min(b, Math.max(a, n)); };
  return {
    on: o.on === true,
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
