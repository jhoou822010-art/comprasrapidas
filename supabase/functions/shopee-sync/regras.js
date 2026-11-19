// Regras do robô de conferência da Shopee (sem dependências: usadas pela função shopee-sync e pelos testes).
// API: Shopee Affiliate Open API (GraphQL), consulta productOfferV2 — um item por consulta; várias consultas vão
// no mesmo pedido com apelidos (p0, p1, ...). A Shopee não informa "preço original": ele é calculado pelo desconto.

export const PADRAO = { on: false, horas: 6, lote: 5, pausa_ms: 1200, max_por_vez: 200 };
export const LIMITE_CONFERIR = 0.5; // preço mudou mais de 50%: atualiza, mas marca para conferir

const num = (v, d, a, b) => { const n = Number(v); return v === '' || v == null || !isFinite(n) ? d : Math.min(b, Math.max(a, n)); };
export function cfgSync(S) {
  const o = S && typeof S.shopee_sync === 'object' && S.shopee_sync ? S.shopee_sync : {};
  return {
    on: o.on === true,
    horas: num(o.horas, PADRAO.horas, 1, 48),
    lote: Math.round(num(o.lote, PADRAO.lote, 1, 10)),
    pausa_ms: Math.round(num(o.pausa_ms, PADRAO.pausa_ms, 300, 10000)),
    max_por_vez: Math.round(num(o.max_por_vez, PADRAO.max_por_vez, 10, 500)),
  };
}

