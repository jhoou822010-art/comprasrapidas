// Transforma os textos do painel (Sobre, Política de privacidade) em HTML organizado:
// linhas curtas viram subtítulos, linhas com "- " viram listas e o resto vira parágrafos.
// Funciona no navegador e no Node (scripts/gerar-previas.mjs grava o texto direto no HTML para o Google).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function fmtText(txt, { skip = [] } = {}) {
  const skipN = skip.map(norm);
  const blocks = String(txt ?? '').replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  let out = '';
  for (const b of blocks) {
    const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 1 && skipN.includes(norm(lines[0]))) continue; // título repetido (já está no H1)
    if (lines.every(l => /^[-•*]\s+/.test(l))) { out += '<ul>' + lines.map(l => `<li>${esc(l.replace(/^[-•*]\s+/, ''))}</li>`).join('') + '</ul>'; continue; }
    const one = lines.length === 1 ? lines[0] : '';
    if (one && one.length <= 70 && !/[.;,!:]$/.test(one) && (/^\d+(\.\d+)*[.)]?\s+\S/.test(one) || /\?$/.test(one) || one.split(' ').length <= 7)) {
      out += `<h2>${esc(one)}</h2>`; continue;
    }
    out += `<p>${lines.map(esc).join('<br>')}</p>`;
  }
  return out;
}
