// GUIA DA LOJA (mascote) — componente isolado. Carregado só depois que a página termina de carregar (index.html).
// Tudo dentro de try/catch: se algo falhar, o guia some e a loja continua normal.
//
// Primeira visita: tour completo. Visitas seguintes: ela entra pelo canto, acena e pergunta se pode ajudar
// (sem escurecer a página); some sozinha depois de CONFIG.espera segundos. "Quero ajuda" abre um menu de atalhos.
// Guardado no aparelho (localStorage): cr_guia_visto = já viu o tour; cr_guia_off = cliente desligou o guia.
// Textos e etapas: js/tour/etapas.js · Personagem: js/tour/personagem.js
import { S, pushOk, pushSubscribe, pushSyncProfile, isIOS, isStandalone } from '../app.js';
import { ETAPAS, CONFIG } from './etapas.js';
import { IMAGENS, TAMANHO, SVG } from './personagem.js';
import * as PERS from './personagem.js';
const MG = { cima: 0, baixo: 0, lados: 0, ...(PERS.MARGEM || {}) };
const NOME = PERS.NOME || 'guia', ROSTO = PERS.ROSTO || '', PASSOS = PERS.PASSOS || [];

const K_VISTO = 'cr_guia_visto', K_OFF = 'cr_guia_off', K_SESSAO = 'cr_guia_sessao';
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
const calmo = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const saudacao = () => { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const fmt = (s) => String(s ?? '').replace(/\{saudacao\}/g, saudacao()).replace(/\{nome\}/g, escHtml(NOME));
const T = new Proxy(CONFIG.textos, { get: (o, k) => fmt(o[k] ?? '') });

export const ligadoNoSite = () => S?.tour?.on !== false;          // chave "Guia ligado" do painel (Aparência)
export const desligado = () => ls.get(K_OFF) === '1';               // o próprio cliente desligou
export function desligar(v = true) {
  ls.set(K_OFF, v ? '1' : null);
  try { CONFIG.perfil.salvar({ visto: ls.get(K_VISTO) === '1', desligado: v }); } catch (e) {}
  if (v && atual) atual.sumir();
  avisarRodape();
}
function avisarRodape() { try { dispatchEvent(new CustomEvent('cr-guia-estado')); } catch (e) {} }
export function salvarPerfil() { try { CONFIG.perfil.salvar({ visto: ls.get(K_VISTO) === '1', desligado: desligado() }); } catch (e) {} }
function marcarVisto() { ls.set(K_VISTO, '1'); try { CONFIG.perfil.salvar({ visto: true, desligado: desligado() }); } catch (e) {} }

let css = null, atual = null;
function carregarCss() {
  if (css) return css;
  css = new Promise((ok) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./tour.css', import.meta.url).href; l.onload = ok; l.onerror = ok; document.head.appendChild(l); setTimeout(ok, 1500); });
  return css;
}

// ---------- ponto de entrada (index.html chama depois do carregamento)
export async function iniciar() {
  try {
    if (!ligadoNoSite() || desligado()) return;
    const perfil = await Promise.resolve(CONFIG.perfil.carregar()).catch(() => null);
    if (perfil?.desligado) { ls.set(K_OFF, '1'); return; }
    if (perfil?.visto) ls.set(K_VISTO, '1');
    const g = new URLSearchParams(location.search).get('guia');
    if (g === '1') return abrir();
    if (g === 'ajuda') return ajudar();
    // a página sempre abre clara: na primeira visita ela só cumprimenta e pergunta (o tour completo abre se o cliente pedir)
    if (ss.get(K_SESSAO)) return;                                     // já cumprimentou nesta visita
    ss.set(K_SESSAO, '1');
    return visitaRapida();
  } catch (e) { console.warn('guia', e); limpar(); }
}
// tour completo ("Fazer o tour completo" e ?guia=1)
export async function abrir() {
  try {
    if (!ligadoNoSite()) return;
    if (atual?.modo === 'tour') return;
    const m = atual && atual.modo === 'visita' ? atual : await montar();
    m.modo = 'tour'; atual = m;
    await m.tour();
  } catch (e) { console.warn('guia', e); limpar(); }
}
// menu de atalhos ("Chamar a Karol" no rodapé)
export async function ajudar() {
  try {
    if (!ligadoNoSite()) return;
    if (atual?.modo === 'tour') return;
    const m = atual && atual.modo === 'visita' ? atual : await montar();
    m.modo = 'visita'; atual = m;
    await m.ajuda();
  } catch (e) { console.warn('guia', e); limpar(); }
}

// aviso ao sair para a loja parceira (botões "Ver oferta na …" da página do produto).
// Se o guia estiver desligado (painel ou cliente) ou algo falhar, segue direto para a loja, como antes.
export async function saida(url, loja) {
  const ir = () => { try { location.href = url; } catch (e) {} };
  try {
    if (!ligadoNoSite() || desligado() || !/^https?:\/\//i.test(url || '')) return ir();
    const m = await montar(); m.modo = 'saida'; atual = m;
    await m.saida(url, loja || 'loja parceira', ir);
  } catch (e) { console.warn('guia', e); limpar(); ir(); }
}

function limpar() { try { atual?.destruir(); } catch (e) {} atual = null; }

// ---------- monta a personagem, o balão e o destaque
async function montar() {
  await carregarCss();
  limpar();
  const raiz = document.createElement('div'); raiz.className = 'crg'; raiz.setAttribute('aria-live', 'polite');
  const alt = () => (innerWidth < 420 ? TAMANHO.alturaCelular : TAMANHO.altura);
  // espaço livre embaixo (ex.: barra fixa do celular na página inicial), definido no CSS da página em --crg-base
  const base = () => { try { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--crg-base')) || 0; } catch (e) { return 0; } };
  const temImg = !!IMAGENS.parado;
  raiz.innerHTML = `<div class=crg-bloq hidden></div><div class="crg-luz vazia"></div>
   <button type=button class="crg-bon p-parado" aria-label="${escHtml(NOME)}, ${T.guiaDe}: tocar para ajuda"><div class=crg-corpo>${temImg ? `<img alt="" src="${IMAGENS.parado}">` : SVG}</div></button>
   <div class=crg-bal role=dialog aria-modal=false aria-label="${escHtml(NOME)}, ${T.guiaDe}" hidden></div>`;
  document.body.appendChild(raiz);
  const bloq = raiz.querySelector('.crg-bloq'), luz = raiz.querySelector('.crg-luz'), bon = raiz.querySelector('.crg-bon'), bal = raiz.querySelector('.crg-bal');
  const img = raiz.querySelector('.crg-corpo img');
  if (temImg) [...Object.values(IMAGENS), ...PASSOS, ROSTO].filter(Boolean).forEach((u) => { const i = new Image(); i.src = u; });   // já baixa tudo (troca sem piscar)
  let x = innerWidth + 20, olhaEsq = false, alvoAtual = null, vivo = true, passoT = null;
  // com imagens: a sobra transparente (MARGEM) fica fora da caixa da personagem, para ela ter a altura de TAMANHO e os pés no chão
  const fv = () => Math.max(0.2, 1 - (MG.cima + MG.baixo) / 100), fh = () => Math.max(0.2, 1 - (2 * MG.lados) / 100);
  const W = () => Math.round(alt() * (temImg ? ((img.naturalWidth || 66) * fh()) / ((img.naturalHeight || 100) * fv()) : 0.667));
  const medir = () => {
    bon.style.height = alt() + 'px'; bon.style.width = W() + 'px';
    if (temImg) { const H = alt() / fv(), Wi = W() / fh(); img.style.cssText = `position:absolute;height:${H}px;width:${Wi}px;max-width:none;left:${-Wi * MG.lados / 100}px;top:${-H * MG.cima / 100}px`; }
  };
  if (temImg) img.addEventListener('load', () => { if (vivo) { medir(); pos(x); } });
  medir();
  const pararPassos = () => { clearInterval(passoT); passoT = null; };
  const pose = (p) => {
    if (p !== 'andando') pararPassos();
    bon.className = 'crg-bon p-' + p + (olhaEsq ? ' esq' : '');
    if (temImg) img.src = IMAGENS[p] || IMAGENS.parado;
  };
  const virar = (esq) => { olhaEsq = esq; bon.classList.toggle('esq', esq); };
  const pos = (px, dur) => { bon.style.transitionDuration = (dur || 0) + 'ms'; bon.style.transform = `translate3d(${Math.round(px)}px,0,0)`; x = px; };
  pos(x);

  // anda até a posição px (em pixels a partir da esquerda); o balão some durante a caminhada; as pernas se mexem
  const andar = async (px, { esconder = true } = {}) => {
    if (!vivo) return;
    if (esconder) mostrarBalao(null);
    const dist = Math.abs(px - x);
    if (dist < 4) return;
    virar(px < x);
    if (calmo()) { pos(px, 0); return; }
    pose('andando');
    if (temImg && PASSOS.length > 1) { let k = 0; passoT = setInterval(() => { img.src = PASSOS[k++ % PASSOS.length]; }, CONFIG.passo || 190); }
    const ms = Math.min(2600, Math.max(350, (dist / CONFIG.velocidade) * 1000));
    void bon.offsetWidth; pos(px, ms);
    await dormir(ms + 30);
    pararPassos();
  };

  // ---- destaque do elemento
  const rectVisivel = (el) => {
    const r = el.getBoundingClientRect(), pad = 6;
    const t = Math.max(6, r.top - pad), l = Math.max(6, r.left - pad);
    const b = Math.min(innerHeight - 6, r.bottom + pad), rr = Math.min(innerWidth - 6, r.right + pad);
    return { top: t, left: l, width: Math.max(0, rr - l), height: Math.max(0, b - t), cx: (l + rr) / 2, cy: (t + b) / 2 };
  };
  const destacar = (el) => {
    alvoAtual = el;
    if (!el) { luz.classList.add('vazia'); luz.style.cssText = `top:${innerHeight / 2}px;left:${innerWidth / 2}px`; luz.classList.add('on'); return; }
    const r = rectVisivel(el); luz.classList.remove('vazia');
    luz.style.cssText = `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px`; luz.classList.add('on');
  };
  const reposicionar = () => { if (!vivo) return; medir(); if (raiz.dataset.escuro === '1') destacar(alvoAtual); colocarBalao(); };
  addEventListener('resize', reposicionar); addEventListener('scroll', reposicionar, { passive: true, capture: true });   // capture: também quando o carrossel rola para o lado

  // braço apontando para o elemento (no boneco em SVG o braço gira; com imagens, usa a pose "apontando" virada para o lado certo)
  const apontar = (el) => {
    if (!el) { pose('parado'); return; }
    const r = rectVisivel(el), w = W(), h = alt();
    virar(r.cx < x + w / 2);
    const ombroX = x + (olhaEsq ? w * (1 - 0.705) : w * 0.705), ombroY = innerHeight - 8 - base() - h + h * (60 / 150);
    let dx = r.cx - ombroX; const dy = r.cy - ombroY;
    if (olhaEsq) dx = -dx;
    const ang = Math.max(-175, Math.min(10, (Math.atan2(dy, Math.max(4, dx)) * 180) / Math.PI - 90));
    bon.style.setProperty('--ang', ang + 'deg');
    pose('apontando');
  };

  // ---- balão
  let balaoBotoes = null, falaId = 0;
  const colocarBalao = () => {
    if (bal.hidden) return;
    const w = W(), bw = bal.offsetWidth, cx = x + w / 2;
    const left = Math.max(8, Math.min(innerWidth - bw - 8, cx - bw / 2));
    bal.style.left = left + 'px'; bal.style.bottom = (alt() + 18 + base()) + 'px';
    bal.style.setProperty('--seta', Math.max(14, Math.min(bw - 32, cx - left - 9)) + 'px');
  };
  function mostrarBalao(html, botoes) {
    falaId++;
    balaoBotoes = botoes || null;
    if (!html) { bal.classList.remove('on'); bal.hidden = true; return; }
    bal.innerHTML = html; bal.hidden = false; bal.classList.toggle('mini', html.includes('crg-chip')); colocarBalao();
    requestAnimationFrame(() => bal.classList.add('on'));
    bal.querySelectorAll('[data-a]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); balaoBotoes?.[b.dataset.a]?.(b); });
    // o botão principal (Próximo/Concluir) fica por último e recebe o foco do teclado
    const f = [...bal.querySelectorAll('.crg-bt:not(.crg-volta)')].pop();
    if (f && atual?.modo === 'tour') try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  // "digitando…" (três pontinhos) e depois a fala; quem pediu menos movimento vê a fala direto
  async function falar(html, botoes) {
    if (!calmo() && (CONFIG.digitando ?? 550) > 0) {
      mostrarBalao(`${cabeca()}<div class=crg-dig role=img aria-label="digitando"><i></i><i></i><i></i></div>`, botoes);
      const id = falaId;
      await dormir(CONFIG.digitando ?? 550);
      if (id !== falaId || !vivo) return false;
    }
    mostrarBalao(html, botoes);
    return true;
  }
  const cabeca = (cont) => `<div class=crg-quem>${ROSTO ? `<img src="${ROSTO}" alt="" width=34 height=34>` : ''}<span><b>${escHtml(NOME)}</b><small>${T.guiaDe}</small></span>${cont ? `<span class=crg-cont>${cont}</span>` : ''}</div>`;
  const bt = (a, txt, sec, cls = '') => `<button type=button class="crg-bt${sec ? ' crg-sec' : ''}${cls ? ' ' + cls : ''}" data-a="${a}">${txt}</button>`;
  const fechaX = (a, rot) => `<button type=button class=crg-x data-a=${a} aria-label="${rot}">×</button>`;

  // ---- teclado: Esc fecha
  const tecla = (e) => { if (e.key === 'Escape' && vivo) { e.preventDefault(); balaoBotoes?.esc?.(); } };
  addEventListener('keydown', tecla);

  const escurecer = (on) => { raiz.dataset.escuro = on ? '1' : ''; bloq.hidden = !on; if (!on) luz.classList.remove('on'); };

  // confete rápido no fim do tour
  const confete = () => {
    if (calmo()) return;
    try {
      const c = document.createElement('div'); c.className = 'crg-conf'; c.setAttribute('aria-hidden', 'true');
      const cores = ['#1a5fd6', '#ffd54a', '#ff6b6b', '#2ecc71', '#ff9f1c', '#9b5de5'];
      c.innerHTML = Array.from({ length: 34 }, (_, k) => `<i style="left:${Math.random() * 100}%;background:${cores[k % cores.length]};animation-delay:${(Math.random() * 0.5).toFixed(2)}s;animation-duration:${(1.6 + Math.random() * 1.2).toFixed(2)}s;--gira:${Math.round(Math.random() * 720 - 360)}deg"></i>`).join('');
      raiz.appendChild(c); setTimeout(() => c.remove(), 3500);
    } catch (e) {}
  };

  // ---- demonstração da pesquisa: ela "digita" um exemplo na barra e depois apaga (nada é pesquisado)
  let demo = null;
  const pararDemo = () => { if (demo) { demo.parar(); demo = null; } };
  const demonstrarBusca = async () => {
    const q = elemento('#q');
    if (calmo() || !q) return;
    pararDemo();
    const orig = q.value; let ativo = true;
    const d = { parar: () => { if (ativo) { ativo = false; q.value = orig; } } }; demo = d;
    q.value = '';
    await dormir(400);
    for (const ch of CONFIG.textos.exemploBusca || '') { if (!ativo || !vivo) return; q.value += ch; await dormir(85); }
    await dormir(1300);
    while (ativo && vivo && q.value.length) { q.value = q.value.slice(0, -1); await dormir(30); }
    d.parar(); if (demo === d) demo = null;
  };

  const destruir = () => { vivo = false; pararDemo(); pararPassos(); removeEventListener('resize', reposicionar); removeEventListener('scroll', reposicionar, { capture: true }); removeEventListener('keydown', tecla); raiz.remove(); };

  // despede, sai andando pela direita e some
  const despedir = async (texto) => {
    if (!vivo) return;
    pararDemo(); escurecer(false); m.pararVisita?.();
    const curto = bal.classList.contains('mini');   // no celular, a despedida da visita rápida também é curtinha
    pose('acenando'); mostrarBalao(curto ? `<span class=crg-chip>Tchau! 👋</span>` : `${cabeca()}<p style="margin-right:0">${texto}</p>`, { esc: () => sumir() });
    await dormir(calmo() ? 1800 : 2400);
    if (!vivo) return;
    await andar(innerWidth + 40);
    destruir(); if (atual?.raiz === raiz) atual = null;
  };
  const sumir = () => { destruir(); if (atual?.raiz === raiz) atual = null; };

  // ---- etapas especiais
  const podeInstalar = () => !isStandalone() && (!!window.__crInstall || isIOS());
  const podeNotificar = () => {
    if (ls.get('cr_push_ok') === '1') return false;
    if (isIOS() && !isStandalone()) return false;                       // iPhone: só depois de instalado
    return pushOk() && typeof Notification !== 'undefined' && Notification.permission === 'default';
  };
  const visivel = (el) => !!el && !el.closest('[hidden]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const elemento = (sel) => { try { return sel ? document.querySelector(sel) : null; } catch (e) { return null; } };
  const disponiveis = () => ETAPAS.filter((e) => {
    if (e.tipo === 'instalar') return podeInstalar();
    if (e.tipo === 'notificacoes') return podeNotificar();
    return !e.alvo || visivel(elemento(e.alvo));
  });
  // lojas parceiras: abre a janela das lojas (o mesmo que tocar no banner "Mais produtos") e devolve a seção inteira
  const abrirParceiras = () => {
    const b = elemento('#lpb');
    if (b && b.getAttribute('aria-expanded') !== 'true') { try { b.click(); } catch (e) {} }
    return elemento('#mais-produtos');
  };
  // um produto de verdade que está nas ofertas da tela
  const produtoDaVez = (sec) => {
    // as ofertas são um carrossel que corre para o lado: escolhe um cartão que está inteiro dentro dele;
    // se nenhum estiver, leva o carrossel até o primeiro (sem isso a luz ficaria num cartão fora da tela)
    const cs = [...(sec?.querySelectorAll('article.card') || [])].filter(visivel);
    const dentro = (el) => { const tr = el.closest('.pc'); if (!tr) return true; const a = el.getBoundingClientRect(), b = tr.getBoundingClientRect(); return a.left >= b.left - 2 && a.right <= b.right + 2; };
    const c = cs.find(dentro) || cs[0];
    if (!c) return null;
    if (!dentro(c)) { const tr = c.closest('.pc'); try { tr.scrollLeft += c.getBoundingClientRect().left - tr.getBoundingClientRect().left; } catch (e) {} }
    let nome = (c.querySelector('h3')?.textContent || '').replace(/\s+/g, ' ').trim();
    const preco = (c.querySelector('.pr b')?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!nome || !preco) return null;
    if (nome.length > 42) nome = nome.slice(0, 40).replace(/\s+\S*$/, '') + '…';
    return { el: c, nome, preco };
  };

  // rola até o elemento (deixa um respiro em cima) e espera a rolagem parar
  const rolarAte = async (el) => {
    try { const n = el.closest('nav.mn'); if (n && n !== el) n.scrollLeft = Math.max(0, el.offsetLeft - n.clientWidth / 2 + el.offsetWidth / 2); } catch (e) {}
    const r = el.getBoundingClientRect();
    const alvo = Math.max(0, scrollY + r.top - Math.min(90, innerHeight * 0.12));
    if (Math.abs(alvo - scrollY) < 4) return;
    scrollTo({ top: alvo, behavior: calmo() ? 'auto' : 'smooth' });
    let ult = -1, parado = 0;
    for (let i = 0; i < 40 && parado < 3; i++) { await dormir(60); if (Math.abs(scrollY - ult) < 1) parado++; else parado = 0; ult = scrollY; }
  };
  // onde a personagem fica ao lado do elemento
  const ladoDe = (el) => {
    const w = W();
    if (!el) return innerWidth / 2 - w / 2;
    const r = rectVisivel(el);
    const px = r.cx > innerWidth / 2 ? r.cx - w * 1.4 : r.cx + w * 0.4;
    return Math.max(6, Math.min(innerWidth - w - 6, px));
  };

  // ---------- TOUR COMPLETO
  const tour = async () => {
    const lista = disponiveis(), total = lista.length;
    escurecer(true); destacar(null);
    if (x > innerWidth) { pos(innerWidth + 20); }
    const fechar = (texto = T.tchau) => { marcarVisto(); despedir(texto); };
    const desligarEDespedir = () => { ls.set(K_VISTO, '1'); ls.set(K_OFF, '1'); avisarRodape(); try { CONFIG.perfil.salvar({ visto: true, desligado: true }); } catch (e) {} despedir(T.tchauDesativado); };
    let i = 0, vez = 0;
    const passo = async () => {
      if (!vivo) return;
      const minha = ++vez;                       // se o cliente tocar rápido em Próximo/Voltar, só a última vale
      pararDemo();
      if (i >= total) return fechar();
      const et = lista[i], sec = elemento(et.alvo);
      const prod = et.tipo === 'ofertas' ? produtoDaVez(sec) : null;
      const el = prod ? prod.el : et.tipo === 'parceiras' ? abrirParceiras() || sec : sec;
      mostrarBalao(null); destacar(null);
      if (el) { await rolarAte(el); if (!vivo || minha !== vez) return; destacar(el); }
      await andar(ladoDe(el));
      if (!vivo || minha !== vez) return;
      if (el) apontar(el); else pose(et.id === 'boas-vindas' || et.id === 'final' ? 'acenando' : 'parado');
      const prox = () => { i++; passo(); };
      const ac = { esc: () => fechar(), pular: () => fechar(), proximo: prox, voltar: () => { i = Math.max(0, i - 1); passo(); },
        'nao-mostrar': () => desligarEDespedir(), concluir: () => fechar(), desativar: () => desligarEDespedir() };
      let texto = fmt(et.texto), extra = '', bts = '';
      if (prod) texto += ' ' + T.produto.replace('{produto}', escHtml(prod.nome)).replace('{preco}', escHtml(prod.preco));
      if (et.tipo === 'instalar') {
        if (window.__crInstall) {
          bts = bt('proximo', T.agoraNao, 1) + bt('instalar', T.instalar);
          ac.instalar = async (b) => { b.disabled = true; try { const ev = window.__crInstall; window.__crInstall = null; await ev.prompt(); await ev.userChoice; } catch (e) { console.warn('instalar', e); } prox(); };
        } else { extra = `<p class=crg-nota>${T.instalarIphone}</p>`; bts = bt('proximo', T.entendi); }
      } else if (et.tipo === 'notificacoes') {
        bts = bt('proximo', T.agoraNao, 1) + bt('avisar', T.avisar);
        // Notification.requestPermission() só acontece aqui, depois do toque do cliente (dentro de pushSubscribe).
        ac.avisar = async (b) => {
          b.disabled = true; b.textContent = '…';
          try { await (CONFIG.ativarNotificacoes || padraoNotificacoes)(); mostrarBalao(`${cabeca()}<p style="margin-right:0">${T.avisoAtivo}</p>`, ac); await dormir(1400); prox(); }
          catch (e) { console.warn('notificações', e); mostrarBalao(`${cabeca()}<p>${T.avisoErro}</p><div class=crg-bts>${bt('proximo', T.proximo)}</div>`, ac); }
        };
      } else {
        bts = (et.botoes || ['proximo']).map((k) => k === 'proximo' ? bt('proximo', T.proximo) : k === 'nao-mostrar' ? bt('nao-mostrar', T.naoMostrar, 1)
          : k === 'concluir' ? bt('concluir', T.concluir) : k === 'desativar' ? bt('desativar', T.desativar, 1) : '').reverse().join('');
        if (et.tipo === 'pesquisa' && elemento('#q')) {
          bts = bt('tentar', T.tentar, 1) + bts;
          // "Quero tentar": o tour termina aqui, a barra fica livre e o cursor já vai para ela
          ac.tentar = () => { pararDemo(); const q = elemento('#q'); try { q.focus({ preventScroll: true }); } catch (e) {} marcarVisto(); despedir(T.tchauBusca); };
        }
      }
      const volta = i > 0 ? bt('voltar', '←', 1, 'crg-volta').replace('data-a="voltar"', `data-a="voltar" aria-label="${T.voltar}" title="${T.voltar}"`) : '';
      const ok = await falar(`${fechaX('pular', T.pular)}${cabeca(`${i + 1} de ${total}`)}<div class=crg-prog aria-hidden=true><i style="width:${Math.round(((i + 1) / total) * 100)}%"></i></div><p>${texto}</p>${extra}<div class=crg-bts>${volta}${bts}</div>`, ac);
      if (!ok || minha !== vez) return;
      if (et.tipo === 'pesquisa') demonstrarBusca();
      if (et.id === 'final') confete();
    };
    bon.onclick = () => {}; // durante o tour, tocar na personagem não faz nada
    await passo();
  };

  // ---------- MENU DE ATALHOS ("Quero ajuda", tocar nela, "Chamar a Karol")
  const tchau = () => despedir(T.tchau);
  // leva até uma parte da página, aponta e oferece "Ver todas"; se a parte não existir nesta página, abre a lista
  const mostrarAqui = async (sel, texto, link) => {
    const el = elemento(sel);
    if (!el || !visivel(el)) { if (link) location.href = link; else tchau(); return; }
    mostrarBalao(null);
    await rolarAte(el); if (!vivo) return;
    await andar(ladoDe(el)); if (!vivo) return;
    apontar(el);
    const ver = link ? `<a class=crg-bt href="${link}">${T.verTodas}</a>` : '';
    await falar(`${fechaX('valeu', T.valeu)}${cabeca()}<p>${texto}</p><div class=crg-bts>${bt('valeu', T.valeu, 1)}${ver}</div>`, { esc: tchau, valeu: tchau });
  };
  const ajuda = async () => {
    m.pararVisita?.();
    escurecer(false);
    if (x > innerWidth - 20) { await andar(innerWidth - W() - 10); if (!vivo) return; }
    virar(true); pose('acenando');
    bon.onclick = null;
    const temParceiras = visivel(elemento('#lpb'));
    await falar(`${fechaX('nao', T.agoraNao)}${cabeca()}<p>${T.menu}</p><div class=crg-menu>${bt('busca', T.menuBusca, 1)}${bt('ofertas', T.menuOfertas, 1)}${temParceiras ? bt('parceiras', T.menuParceiras, 1) : ''}${bt('categorias', T.menuCategorias, 1)}${bt('tour', T.menuTour)}</div>`, {
      esc: tchau, nao: tchau,
      // o cursor vai para a pesquisa já no toque (assim o teclado do celular abre)
      busca: () => { const q = elemento('#q'); try { q?.focus({ preventScroll: true }); } catch (e) {} mostrarAqui('header form[role=search]', T.buscaDica, ''); },
      ofertas: () => mostrarAqui('#ofertas', T.ofertasDica, 'lista.html?tipo=ofertas'),
      categorias: () => mostrarAqui('#categorias', T.categoriasDica, 'lista.html?tipo=categorias'),
      parceiras: () => { abrirParceiras(); mostrarAqui('#mais-produtos', T.parceirasDica, ''); },
      tour: () => abrir(),
    });
  };

  // ---------- SAÍDA PARA A LOJA PARCEIRA: ela entra, avisa para onde o cliente vai e abre a loja sozinha
  const saidaLoja = async (url, loja, ir) => {
    let fim = null, foi = false;
    const vai = () => { if (foi) return; foi = true; clearTimeout(fim); ir(); };
    const fica = () => { if (foi) return; foi = true; clearTimeout(fim); despedir(T.saidaFicou); };
    // ao voltar da loja pelo botão Voltar do celular, a página pode reaparecer da memória: ela não fica parada na tela
    addEventListener('pagehide', () => { if (foi) sumir(); }, { once: true });
    const seguranca = setTimeout(vai, 15000);         // se algo travar no caminho, a loja abre mesmo assim
    // o quadro de avisos que já existe na página do produto ("Ao clicar em…, você será direcionado…") fica em destaque
    const aviso = elemento(CONFIG.saidaAlvo || '#aviso');
    const temAviso = aviso && visivel(aviso);
    pos(innerWidth + 20);
    if (temAviso) {
      escurecer(true); destacar(null);
      bloq.onclick = () => {};                           // tocar fora não faz nada; a escolha é nos botões
      await rolarAte(aviso); if (!vivo || foi) return;
      destacar(aviso);
      await andar(ladoDe(aviso)); if (!vivo || foi) return;
      apontar(aviso);
    } else {
      escurecer(false);
      await andar(innerWidth - W() - 10); if (!vivo || foi) return;
      virar(true); pose('acenando');
    }
    bon.onclick = null;
    const espera = CONFIG.saidaEspera || 5;
    const txt = (temAviso ? T.saidaAviso : T.saida).replace('{loja}', /^loja parceira$/i.test(loja) ? 'loja parceira' : `loja <b>${escHtml(loja)}</b>`);   // "para a loja Mercado Livre" fica certo para qualquer loja
    const ok = await falar(`${fechaX('fica', T.saidaFicar)}${cabeca()}<p>${txt}</p><div class=crg-bts>${bt('fica', T.saidaFicar, 1)}${bt('vai', T.saidaIr)}</div><div class=crg-tempo aria-hidden=true><i style="animation-duration:${espera}s"></i></div>`,
      { esc: fica, fica, vai });
    clearTimeout(seguranca);
    if (!foi && vivo) fim = setTimeout(vai, ok ? espera * 1000 : 0);   // conta depois que a mensagem aparece (dá tempo de ler)
    else if (!foi) vai();
  };

  // ---------- VISITA RÁPIDA (visitas seguintes): entra pelo canto, acena e pergunta; some sozinha
  const visita = async () => {
    escurecer(false);
    pos(innerWidth + 20);
    await andar(innerWidth - W() - 10);
    if (!vivo) return;
    virar(true); pose('acenando');
    let fim = null;
    const parar = () => { clearTimeout(fim); m.pararVisita = null; };
    const nao = () => { parar(); despedir(T.tchau); };
    const querAjuda = () => { parar(); ajuda(); };
    m.pararVisita = parar;
    bon.onclick = querAjuda;
    // só um balãozinho ao lado dela (não cobre botões nem fotos da página); tocar nele ou nela abre a ajuda completa
    const mini = true;
    let ok = true;
    if (innerWidth < 768) mostrarBalao(null);   // celular: só ela acenando (sem balão por cima das fotos); tocar nela abre a ajuda
    else if (mini) mostrarBalao(`<button type=button class=crg-chip data-a=ajuda>${T.chip}</button><div class=crg-tempo aria-hidden=true><i style="animation-duration:${CONFIG.espera}s"></i></div>`, { esc: nao, nao, ajuda: querAjuda });
    else ok = await falar(`${fechaX('nao', T.agoraNao)}${cabeca()}<p>${ls.get(K_VISTO) === '1' ? T.pergunta : T.primeiraVez}</p><div class=crg-bts>${bt('nao', T.agoraNao, 1)}${bt('ajuda', T.querAjuda)}</div><div class=crg-tempo aria-hidden=true><i style="animation-duration:${CONFIG.espera}s"></i></div>`,
      { esc: nao, nao, ajuda: querAjuda });
    if (ok && m.pararVisita === parar) fim = setTimeout(nao, CONFIG.espera * 1000);
  };

  const m = { raiz, saida: saidaLoja, tour: async () => { m.pararVisita?.(); bon.onclick = null; await tour(); }, visita, ajuda, destruir, sumir, modo: null, pararVisita: null };
  return m;
}

async function visitaRapida() {
  const m = await montar(); m.modo = 'visita'; atual = m;
  await m.visita();
}

// padrão: usa as notificações que a loja já tem (Web Push próprio, o mesmo das ofertas e avisos do Desafio).
// Para ligar a outro serviço (Firebase, OneSignal...), defina CONFIG.ativarNotificacoes em etapas.js.
async function padraoNotificacoes() {
  await pushSubscribe();
  ls.set('cr_push_ok', '1');
  try { pushSyncProfile(true); } catch (e) {}
}

// rodapé: o botão "Ativar/Desativar guia" avisa por este evento
addEventListener('cr-guia-off', () => { if (atual) atual.sumir(); atual = null; });
