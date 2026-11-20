// GUIA DA LOJA (mascote) — componente isolado. Carregado só depois que a página termina de carregar (index.html).
// Tudo dentro de try/catch: se algo falhar, o guia some e a loja continua normal.
//
// Primeira visita: tour completo. Visitas seguintes: ele entra pelo canto, acena e pergunta se pode ajudar
// (sem escurecer a página); some sozinho depois de CONFIG.espera segundos.
// Guardado no aparelho (localStorage): cr_guia_visto = já viu o tour; cr_guia_off = cliente desligou o guia.
// Textos e etapas: js/tour/etapas.js · Personagem: js/tour/personagem.js
import { S, pushOk, pushSubscribe, pushSyncProfile, isIOS, isStandalone } from '../app.js';
import { ETAPAS, CONFIG } from './etapas.js';
import { IMAGENS, TAMANHO, SVG } from './personagem.js';

const K_VISTO = 'cr_guia_visto', K_OFF = 'cr_guia_off', K_SESSAO = 'cr_guia_sessao';
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
const calmo = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const T = CONFIG.textos;

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
    if (new URLSearchParams(location.search).get('guia') === '1') return abrir();
    if (ls.get(K_VISTO) !== '1') return abrir();                    // primeira visita: tour completo
    if (ss.get(K_SESSAO)) return;                                     // já cumprimentou nesta visita
    ss.set(K_SESSAO, '1');
    return visitaRapida();
  } catch (e) { console.warn('guia', e); limpar(); }
}
// "Chamar o guia" (rodapé) e "Quero ajuda"
export async function abrir() {
  try {
    if (!ligadoNoSite()) return;
    if (atual?.modo === 'tour') return;
    const m = atual && atual.modo === 'visita' ? atual : await montar();
    m.modo = 'tour'; atual = m;
    await m.tour();
  } catch (e) { console.warn('guia', e); limpar(); }
}

function limpar() { try { atual?.destruir(); } catch (e) {} atual = null; }

