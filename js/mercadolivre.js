// CATEGORIAS EXTERNAS DO MERCADO LIVRE (painel › Catálogo › Categorias Mercado Livre).
// Tabelas próprias: categorias_mercado_livre e configuracoes_vitrine (supabase/11-categorias-mercado-livre.sql).
// Não lê nem altera nada da Shopee: recebe os cartões da Shopee já prontos e só decide a ordem na mesma grade.
// O link de cada categoria é usado EXATAMENTE como foi cadastrado (sem parâmetros extras) e abre em nova aba.
export const MODOS = { intercalado: 'Intercalado', shopee_primeiro: 'Shopee primeiro', ml_primeiro: 'Mercado Livre primeiro' };
export const MODO_PADRAO = 'intercalado';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const linkOk = u => { u = String(u ?? '').trim(); if (!/^https?:\/\/\S+$/i.test(u)) return false; try { const x = new URL(u); return /^https?:$/.test(x.protocol) && !!x.hostname; } catch (e) { return false; } };

// categorias ativas, na ordem do painel (se a tabela não existir ou falhar, devolve [] e a vitrine segue só com a Shopee)
export async function ativas(sb, limite) {
  try {
    let q = sb.from('categorias_mercado_livre').select('id,nome,descricao_curta,link,imagem_url,ordem').eq('ativo', true).order('ordem').order('created_at');
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) { console.warn('categorias Mercado Livre:', error.message); return []; }
    return (data || []).filter(c => c.nome && linkOk(c.link));
  } catch (e) { console.warn('categorias Mercado Livre:', e); return []; }
}
export async function modo(sb) {
  try { const { data } = await sb.from('configuracoes_vitrine').select('modo_exibicao').eq('id', 1).maybeSingle(); return MODOS[data?.modo_exibicao] ? data.modo_exibicao : MODO_PADRAO; }
  catch (e) { return MODO_PADRAO; }
}

// selos (iguais em todos os cartões da vitrine)
export const SELO_SHOPEE = '<span class="selo shp">Shopee</span>';
export const SELO_ML = '<span class="selo ml">Mercado Livre</span>';

// cartão do Mercado Livre: mesmo layout do cartão de categoria da Shopee (.cat); só muda o selo e o destino
export function cartao(c) {
  const nome = String(c.nome).trim(), d = String(c.descricao_curta || '').trim();
  const img = linkOk(c.imagem_url) ? `<img loading=lazy width=52 height=52 src="${esc(c.imagem_url)}" alt="">` : `<i aria-hidden=true>${esc(nome[0] || '?')}</i>`;
  return `<a class=cat href="${esc(c.link)}" target="_blank" rel="noopener noreferrer" data-ml="${esc(c.id)}"${d ? ` title="${esc(d)}"` : ''}>${img}${esc(nome)}${SELO_ML}<span class=sr> (Mercado Livre, abre em nova aba)${d ? ' — ' + esc(d) : ''}</span></a>`;
}

// colunas da grade .cats.mix (iguais ao css/style.css): celular 2, tablet 3, computador 4
export const colunas = () => matchMedia('(min-width:1000px)').matches ? 4 : matchMedia('(min-width:640px)').matches ? 3 : 2;

// monta a sequência de cartões. Cada item: {h: html, loja: 'shp'|'ml'}.
// intercalado: uma linha (n cartões) da Shopee, uma linha do Mercado Livre…; quando uma lista acaba, a outra segue até o fim.
// shopee_primeiro / ml_primeiro: bloco inteiro de uma loja e depois o da outra.
// Ao trocar de loja, o primeiro cartão começa sempre numa linha nova (classe nl) para as linhas não se misturarem.
export function mesclar(shp, ml, m, n) {
  const S = shp.map(h => ({ h, loja: 'shp' })), M = ml.map(h => ({ h, loja: 'ml' }));
  let seq;
  if (m === 'shopee_primeiro') seq = [...S, ...M];
  else if (m === 'ml_primeiro') seq = [...M, ...S];
  else { seq = []; for (let i = 0; i < Math.max(S.length, M.length); i += n) seq.push(...S.slice(i, i + n), ...M.slice(i, i + n)); }
  return seq.map((x, i) => ({ ...x, nl: i > 0 && seq[i - 1].loja !== x.loja }));
}
export const html = seq => seq.map(x => x.nl ? x.h.replace(/^<a class=cat /, '<a class="cat nl" ') : x.h).join('');

// grade mesclada que se refaz quando o número de colunas muda (girar o celular, redimensionar a janela)
export function grade(el, shp, ml, m) {
  let n = 0;
  const pinta = () => { const c = colunas(); if (c === n) return; n = c; el.innerHTML = html(mesclar(shp, ml, m, c)); };
  pinta();
  if (ml.length) ['(min-width:640px)', '(min-width:1000px)'].forEach(q => { const mq = matchMedia(q); mq.addEventListener ? mq.addEventListener('change', pinta) : mq.addListener(pinta); });
}

// faixa da página do produto: 2 a 4 categorias ativas (2 no celular, 4 no computador), pela ordem de exibição
// limite 6 (página inicial): mostra as 6 em todas as telas (2 por linha no celular, 3 a partir do tablet)
export async function faixa(sb, limite = 4) {
  const c = await ativas(sb, limite);
  if (c.length < 2) return '';
  return `<div class=sh><h2 id=mlf-t>Mais categorias para explorar</h2></div><div class="cats mix ${limite === 4 ? 'mlf' : 'mlf6'}">${c.map(cartao).join('')}</div>`;
}
