// Instalador do aplicativo (PWA) — botão "📲 Instalar para receber ofertas" no cabeçalho da loja.
// Módulo independente: carregado sob demanda pelo app.js. Se falhar, o site continua igual.
// Liga/desliga no painel (Painel > INSTALADOR DO APLICATIVO), salvo em cr_site_settings.data.install_btn.
// Reaproveita o PWA existente (manifest.json + sw.js) e as notificações já existentes (pushSubscribe).
import {PWA,INST_KEY,isIOS,isStandalone,pushOk,currentSub,pushSubscribe,fitFx} from './app.js';

const HIDE_KEY = 'cr_inst_hide'; // sessionStorage: clicou nesta visita (volta na próxima visita se não instalar)
const ls = {get:k=>{try{return localStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}}};
const ss = {get:k=>{try{return sessionStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch(_){}}};
const installed = () => !!ls.get(INST_KEY);
const markInstalled = () => ls.set(INST_KEY, String(Date.now()));

let styled = false;
function css(){if(styled)return;styled=true;document.head.insertAdjacentHTML('beforeend',`<style>
#pwai{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;background:#ffffff1f;color:#fff;border:1px solid #ffffff59;border-radius:999px;padding:7px 14px;font:inherit;font-size:.85rem;font-weight:600;line-height:1.2;cursor:pointer;white-space:nowrap;transition:background .15s,transform .15s}
#pwai:hover{background:#ffffff33}#pwai:active{transform:scale(.97)}#pwai:focus-visible{outline:2px solid #fff;outline-offset:2px}#pwai[hidden]{display:none}
@media(max-width:640px){#pwai{margin-left:auto;font-size:.76rem;padding:5px 12px;gap:5px}}
@media(max-width:300px){#pwai .t{display:none}#pwai::after{content:"Instalar"}}
#pwah{position:fixed;inset:0;background:#000a;z-index:60;display:grid;place-items:center;padding:16px}#pwah>div{background:#fff;color:#12213a;border-radius:14px;padding:18px;max-width:440px;width:100%;max-height:90vh;overflow:auto}
#pwah h3{margin:0 0 8px;color:var(--c1)}#pwah ol{padding-left:20px}#pwah li{margin:6px 0}
#pwat{position:fixed;left:12px;right:12px;bottom:12px;z-index:55;max-width:460px;margin:auto;background:#fff;color:#12213a;border-radius:14px;box-shadow:0 8px 28px #0004;padding:14px}
#pwat p{margin:0 0 10px}#pwat div{display:flex;gap:8px;flex-wrap:wrap}#pwat .btn{flex:1 1 140px;padding:10px 12px;font-weight:700}
</style>`)}

// Instruções para instalar pelo menu do navegador (quando não há instalação direta)
function steps(){const ua=navigator.userAgent;
 if(isIOS())return /CriOS|FxiOS|EdgiOS/.test(ua)
  ?'<li>Toque em <b>Compartilhar</b> <span aria-hidden=true>⬆️</span> (na barra do navegador).</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li><li>Se não aparecer, abra este site no <b>Safari</b> e repita.</li>'
  :'<li>Toque em <b>Compartilhar</b> <span aria-hidden=true>⬆️</span> (na barra do Safari).</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li><li>Abra a loja pelo novo ícone.</li>';
 if(/SamsungBrowser/.test(ua))return '<li>Toque no menu <b>☰</b> (embaixo, à direita).</li><li>Escolha <b>Adicionar página a</b> → <b>Tela inicial</b>.</li>';
 if(/Firefox|FxiOS/.test(ua))return '<li>Toque no menu <b>⋮</b> do navegador.</li><li>Escolha <b>Instalar</b> ou <b>Adicionar à tela inicial</b>.</li>';
 if(/Android/.test(ua))return '<li>Toque no menu <b>⋮</b> (canto superior direito do navegador).</li><li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme em <b>Instalar</b>.</li>';
 return '<li>Clique no ícone de <b>instalar</b> <span aria-hidden=true>⊕</span> na barra de endereço do navegador,</li><li>ou abra o menu <b>⋮</b> e escolha <b>Instalar Compras Rápidas</b> / <b>Aplicativos → Instalar este site</b>.</li>'}
function manual(chrome){css();const d=document.createElement('div');d.id='pwah';
 d.innerHTML=`<div role=dialog aria-modal=true aria-labelledby=pwaht><h3 id=pwaht>📲 Instalar a loja</h3>${chrome?'<p><b>A loja já está instalada?</b> Então é só abrir pelo ícone <b>Compras</b> na tela inicial do celular.</p><p>Se ainda não instalou, faça assim:</p>':'<p>Instale a <b>Compras Rápidas</b> no seu aparelho para abrir com um toque e receber nossas ofertas:</p>'}<ol>${steps()}</ol>
 <p class=note>Se você já instalou, é só abrir a loja pelo ícone na tela inicial.</p><button class="btn big" type=button>Entendi</button></div>`;
 d.onclick=e=>{if(e.target===d||e.target.tagName==='BUTTON')d.remove()};document.body.appendChild(d);d.querySelector('button').focus()}

// Depois da instalação: oferece (separadamente, só se a pessoa quiser) as notificações de ofertas
async function offerPush(){
 if(!pushOk()||Notification.permission!=='default'||document.getElementById('pwat'))return;
 if(await currentSub().catch(()=>null))return;
 css();const t=document.createElement('div');t.id='pwat';t.setAttribute('role','dialog');t.setAttribute('aria-label','Receber ofertas');
 t.innerHTML='<p>✅ <b>Loja instalada!</b> Quer ser avisado quando surgirem novas ofertas e promoções?</p><div><button class=btn type=button data-a=1>🔔 Quero receber ofertas</button><button class="btn alt" type=button data-a=0>Agora não</button></div>';
 t.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.a!=='1'){t.remove();return}
  b.disabled=true;b.textContent='Ativando…';
  try{await pushSubscribe();t.innerHTML='<p>✅ Pronto! Você vai receber nossas ofertas neste aparelho.</p>';document.getElementById('pnb')?.remove();setTimeout(()=>t.remove(),4000)}
  catch(err){t.remove();alert(err.message||err)}};
 document.body.appendChild(t)}