// ---- assinatura: SHA256(AppId + Timestamp + corpo do pedido + Secret), em hexadecimal
export async function assinar(appId, ts, corpo, secret) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${appId}${ts}${corpo}${secret}`));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}
export const cabecalho = (appId, ts, sig) => `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${sig}`;

const soDigitos = (v) => /^\d{1,20}$/.test(String(v ?? '')) ? String(v) : null;
const CAMPOS = 'itemId shopId productName priceMin priceMax priceDiscountRate commissionRate imageUrl offerLink productLink';
// itens: [{ item, loja }] → consulta com um apelido por item
export function montarConsulta(itens) {
  const partes = itens.map((x, i) => {
    const it = soDigitos(x.item), lj = soDigitos(x.loja);
    if (!it) throw new Error('Código de item inválido');
    return `p${i}: productOfferV2(itemId: ${it}${lj ? `, shopId: ${lj}` : ''}, limit: 1) { nodes { ${CAMPOS} } }`;
  });
  return `query { ${partes.join(' ')} }`;
}

export class ErroApi extends Error {}
// resposta da Shopee → lista na mesma ordem dos itens (oferta ou null = não voltou)
// Erro geral (HTTP, assinatura, limite, fora do ar) → ErroApi: a rodada para e NADA é desativado.
export function lerResposta(status, corpo, itens) {
  if (status < 200 || status >= 300) throw new ErroApi(`A Shopee respondeu HTTP ${status}`);
  if (!corpo || typeof corpo !== 'object') throw new ErroApi('Resposta da Shopee vazia ou inválida');
  const errs = Array.isArray(corpo.errors) ? corpo.errors : [];
  if (errs.length) {
    const e = errs[0] || {}, cod = e.extensions?.code ?? e.code ?? '';
    throw new ErroApi(`Shopee: ${cod ? cod + ' ' : ''}${String(e.message || 'erro na consulta').slice(0, 200)}`);
  }
  const d = corpo.data;
  if (!d || typeof d !== 'object') throw new ErroApi('Resposta da Shopee sem dados');
  return itens.map((x, i) => {
    const nodes = d[`p${i}`]?.nodes;
    if (!Array.isArray(nodes)) throw new ErroApi('Resposta da Shopee em formato inesperado');
    return nodes.find((n) => String(n.itemId) === String(x.item)) || null;
  });
}

const r2 = (v) => Math.round(v * 100) / 100;
const difere = (a, b) => (a == null || b == null) ? (a == null) !== (b == null) : Math.abs(+a - +b) > 0.009;
const CDN = /^https:\/\/([a-z0-9-]+\.)*(susercontent\.com|shopee\.com\.br|shopee\.com|shopeemobile\.com)\//i;
const linkOk = (u) => /^https:\/\/([a-z0-9-]+\.)*(shopee\.com\.br|shope\.ee)\//i.test(u || '');
// o link atual já aponta para este mesmo item? (então não é trocado, mesmo que o formato seja outro)
export const linkDoItem = (u, loja, item) => !!u && !!item && (
  new RegExp(`product(%2F|/)${loja}(%2F|/)${item}(\\D|$)`, 'i').test(u) || new RegExp(`-i\\.${loja}\\.${item}(\\D|$)`).test(u));

// Decide o que muda num produto. p = linha de cr_products (+ capa: url da foto de capa ou null).
// Retorna { patch (colunas de cr_products), foto (nova url de capa ou null), logs [], conta { atualizado, desativado, reativado } }
export function decidir(p, oferta, agora = new Date().toISOString()) {
  const patch = { shopee_last_check: agora }, logs = [], conta = { atualizado: false, desativado: false, reativado: false };
  let foto = null;
  if (!oferta) {
    const miss = (p.shopee_miss_count || 0) + 1;
    patch.shopee_miss_count = miss;
    if (miss >= 2 && p.status === 'active') {            // 2 rodadas seguidas sem aparecer: sai da vitrine (nunca apaga)
      patch.status = 'inactive'; patch.shopee_status = 'desativado_robo'; conta.desativado = true;
      logs.push({ tipo: 'saiu', detalhe: `Não apareceu na Shopee em ${miss} conferências seguidas` });
    } else if (p.shopee_status !== 'desativado_robo') {
      patch.shopee_status = 'sumiu';
      if (miss === 1) logs.push({ tipo: 'sumiu', detalhe: 'Não apareceu nesta conferência (sai só se faltar de novo)' });
    }
    return { patch, foto, logs, conta };
  }
  // voltou / continua lá
  if (p.shopee_miss_count) patch.shopee_miss_count = 0;
  if (p.status !== 'active' && p.shopee_status === 'desativado_robo') {   // só reativa o que o robô desativou
    patch.status = 'active'; patch.shopee_status = 'ok'; conta.reativado = true;
    logs.push({ tipo: 'voltou', detalhe: 'Voltou à Shopee: reativado' });
  } else if (p.shopee_status === 'sumiu' || p.shopee_status === 'desativado_robo') {
    patch.shopee_status = 'ok';
    logs.push({ tipo: 'voltou', detalhe: p.status === 'active' ? 'Voltou à Shopee' : 'Voltou à Shopee (continua desativado: foi desativado à mão)' });
  } else if (p.shopee_status !== 'ok') patch.shopee_status = 'ok';
  // preço (preço mínimo), preço máximo e preço original (pelo desconto)
  const novo = +oferta.priceMin;
  if (novo > 0) {
    const max = +oferta.priceMax > novo ? r2(+oferta.priceMax) : null, des = +oferta.priceDiscountRate || 0;
    const orig = des > 0 && des < 100 ? r2(novo / (1 - des / 100)) : null, preco = r2(novo);
    if (difere(p.price, preco)) {
      patch.price = preco; conta.atualizado = true;
      logs.push({ tipo: 'preco', preco_antes: p.price ?? null, preco_depois: preco });
      if (+p.price > 0 && Math.abs(preco - +p.price) / +p.price > LIMITE_CONFERIR) {
        patch.shopee_conferir = true;
        logs.push({ tipo: 'conferir', preco_antes: p.price, preco_depois: preco, detalhe: 'Preço mudou mais de 50%: confira' });
      }
    }
    if (difere(p.price_max, max)) { patch.price_max = max; conta.atualizado = true; }
    if (difere(p.old_price, orig) && !(orig == null && p.old_price != null && +p.old_price <= preco)) { patch.old_price = orig; conta.atualizado = true; }
  }
  // comissão (taxa, ex.: 0.07 = 7%)
  const com = oferta.commissionRate != null && oferta.commissionRate !== '' && isFinite(+oferta.commissionRate) ? +oferta.commissionRate : null;
  if (com != null && difere(p.shopee_commission_rate, com)) {
    patch.shopee_commission_rate = com;
    if (p.shopee_commission_rate != null) { conta.atualizado = true; logs.push({ tipo: 'comissao', detalhe: `Comissão ${(+p.shopee_commission_rate * 100).toFixed(1)}% → ${(com * 100).toFixed(1)}%` }); }
  }
  // link de oferta: troca só se o link atual NÃO for deste mesmo item (link quebrado/errado); link certo em outro formato fica
  const ol = oferta.offerLink;
  if (linkOk(ol) && ol !== p.affiliate_url && !linkDoItem(p.affiliate_url, p.shopee_shop_id, p.shopee_item_id)) {
    patch.affiliate_url = ol; conta.atualizado = true; logs.push({ tipo: 'link', detalhe: 'Link de oferta atualizado' });
  }
  // foto: só troca a capa se ela for foto da própria Shopee (foto enviada por você fica); sem capa, coloca a da Shopee
  const im = oferta.imageUrl;
  if (CDN.test(im || '') && im !== p.capa && (!p.capa || CDN.test(p.capa))) {
    foto = im; conta.atualizado = true; logs.push({ tipo: 'foto', detalhe: p.capa ? 'Foto de capa atualizada' : 'Foto de capa adicionada' });
  }
  return { patch, foto, logs, conta };
}