// ---------- monta o mascote, o balão e o destaque
async function montar() {
  await carregarCss();
  limpar();
  const raiz = document.createElement('div'); raiz.className = 'crg'; raiz.setAttribute('aria-live', 'polite');
  const alt = () => (innerWidth < 420 ? TAMANHO.alturaCelular : TAMANHO.altura);
  const temImg = !!IMAGENS.parado;
  raiz.innerHTML = `<div class=crg-bloq hidden></div><div class="crg-luz vazia"></div>
   <button type=button class="crg-bon p-parado" aria-label="Guia da loja: tocar para ajuda"><div class=crg-corpo>${temImg ? `<img alt="" src="${IMAGENS.parado}">` : SVG}</div></button>
   <div class=crg-bal role=dialog aria-modal=false aria-label="Guia da loja" hidden></div>`;
  document.body.appendChild(raiz);
  const bloq = raiz.querySelector('.crg-bloq'), luz = raiz.querySelector('.crg-luz'), bon = raiz.querySelector('.crg-bon'), bal = raiz.querySelector('.crg-bal');
  const img = raiz.querySelector('.crg-corpo img');
  let x = innerWidth + 20, olhaEsq = false, alvoAtual = null, vivo = true;
  const W = () => Math.round(alt() * (temImg ? (img.naturalWidth / img.naturalHeight || 0.66) : 0.667));
  const medir = () => { bon.style.height = alt() + 'px'; bon.style.width = W() + 'px'; };
  medir();
  const pose = (p) => {
    bon.className = 'crg-bon p-' + p + (olhaEsq ? ' esq' : '');
    if (temImg) img.src = IMAGENS[p] || IMAGENS.parado;
  };
  const virar = (esq) => { olhaEsq = esq; bon.classList.toggle('esq', esq); };
  const pos = (px, dur) => { bon.style.transitionDuration = (dur || 0) + 'ms'; bon.style.transform = `translate3d(${Math.round(px)}px,0,0)`; x = px; };
  pos(x);

  // anda até a posição px (em pixels a partir da esquerda); o balão some durante a caminhada
  const andar = async (px, { esconder = true } = {}) => {
    if (!vivo) return;
    if (esconder) mostrarBalao(null);
    const dist = Math.abs(px - x);
    if (dist < 4) return;
    virar(px < x);
    if (calmo()) { pos(px, 0); return; }
    pose('andando');
    const ms = Math.min(2600, Math.max(350, (dist / CONFIG.velocidade) * 1000));
    void bon.offsetWidth; pos(px, ms);
    await dormir(ms + 30);
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
  addEventListener('resize', reposicionar); addEventListener('scroll', reposicionar, { passive: true });

  // braço apontando para o elemento (só no homenzinho em SVG; com imagens, usa a pose "apontando" virada para o lado certo)
  const apontar = (el) => {
    if (!el) { pose('parado'); return; }
    const r = rectVisivel(el), w = W(), h = alt();
    virar(r.cx < x + w / 2);
    const ombroX = x + (olhaEsq ? w * (1 - 0.685) : w * 0.685), ombroY = innerHeight - 8 - h + h * (61 / 150);
    let dx = r.cx - ombroX; const dy = r.cy - ombroY;
    if (olhaEsq) dx = -dx;
    const ang = Math.max(-175, Math.min(10, (Math.atan2(dy, Math.max(4, dx)) * 180) / Math.PI - 90));
    bon.style.setProperty('--ang', ang + 'deg');
    pose('apontando');
  };

  // ---- balão
  let balaoBotoes = null;
  const colocarBalao = () => {
    if (bal.hidden) return;
    const w = W(), bw = bal.offsetWidth, cx = x + w / 2;
    const left = Math.max(8, Math.min(innerWidth - bw - 8, cx - bw / 2));
    bal.style.left = left + 'px'; bal.style.bottom = (alt() + 18) + 'px';
    bal.style.setProperty('--seta', Math.max(14, Math.min(bw - 32, cx - left - 9)) + 'px');
  };
  function mostrarBalao(html, botoes) {
    balaoBotoes = botoes || null;
    if (!html) { bal.classList.remove('on'); bal.hidden = true; return; }
    bal.innerHTML = html; bal.hidden = false; colocarBalao();
    requestAnimationFrame(() => bal.classList.add('on'));
    bal.querySelectorAll('[data-a]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); balaoBotoes?.[b.dataset.a]?.(b); });
    const f = bal.querySelector('.crg-bt'); if (f && atual?.modo === 'tour') try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  const bt = (a, txt, sec) => `<button type=button class="crg-bt${sec ? ' crg-sec' : ''}" data-a="${a}">${txt}</button>`;

  // ---- teclado: Esc fecha
  const tecla = (e) => { if (e.key === 'Escape' && vivo) { e.preventDefault(); balaoBotoes?.esc?.(); } };
  addEventListener('keydown', tecla);

  const escurecer = (on) => { raiz.dataset.escuro = on ? '1' : ''; bloq.hidden = !on; if (!on) luz.classList.remove('on'); };

  const destruir = () => { vivo = false; removeEventListener('resize', reposicionar); removeEventListener('scroll', reposicionar); removeEventListener('keydown', tecla); raiz.remove(); };

  // despede, sai andando pela direita e some
  const despedir = async (texto) => {
    if (!vivo) return;
    escurecer(false);
    pose('acenando'); mostrarBalao(`<p style="margin-right:0">${texto}</p>`, { esc: () => sumir() });
    await dormir(calmo() ? 1800 : 2200);
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
  // onde o mascote fica ao lado do elemento
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
    let i = 0;
    const passo = async () => {
      if (!vivo) return;
      if (i >= total) return fechar();
      const et = lista[i], el = elemento(et.alvo);
      mostrarBalao(null); destacar(null);
      if (el) { await rolarAte(el); if (!vivo) return; destacar(el); }
      await andar(ladoDe(el));
      if (!vivo) return;
      if (el) apontar(el); else pose(et.id === 'boas-vindas' || et.id === 'final' ? 'acenando' : 'parado');
      const prox = () => { i++; passo(); };
      const ac = { esc: () => fechar(), pular: () => fechar(), proximo: prox,
        'nao-mostrar': () => desligarEDespedir(), concluir: () => fechar(), desativar: () => desligarEDespedir() };
      let extra = '', bts = '';
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
          try { await (CONFIG.ativarNotificacoes || padraoNotificacoes)(); mostrarBalao(`<p style="margin-right:0">${T.avisoAtivo}</p>`, ac); await dormir(1400); prox(); }
          catch (e) { console.warn('notificações', e); mostrarBalao(`<p>${T.avisoErro}</p><div class=crg-bts>${bt('proximo', T.proximo)}</div>`, ac); }
        };
      } else {
        bts = (et.botoes || ['proximo']).map((k) => k === 'proximo' ? bt('proximo', T.proximo) : k === 'nao-mostrar' ? bt('nao-mostrar', T.naoMostrar, 1)
          : k === 'concluir' ? bt('concluir', T.concluir) : k === 'desativar' ? bt('desativar', T.desativar, 1) : '').reverse().join('');
      }
      mostrarBalao(`<button type=button class=crg-x data-a=pular aria-label="${T.pular}">×</button><p class=crg-cont>${i + 1} de ${total}</p><p>${et.texto}</p>${extra}<div class=crg-bts>${bts}</div>`, ac);
    };
    bon.onclick = () => {}; // durante o tour, tocar no mascote não faz nada
    await passo();
  };

  // ---------- VISITA RÁPIDA (visitas seguintes): entra pelo canto, acena e pergunta; some sozinho
  const visita = async () => {
    escurecer(false);
    pos(innerWidth + 20);
    await andar(innerWidth - W() - 10);
    if (!vivo) return;
    virar(true); pose('acenando');
    let fim = null;
    const parar = () => { clearTimeout(fim); };
    const ajuda = () => { parar(); abrir(); };
    const nao = () => { parar(); despedir(T.tchau); };
    bon.onclick = ajuda;
    mostrarBalao(`<button type=button class=crg-x data-a=nao aria-label="${T.agoraNao}">×</button><p>${T.pergunta}</p><div class=crg-bts>${bt('nao', T.agoraNao, 1)}${bt('ajuda', T.querAjuda)}</div><div class=crg-tempo aria-hidden=true><i style="animation-duration:${CONFIG.espera}s"></i></div>`,
      { esc: nao, nao, ajuda });
    fim = setTimeout(nao, CONFIG.espera * 1000);
    m.pararVisita = parar;
  };

  const m = { raiz, tour: async () => { m.pararVisita?.(); bon.onclick = null; await tour(); }, visita, destruir, sumir, modo: null };
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
