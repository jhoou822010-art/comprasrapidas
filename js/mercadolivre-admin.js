// Painel > CATEGORIAS MERCADO LIVRE. Carregado somente quando o administrador abre esta aba.
// Grava apenas nas tabelas novas categorias_mercado_livre e configuracoes_vitrine (supabase/11-categorias-mercado-livre.sql).
// Nada aqui lê ou altera as categorias, os produtos ou os links da Shopee.
import { MODOS, MODO_PADRAO, linkOk, cartao, SELO_SHOPEE, SELO_ML } from './mercadolivre.js';

const T = 'categorias_mercado_livre';
const NOME_MAX = 80, DESC_MAX = 200;
// compara nomes sem diferenciar maiúsculas, minúsculas, acentos e espaços extras
export const chave = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function panel(el, { sb, $, esc, run, up, dots, mi }) {
  const ler = async () => { const { data, error } = await sb.from(T).select('*').order('ordem').order('created_at'); if (error) throw error; return data || []; };
  const lerModo = async () => { const { data } = await sb.from('configuracoes_vitrine').select('modo_exibicao').eq('id', 1).maybeSingle(); return MODOS[data?.modo_exibicao] ? data.modo_exibicao : MODO_PADRAO; };
  let L = [], M = MODO_PADRAO;
  try { [L, M] = await Promise.all([ler(), lerModo()]); }
  catch (e) { el.innerHTML = `<h2>Categorias Mercado Livre</h2><div class=box><p class=note>Não foi possível ler as categorias (${esc(e.message || e)}). Confira se o arquivo supabase/11-categorias-mercado-livre.sql foi executado no Supabase.</p></div>`; return; }
  el.innerHTML = '<div id=mlp></div>'; const root = $('#mlp');
  // regrava a ordem 1, 2, 3… (só das linhas que mudaram)
  const renumera = async lista => { for (const [i, c] of lista.entries()) if (c.ordem !== i + 1) { const { error } = await sb.from(T).update({ ordem: i + 1 }).eq('id', c.id); if (error) throw error; } };
  const recarrega = async () => { L = await ler(); lista(); };
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

  const lista = () => {
    const at = L.filter(c => c.ativo).length;
    root.innerHTML = `<div class=hrow><h2>Categorias Mercado Livre</h2><button class=btn id=mln type=button>+ Nova categoria</button></div>
  <p class=note>Cada categoria é um cartão na página <b>Todas as categorias</b>, na mesma grade das categorias da Shopee, com o selo <b>Mercado Livre</b>. Ao tocar, o cliente abre o link cadastrado em uma nova aba. Não é preciso cadastrar produtos: o que você adicionar na vitrine do Mercado Livre aparece sozinho pelo link. ${L.length ? `<br>${at} de ${L.length} categoria(s) ativa(s) no site.` : ''}</p>
  <div class=box><h3 style="margin-top:0">Modo de exibição da vitrine</h3>
   <div role=radiogroup aria-label="Modo de exibição da vitrine">${Object.entries(MODOS).map(([k, n]) => `<label style="display:block;margin:6px 0"><input type=radio name=mlm value=${k} ${k === M ? 'checked' : ''}> <b>${n}</b> <small class=note>${k === 'intercalado' ? '— uma linha Shopee, uma linha Mercado Livre, alternando' : k === 'shopee_primeiro' ? '— todas as da Shopee e depois todas as do Mercado Livre' : '— todas as do Mercado Livre e depois todas as da Shopee'}</small></label>`).join('')}</div>
   <button class="btn sm" type=button id=mlms>Salvar modo</button> <small class=note id=mlmo>Modo atual: <b>${MODOS[M]}</b>. A mudança vale na hora para todos os visitantes.</small></div>
  <div id=mlf></div>
  ${L.length ? `<div class=lst>${L.map((c, i) => `<div class="box li"><div class=lih>${linkOk(c.imagem_url) ? `<img src="${esc(c.imagem_url)}" alt="" loading=lazy>` : '<span class=ph0></span>'}
   <div class=tt><b>${i + 1}. ${esc(c.nome)}</b><small>${c.ativo ? '<span class="chip ok">Ativa</span>' : '<span class=chip>Inativa</span>'} ${esc(host(c.link))}</small></div>
   <button class="btn alt sm" type=button data-up=${i} ${i ? '' : 'disabled'} aria-label="Subir ${esc(c.nome)}" title="Subir">↑</button><button class="btn alt sm" type=button data-dn=${i} ${i < L.length - 1 ? '' : 'disabled'} aria-label="Descer ${esc(c.nome)}" title="Descer">↓</button>
   <button class="btn sm" type=button data-ed=${i}>Editar</button>
   ${dots([mi(`data-tg=${i}`, c.ativo ? '⏸️ Desativar' : '▶️ Ativar'), `<a class=dmi role=menuitem href="${esc(c.link)}" target=_blank rel="noopener noreferrer">↗ Abrir link</a>`, mi(`data-del=${i}`, '🗑️ Excluir', 1)])}</div></div>`).join('')}</div>`
      : '<div class=box><p class=note style="margin:0">Nenhuma categoria do Mercado Livre cadastrada. Toque em “+ Nova categoria” para começar.</p></div>'}
  ${L.some(c => c.ativo) ? `<div class=box><h3>Prévia dos cartões</h3><div class="cats mix">${L.filter(c => c.ativo).map(cartao).join('')}</div></div>` : ''}`;
    $('#mln').onclick = () => form(-1);
    $('#mlms').onclick = () => run(async () => {
      const v = root.querySelector('input[name=mlm]:checked')?.value; if (!MODOS[v]) return;
      const { error } = await sb.from('configuracoes_vitrine').upsert({ id: 1, modo_exibicao: v }); if (error) throw error;
      M = await lerModo(); $('#mlmo').innerHTML = `Modo atual: <b>${MODOS[M]}</b>. Salvo ✓ — já vale para todos os visitantes.`;
    });
    root.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => form(+b.dataset.ed));
    root.querySelectorAll('[data-up],[data-dn]').forEach(b => b.onclick = () => run(async () => {
      const i = +(b.dataset.up ?? b.dataset.dn), j = b.dataset.up != null ? i - 1 : i + 1; if (j < 0 || j >= L.length) return;
      const nv = [...L];[nv[i], nv[j]] = [nv[j], nv[i]]; await renumera(nv); await recarrega();
    }));
    root.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => run(async () => {
      const c = L[+b.dataset.tg];
      if (!confirm(c.ativo ? `Desativar “${c.nome}”? Ela deixa de aparecer no site (não é apagada).` : `Ativar “${c.nome}”? Ela passa a aparecer no site.`)) return;
      const { error } = await sb.from(T).update({ ativo: !c.ativo }).eq('id', c.id); if (error) throw error; await recarrega();
    }));
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => run(async () => {
      const c = L[+b.dataset.del];
      if (!confirm(`Excluir a categoria do Mercado Livre “${c.nome}” definitivamente?\n(Nenhuma categoria ou produto da Shopee é alterado.)`)) return;
      const { error } = await sb.from(T).delete().eq('id', c.id); if (error) throw error;
      L = await ler(); await renumera(L); await recarrega();
    }));
  };

  // formulário de cadastro/edição (i = -1: nova categoria)
  const form = i => {
    const c = i >= 0 ? { ...L[i] } : { nome: '', link: '', descricao_curta: '', imagem_url: '', ativo: true };
    const f = $('#mlf');
    f.innerHTML = `<div class=box><h3>${i >= 0 ? 'Editar categoria do Mercado Livre' : 'Nova categoria do Mercado Livre'}</h3>
   <label>Nome da categoria*<input id=mfn maxlength=${NOME_MAX} value="${esc(c.nome)}" placeholder="Ex.: Celulares"></label>
   <p id=mfw class=note role=status style="color:#a15c00;margin:-4px 0 8px"></p>
   <label>Link da categoria no Mercado Livre* (http:// ou https://)<input id=mfu type=url inputmode=url autocomplete=off spellcheck=false value="${esc(c.link)}" placeholder="https://..."><small class=note>Cole o link exatamente como está na sua vitrine do Mercado Livre. Ele é salvo e aberto sem nenhuma alteração.</small></label>
   <label>Descrição curta <small class=note>(<span id=mfc>${String(c.descricao_curta || '').length}</span>/${DESC_MAX})</small><textarea id=mfd maxlength=${DESC_MAX} style="min-height:64px" placeholder="Ex.: Smartphones e acessórios">${esc(c.descricao_curta || '')}</textarea></label>
   <label>Foto de apresentação — endereço da imagem (https://)<input id=mfi type=url inputmode=url autocomplete=off value="${esc(c.imagem_url || '')}" placeholder="https://..."><small class=note>Recomendado: colar o endereço de uma imagem não ocupa armazenamento.</small></label>
   <label>…ou enviar um arquivo (opcional; a foto é comprimida antes do envio)<input id=mff type=file accept="image/png,image/jpeg,image/webp"></label>
   <div id=mfp style="margin:6px 0 10px"></div>
   <div class=row><label>Posição na lista (1 = primeira)<input id=mfo type=number min=1 max=${L.length + (i >= 0 ? 0 : 1)} step=1 value="${i >= 0 ? i + 1 : L.length + 1}"></label>
   <label style="align-self:end"><input type=checkbox id=mfa ${c.ativo ? 'checked' : ''}> Categoria ativa (aparece no site)</label></div>
   <p id=mfe class=note role=alert style="color:#c62f3f;white-space:pre-line"></p>
   <button class=btn type=button id=mfs>Salvar</button> <button class="btn alt" type=button id=mfk>Cancelar</button></div>`;
    f.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); $('#mfn').focus({ preventScroll: true });
    // nome repetido (só entre as categorias do Mercado Livre)
    const repetida = () => { const k = chave($('#mfn').value); return k ? L.find((x, k2) => k2 !== i && chave(x.nome) === k) : null; };
    const aviso = () => { const r = repetida(); $('#mfw').textContent = r ? `⚠️ Já existe uma categoria do Mercado Livre chamada “${r.nome}”.` : ''; };
    $('#mfn').oninput = aviso; aviso();
    // prévia da foto (endereço ou arquivo escolhido), no mesmo cartão da vitrine
    let blob = '';
    const previa = () => {
      const file = $('#mff').files[0]; if (blob) { URL.revokeObjectURL(blob); blob = ''; }
      const src = file ? (blob = URL.createObjectURL(file)) : $('#mfi').value.trim();
      const nome = $('#mfn').value.trim() || 'Nome da categoria';
      const img = src && (file || linkOk(src)) ? `<img width=52 height=52 src="${esc(src)}" alt="">` : `<i aria-hidden=true>${esc(nome[0])}</i>`;
      $('#mfp').innerHTML = `<small class=note>Prévia (ao lado de um cartão da Shopee):</small><div class="cats mix" style="max-width:420px;margin-top:4px"><span class=cat>${img}${esc(nome)}${SELO_ML}</span><span class=cat style="opacity:.55" aria-hidden=true><i>S</i>Categoria Shopee${SELO_SHOPEE}</span></div>`;
    };
    ['mfi', 'mfn'].forEach(id => $('#' + id).addEventListener('input', previa)); $('#mff').onchange = previa; previa();
    $('#mfd').oninput = e => $('#mfc').textContent = e.target.value.length;
    $('#mfk').onclick = () => { f.innerHTML = ''; };
    $('#mfs').onclick = () => run(async () => {
      const b = $('#mfs'), file = $('#mff').files[0];
      const d = { nome: $('#mfn').value.trim().replace(/\s+/g, ' '), link: $('#mfu').value.trim(), descricao_curta: $('#mfd').value.trim() || null, imagem_url: $('#mfi').value.trim() || null, ativo: $('#mfa').checked };
      const e = [];
      if (!d.nome) e.push('Informe o nome da categoria.');
      if (!d.link) e.push('Informe o link da categoria no Mercado Livre.'); else if (!linkOk(d.link)) e.push('Link inválido: ele precisa começar com http:// ou https:// (ex.: https://www.mercadolivre.com.br/...).');
      if (!file && d.imagem_url && !linkOk(d.imagem_url)) e.push('Endereço da imagem inválido: use um endereço começando com http:// ou https://, ou envie um arquivo.');
      if (file && !/^image\/(png|jpeg|webp)$/.test(file.type)) e.push('Envie uma imagem PNG, JPG ou WebP.');
      $('#mfe').textContent = e.join('\n'); if (e.length) return;
      const r = repetida();
      if (r && !confirm(`Já existe uma categoria do Mercado Livre chamada “${r.nome}”.\nDeseja salvar mesmo assim com o nome “${d.nome}”?`)) return;
      b.disabled = true; b.textContent = 'Salvando…';
      try {
        if (file) d.imagem_url = await up(file);
        let id = c.id;
        if (i >= 0) { const { error } = await sb.from(T).update(d).eq('id', id); if (error) throw error; }
        else { const { data, error } = await sb.from(T).insert({ ...d, ordem: L.length + 1 }).select('id').single(); if (error) throw error; id = data.id; }
        // posição escolhida
        const atual = await ler(), resto = atual.filter(x => x.id !== id), eu = atual.find(x => x.id === id);
        const pos = Math.min(Math.max(1, Math.round(+$('#mfo').value) || resto.length + 1), resto.length + 1);
        resto.splice(pos - 1, 0, eu); await renumera(resto);
        if (blob) URL.revokeObjectURL(blob);
        await recarrega(); alert(i >= 0 ? 'Categoria atualizada.' : 'Categoria cadastrada.');
      } finally { b.disabled = false; b.textContent = 'Salvar'; }
    });
  };
  lista();
}
