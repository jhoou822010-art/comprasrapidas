// Cliente leve do Supabase (somente leitura pública + RPC), sem bibliotecas externas.
// Antes o site inteiro dependia da biblioteca supabase-js baixada do cdn.jsdelivr.net: se esse CDN
// falhasse ou estivesse bloqueado na rede do visitante, a página ficava em branco. Este arquivo fala
// direto com a API REST do Supabase (PostgREST) e implementa só o que as páginas públicas usam.
// O painel (admin/) continua usando a biblioteca oficial, que é necessária para login e envio de fotos.
const TIMEOUT = 15000; // internet móvel lenta: espera até 15 s antes de mostrar a mensagem de erro

const enc = v => String(v);
const quote = v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

class Query {
  constructor(base, key, table) {
    this.base = base; this.key = key; this.table = table;
    this.p = new URLSearchParams(); this.h = {}; this.mode = 'many';
  }
  select(cols = '*', opt = {}) { this.p.set('select', cols.replace(/\s+/g, '')); if (opt.count) this.h.Prefer = 'count=' + opt.count; return this; }
  eq(c, v) { this.p.append(c, 'eq.' + enc(v)); return this; }
  ilike(c, v) { this.p.append(c, 'ilike.' + enc(v)); return this; }
  contains(c, v) { this.p.append(c, 'cs.' + (Array.isArray(v) ? '{' + v.map(quote).join(',') + '}' : JSON.stringify(v))); return this; }
  in(c, arr) { this.p.append(c, 'in.(' + arr.map(quote).join(',') + ')'); return this; }
  or(f) { this.p.append('or', '(' + f + ')'); return this; }
  order(c, { ascending = true } = {}) { const o = this.p.get('order'); this.p.set('order', (o ? o + ',' : '') + c + '.' + (ascending ? 'asc' : 'desc')); return this; }
  limit(n) { this.p.set('limit', n); return this; }
  range(a, b) { this.p.set('offset', a); this.p.set('limit', b - a + 1); return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  single() { this.mode = 'single'; return this; }
  async run() {
    const url = `${this.base}/rest/v1/${this.table}?${this.p}`;
    try {
      const r = await req(url, { headers: { ...hdr(this.key), ...this.h } });
      const body = await r.json().catch(() => null);
      if (!r.ok) return { data: null, count: null, error: body || { message: 'HTTP ' + r.status } };
      let count = null; const cr = r.headers.get('content-range'); if (cr && /\/\d+$/.test(cr)) count = +cr.split('/')[1];
      if (this.mode === 'many') return { data: body, count, error: null };
      if (body.length > 1) return { data: null, count, error: { message: 'Mais de um resultado' } };
      if (!body.length && this.mode === 'single') return { data: null, count, error: { message: 'Nenhum resultado' } };
      return { data: body[0] ?? null, count, error: null };
    } catch (e) { return { data: null, count: null, error: { message: e.name === 'AbortError' ? 'Tempo de conexão esgotado' : (e.message || 'Falha de conexão'), network: true } }; }
  }
  then(ok, ko) { return this.run().then(ok, ko); }
}
const hdr = k => ({ apikey: k, Authorization: 'Bearer ' + k, Accept: 'application/json' });
async function req(url, opt) {
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ac && setTimeout(() => ac.abort(), TIMEOUT);
  try { return await fetch(url, { ...opt, signal: ac?.signal }); } finally { clearTimeout(t); }
}

export function createLite(base, key) {
  return {
    from: table => new Query(base, key, table),
    async rpc(fn, args = {}) {
      try {
        const r = await req(`${base}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...hdr(key), 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
        const body = r.status === 204 ? null : await r.json().catch(() => null);
        return r.ok ? { data: body, error: null } : { data: null, error: { ...(body || {}), message: body?.message || 'HTTP ' + r.status, status: r.status } };
      } catch (e) { return { data: null, error: { message: e.message || 'Falha de conexão', network: true } }; }
    },
  };
}