// espera o evento de instalação do navegador por alguns instantes (ele pode chegar logo depois do carregamento)
const waitBip=ms=>PWA.evt?Promise.resolve(PWA.evt):new Promise(r=>{const f=()=>{clearTimeout(t);r(PWA.evt)};const t=setTimeout(()=>{removeEventListener('cr-bip',f);r(null)},ms);addEventListener('cr-bip',f,{once:true})});

export async function init(){
 const b=document.getElementById('pwai');
 addEventListener('appinstalled',()=>{b?.setAttribute('hidden','');fitFx();offerPush()});
 if(!b)return;
 if(isStandalone()){markInstalled();b.remove();return}            // já está aberto como aplicativo
 if(installed()||ss.get(HIDE_KEY)){b.remove();fitFx();return}      // instalado neste aparelho / já clicou nesta visita
 css();
 // Chrome no Android: detecta o app desta loja já instalado (manifest: related_applications)
 try{if(navigator.getInstalledRelatedApps){const r=await navigator.getInstalledRelatedApps();if(r?.length){markInstalled();b.remove();fitFx();return}}}catch(_){}
 // Com SIM no painel o botão sempre aparece.
 // Chrome/Edge/Samsung: o toque abre a janela de instalação do próprio celular (sem precisar do menu ⋮).
 // Se o navegador não liberar (loja já instalada, ou iPhone/Firefox), mostra o que fazer.
 const direct='onbeforeinstallprompt' in window;
 b.hidden=false;fitFx();
 b.onclick=async()=>{
  if(b.disabled)return;b.disabled=true;b.hidden=true;ss.set(HIDE_KEY,'1');fitFx();  // some na hora e evita cliques repetidos
  const ev=PWA.evt||(direct?await waitBip(3000):null);
  if(!ev){manual(direct);return}                                          // sem instalação direta: instruções manuais
  PWA.evt=null;                                                     // o evento só pode ser usado uma vez
  try{await ev.prompt();await ev.userChoice}catch(_){manual()}
  // a confirmação real vem do evento "appinstalled" (registrado no app.js); cancelar não marca nada,
  // e o botão volta a aparecer na próxima visita.
 }}
