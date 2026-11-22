// VEJA TAMBÉM — MAIS PRODUTOS: lojas parceiras (painel › Vitrine › Lojas Parceiras).
// Os dados ficam na chave "lojas_parceiras" de cr_site_settings.data (sem tabela nova):
//   {itens:[{id,nome,url,desc,img,ativo,ordem}], saved_at}
// Usado pela página inicial (seção pública) e pelo painel (validação e prévia). Não mexe em produtos.
export const NOME_MAX = 60, DESC_MAX = 140, URL_MAX = 2000;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// endereço externo seguro: só https://, com domínio de verdade e sem usuário/senha embutidos.
// O link é guardado e usado exatamente como foi digitado (só os espaços das pontas são tirados).
export function urlOk(u) {
  u = String(u ?? '').trim();
  if (!u || u.length > URL_MAX || /\s/.test(u) || !/^https:\/\//i.test(u)) return false;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && !x.username && !x.password && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(x.hostname) && !/^\d+(\.\d+){3}$/.test(x.hostname);
  } catch (e) { return false; }
}

// confere uma loja antes de salvar; devolve a lista de problemas (vazia = pode salvar)
export function validar(l) {
  const e = [];
  const nome = String(l?.nome ?? '').trim();
  if (!nome) e.push('Informe o nome da loja.');
  else if (nome.length > NOME_MAX) e.push(`O nome pode ter até ${NOME_MAX} caracteres.`);
  if (!String(l?.url ?? '').trim()) e.push('Informe o link de afiliado.');
  else if (!urlOk(l.url)) e.push('Link de afiliado inválido: use um endereço completo começando com https:// (ex.: https://loja.com/...).');
  if (String(l?.desc ?? '').trim().length > DESC_MAX) e.push(`A descrição pode ter até ${DESC_MAX} caracteres.`);
  if (String(l?.img ?? '').trim() && !urlOk(l.img)) e.push('Endereço da imagem inválido: use https:// ou envie um arquivo.');
  return e;
}

// lê a configuração salva (tolerante a dados antigos ou incompletos) e ordena por "ordem"
export function lojas(S) {
  const raw = Array.isArray(S?.lojas_parceiras?.itens) ? S.lojas_parceiras.itens : [];
  return raw.filter(x => x && typeof x === 'object').map((x, i) => ({
    id: String(x.id || 'lp' + i), nome: String(x.nome ?? '').trim(), url: String(x.url ?? '').trim(),
    desc: String(x.desc ?? '').trim(), img: String(x.img ?? '').trim(), ativo: x.ativo === true,
    ordem: Number.isFinite(+x.ordem) ? +x.ordem : i + 1,
  })).map((x, i) => ({ ...x, _i: i })).sort((a, b) => a.ordem - b.ordem || a._i - b._i).map(({ _i, ...x }) => x);
}

// o que o cliente vê: só lojas ativas, com nome e link válidos
export const visiveis = S => lojas(S).filter(l => l.ativo && l.nome && urlOk(l.url));

const EXT = '<svg aria-hidden=true width=16 height=16 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.2 stroke-linecap=round stroke-linejoin=round><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

// cartão de uma loja: abre o link cadastrado numa nova aba, com noopener e noreferrer
export function cartao(l) {
  const logo = urlOk(l.img) ? `<img src="${esc(l.img)}" alt="" loading=lazy width=64 height=64>` : `<i aria-hidden=true>${esc((l.nome[0] || '?').toUpperCase())}</i>`;
  return `<a class=lpc href="${esc(l.url)}" target=_blank rel="noopener noreferrer" data-lp="${esc(l.id)}">${logo}<span class=lpn><b>${esc(l.nome)}</b>${l.desc ? `<small>${esc(l.desc)}</small>` : ''}</span><span class=lpg>Ir para a loja ${EXT}<span class=sr> (abre em nova aba)</span></span></a>`;
}

// seção completa (banner que abre/fecha a lista de lojas). Sem lojas visíveis, não mostra nada.
export function secao(S, { aberta = false } = {}) {
  const v = visiveis(S);
  if (!v.length) return '';
  return `<button type=button class=lpb id=lpb aria-expanded=${aberta} aria-controls=lpl>
 <span class=lpk>Veja também</span><span class=lpt>Mais produtos</span>
 <span class=lpd>Não encontrou o que procura? Explore também nossas lojas parceiras e descubra milhares de outros produtos e ofertas.</span>
 <span class=lpa><span data-lbl>${aberta ? 'Ocultar lojas parceiras' : 'Ver lojas parceiras'}</span> <svg class=lpv aria-hidden=true width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.6 stroke-linecap=round stroke-linejoin=round><path d="m6 9 6 6 6-6"/></svg></span></button>
 <div id=lpl class=lpl${aberta ? '' : ' hidden'}><div class=lpw>${v.map(cartao).join('')}</div>
 <p class=lpo>Os links abrem em uma nova aba e esta página continua aberta. A compra é finalizada na loja parceira.</p></div>`;
}

// liga o botão do banner (abre/fecha a lista)
export function ligar(root) {
  const b = root.querySelector('#lpb'), l = root.querySelector('#lpl');
  if (!b || !l) return;
  b.onclick = () => {
    const o = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', o); l.hidden = !o;
    b.querySelector('[data-lbl]').textContent = o ? 'Ocultar lojas parceiras' : 'Ver lojas parceiras';
    if (o) l.querySelector('.lpc')?.focus({ preventScroll: true });
  };
}
