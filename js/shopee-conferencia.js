// Painel › Operações › CONFERÊNCIA SHOPEE: liga/desliga o robô que confere os produtos da Shopee, "Rodar agora",
// histórico das rodadas e listas do que mudou. Carregado só quando o administrador abre esta aba.
// Grava apenas: a chave "shopee_sync" de cr_site_settings.data (as outras configurações são preservadas) e,
// no botão "Conferido", a marca shopee_conferir do produto. Quem altera preços e status é a função shopee-sync.
import { cfgSync } from '../supabase/functions/shopee-sync/regras.js';

const HORAS = [2, 4, 6, 8, 12, 24];
const money = (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const quando = (t) => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const nz = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const linkShopee = (p) => p?.shopee_shop_id && p?.shopee_item_id ? `https://shopee.com.br/product/${p.shopee_shop_id}/${p.shopee_item_id}` : (/^https:\/\//.test(p?.affiliate_url || '') ? p.affiliate_url : '');
const LISTAS = { saiu: 'Saíram da vitrine', voltou: 'Voltaram', preco: 'Preço mudou', conferir: 'Conferir (mudou mais de 50%)', sem: 'Sem código da Shopee' };
const SQL = '<p class=note>Ainda não instalado: rode uma vez o arquivo <b>sql/shopee_sync.sql</b> no Supabase (SQL Editor) e publique a função <b>shopee-sync</b>.</p>';

export async function panel(el, { sb, $, esc, run, editar }) {
  const getSet = async () => (await sb.from('cr_site_settings').select('data').eq('id', 1).maybeSingle()).data?.data || {};
  const cur = await getSet(), c = cfgSync(cur);
  let aba = 'saiu', filtro = '';
  el.innerHTML = `<h2>Conferência Shopee</h2>
  <div class=box><p class=note style="margin-top:0">O robô consulta a Shopee (API de afiliados) e atualiza <b>preço, preço original, desconto, foto, comissão e link de oferta</b>
   dos produtos da loja Shopee. <b>Nunca</b> muda nome, descrição ou categoria e <b>nunca apaga</b> produto. Se um produto não aparecer em 2 conferências seguidas,
   ele sai da vitrine (fica inativo) e volta sozinho quando reaparecer — menos os que você desativou à mão.</p>
   <label style="display:flex;gap:10px;align-items:center;font-weight:600"><input type=checkbox id=scon ${c.on ? 'checked' : ''} style="width:22px;height:22px"> Robô ligado</label>
   <div class=row><label>Conferir cada produto a cada<select id=scH>${HORAS.map((h) => `<option value=${h} ${h === c.horas ? 'selected' : ''}>${h} horas</option>`).join('')}</select></label></div>
   <p><button class=btn id=scsv>Salvar</button> <button class="btn alt" id=scgo>Rodar agora</button></p>
   <p class=note>“Rodar agora” confere até ${c.max_por_vez} produtos por vez (os que estão há mais tempo sem conferir). Com o robô ligado, ele continua sozinho, em partes, até conferir todos.</p>
   <div id=scres></div></div>
  <div class=box><h3>Rodadas</h3><div id=scruns><p class=note>Carregando…</p></div></div>
  <div class=box><h3>Produtos</h3><div class=row style="align-items:end"><label style="flex:2 1 260px">Lista<select id=scab>${Object.entries(LISTAS).map(([k, n]) => `<option value=${k}>${n}</option>`).join('')}</select></label>
   <label style="flex:1 1 200px">Filtrar pelo nome<input id=scf placeholder="Digite parte do nome"></label></div><div id=sclist><p class=note>Carregando…</p></div></div>`;

  $('#scsv').onclick = () => run(async () => {
    const atual = await getSet(), v = { ...(atual.shopee_sync || {}), on: $('#scon').checked, horas: +$('#scH').value };
    const { error } = await sb.from('cr_site_settings').upsert({ id: 1, data: { ...atual, shopee_sync: v } });
    if (error) throw error;
    alert(v.on ? `Robô ligado: cada produto é conferido a cada ${v.horas} horas.` : 'Robô desligado.');
  });
  $('#scgo').onclick = () => run(async () => {
    const b = $('#scgo'); b.disabled = true; b.textContent = 'Conferindo… (pode levar até 2 minutos)';
    try {
      const { data, error } = await sb.functions.invoke('shopee-sync', { body: { mode: 'manual' } });
      let j = data;
      if (error) { try { j = await error.context.json(); } catch (_) { j = { error: error.message }; } }
      $('#scres').innerHTML = j?.error || j?.erro
        ? `<p class="bkn" style="border-color:#efc3c8"><span><b>Não funcionou:</b> ${esc(j.error || j.erro)}</span></p>`
        : j?.skipped ? `<p class=bkn><span>${esc(j.skipped)}</span></p>`
        : `<p class="bkn ok"><span>Conferidos <b>${j.verificados}</b> · atualizados <b>${j.atualizados}</b> · saíram <b>${j.desativados}</b> · voltaram <b>${j.reativados}</b>${j.faltam ? ` · faltam ${j.faltam} (rode de novo ou deixe o robô ligado)` : ''}</span></p>`;
    } finally { b.disabled = false; b.textContent = 'Rodar agora'; }
    await rodadas(); await lista();
  });
  $('#scab').onchange = (e) => { aba = e.target.value; run(lista); };
  $('#scf').oninput = (e) => { filtro = e.target.value; desenhar(); };

  async function rodadas() {
    const { data, error } = await sb.from('cr_shopee_sync_runs').select('*').order('inicio', { ascending: false }).limit(20);
    if (error) { $('#scruns').innerHTML = SQL; return; }
    const u = data?.[0];
    $('#scruns').innerHTML = !u ? '<p class=note>Nenhuma rodada ainda.</p>' :
      `<p><b>Última:</b> ${quando(u.inicio)} · ${u.origem === 'manual' ? 'Rodar agora' : 'automática'} · ${u.status === 'ok' ? '✅ ok' : u.status === 'rodando' ? '⏳ rodando' : '❌ falhou'} ·
       ${u.verificados} conferidos, ${u.atualizados} atualizados, ${u.desativados} saíram, ${u.reativados} voltaram${u.erros ? `, ${u.erros} erro(s)` : ''}</p>
       ${u.erro ? `<p class=note style="color:var(--dng,#c62f3f)">${esc(u.erro)}</p>` : ''}
       <div class=tbx><table class=lt><thead><tr><th>Início<th>Tipo<th>Situação<th>Conferidos<th>Atualizados<th>Saíram<th>Voltaram<th>Erros</tr></thead><tbody>
       ${data.map((r) => `<tr><td>${quando(r.inicio)}</td><td>${r.origem === 'manual' ? 'manual' : 'automática'}</td><td title="${esc(r.erro || '')}">${r.status === 'ok' ? 'ok' : r.status === 'rodando' ? 'rodando' : 'falhou'}</td><td>${r.verificados}</td><td>${r.atualizados}</td><td>${r.desativados}</td><td>${r.reativados}</td><td>${r.erros}</td></tr>`).join('')}
       </tbody></table></div>`;
  }

  let itens = [];
  async function lista() {
    const box = $('#sclist'), PSEL = 'id,name,status,price,affiliate_url,shopee_shop_id,shopee_item_id,shopee_status';
    let r;
    if (aba === 'sem') r = await sb.from('cr_products').select(PSEL).eq('shopee_status', 'sem_codigo').order('name').limit(500);
    else if (aba === 'conferir') r = await sb.from('cr_products').select(PSEL + ',shopee_last_check').eq('shopee_conferir', true).order('name').limit(500);
    else r = await sb.from('cr_shopee_sync_log').select(`id,em,tipo,preco_antes,preco_depois,detalhe,product_id,products:cr_products(${PSEL})`).eq('tipo', aba).order('em', { ascending: false }).limit(300);
    if (r.error) { box.innerHTML = SQL; itens = []; return; }
    itens = (r.data || []).map((x) => x.products !== undefined ? { ...x, p: x.products } : { p: x });
    desenhar();
  }
  function desenhar() {
    const box = $('#sclist'), f = nz(filtro.trim()), vis = itens.filter((x) => !f || nz(x.p?.name).includes(f));
    if (!vis.length) { box.innerHTML = `<p class=note>${itens.length ? 'Nada com esse nome.' : 'Nada nesta lista.'}</p>`; return; }
    box.innerHTML = `<p class=note>${vis.length} item(ns)</p><div class=tbx><table class=lt><thead><tr><th>Produto<th>O que aconteceu<th></tr></thead><tbody>
     ${vis.map((x, i) => { const p = x.p || {}, sh = linkShopee(p);
       const oque = aba === 'sem' ? 'Link curto: o código do item não aparece no link. Troque pelo link completo do produto para o robô conferir.'
         : aba === 'conferir' ? `Preço atual ${money(p.price)} — mudou mais de 50% na conferência. Veja se está certo.`
         : `${quando(x.em)} · ${x.tipo === 'preco' || x.tipo === 'conferir' ? `${money(x.preco_antes)} → ${money(x.preco_depois)}` : esc(x.detalhe || '')}`;
       return `<tr><td>${esc(p.name || '(produto apagado)')}${p.status === 'inactive' ? ' <small class=note>(inativo)</small>' : ''}</td><td><small>${oque}</small></td>
        <td style="white-space:nowrap">${p.id ? `<button class="btn alt sm" data-ed="${esc(p.id)}">Editar</button>` : ''} ${sh ? `<a class="btn alt sm" href="${esc(sh)}" target=_blank rel=noopener>Abrir na Shopee ↗</a>` : ''}
        ${aba === 'conferir' ? ` <button class="btn sm" data-ok="${esc(p.id)}">Conferido</button>` : ''}</td></tr>`; }).join('')}
     </tbody></table></div>`;
    box.querySelectorAll('[data-ed]').forEach((b) => b.onclick = () => editar(b.dataset.ed));
    box.querySelectorAll('[data-ok]').forEach((b) => b.onclick = () => run(async () => {
      const { error } = await sb.from('cr_products').update({ shopee_conferir: false }).eq('id', b.dataset.ok);
      if (error) throw error;
      await lista();
    }));
  }
  await Promise.all([rodadas(), lista()]);
}
