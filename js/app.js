// Funções compartilhadas do site público
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import {SUPABASE_URL as U, SUPABASE_KEY as K} from '../config.js';
export const CONFIGURED=/^https?:\/\//.test(U)&&K&&!K.includes('COLE_AQUI');
export const sb=createClient(CONFIGURED?U:'https://sem-config.supabase.co',CONFIGURED?K:'sem-config',{auth:{storageKey:'sb-compras-rapidas-auth'}});
export const $=(s,r=document)=>r.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=v=>v==null?'':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const qs=k=>new URLSearchParams(location.search).get(k);
export const safeUrl=u=>/^https?:\/\//i.test(u||'')?u:'#';
const PH='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e8f1ff"/><text x="200" y="210" font-size="22" text-anchor="middle" fill="#1e6bff">Sem foto</text></svg>');
export const DISCLAIMER='A Compras Rápidas é uma plataforma de divulgação e recomendação de produtos. Alguns links são links de afiliados e podem gerar uma comissão para a plataforma, sem custo adicional para o comprador. A compra, o pagamento, a entrega e as condições comerciais são de responsabilidade da loja parceira.';
const DEF={name:'Compras Rápidas',slogan:'Encontre boas escolhas.',c1:'#0b2a5b',c2:'#1e6bff',btn:'#1e6bff',per_page:12,
 about:'A Compras Rápidas reúne produtos selecionados de lojas parceiras para você encontrar boas escolhas com facilidade.',
 privacy:'Edite este texto no painel (Aparência da loja). Explique quais dados coleta (ex.: cliques anônimos em links de compra), como usa e como o visitante pode falar com você.',contact_text:'Fale com a gente pelos canais abaixo.'};
export let S=DEF;
// ---- instalador do aplicativo (PWA): guarda o convite de instalação do navegador e registra instalações concluídas.
// Só nas páginas da loja (o painel /admin/ e o /gestor/ têm o próprio app e não são afetados).
export const INST_KEY='cr_app_installed';
export const PWA={evt:null,on:false};
if(!/\/(admin|gestor)\//.test(location.pathname)){
 addEventListener('beforeinstallprompt',e=>{PWA.evt=e;if(PWA.on)e.preventDefault();dispatchEvent(new Event('cr-bip'))}); // com o botão ligado, a instalação fica no botão
 addEventListener('appinstalled',()=>{PWA.evt=null;try{localStorage.setItem(INST_KEY,String(Date.now()))}catch(_){}})}
export const THEMES={
 natal:{n:'Natal',e:'🎄',c1:'#8b1a1a',c2:'#1f8a4c',btn:'#1f8a4c',t:'Especial de Natal: ofertas para presentear!',fx:['❄️'],deco:'hats'},
 carnaval:{n:'Carnaval',e:'🎭',c1:'#5b2a86',c2:'#e08a00',btn:'#d6246e',t:'Folia de ofertas de Carnaval!',fx:['🎊','✨']},
 pascoa:{n:'Páscoa',e:'🐰',c1:'#5c3a21',c2:'#8e5bd1',btn:'#d6336c',t:'Ofertas de Páscoa para adoçar o seu dia!',fx:['🐰'],deco:'eggs'},
 maes:{n:'Dia das Mães',e:'💐',c1:'#a02a64',c2:'#d6336c',btn:'#c2255c',t:'Dia das Mães: presentes que emocionam!',fx:['💗','🌸']},
 namorados:{n:'Dia dos Namorados',e:'❤️',c1:'#8e1b4a',c2:'#d6336c',btn:'#c2255c',t:'Dia dos Namorados: ofertas para quem você ama!',fx:['❤️','💕']},
 junina:{n:'Festa Junina',e:'🌽',c1:'#a64b0a',c2:'#c77700',btn:'#15803d',t:'Arraiá de ofertas de Festa Junina!',fx:['🌽','🎈'],deco:'bunting'},
 pais:{n:'Dia dos Pais',e:'👔',c1:'#0f3d63',c2:'#1e6fb8',btn:'#00796b',t:'Dia dos Pais: escolhas que ele vai gostar!',fx:[],deco:'ties'},
 criancas:{n:'Dia das Crianças',e:'🧸',c1:'#6a28b5',c2:'#e08a00',btn:'#d6246e',t:'Dia das Crianças: ofertas que fazem a alegria!',fx:['🎈','⭐']},
 black:{n:'Black Friday',e:'⚡',c1:'#111111',c2:'#b8860b',btn:'#d90429',t:'Black Friday: as melhores ofertas do ano!',fx:[]},
 aulas:{n:'Volta às Aulas',e:'✏️',c1:'#1e3a8a',c2:'#d97706',btn:'#15803d',t:'Volta às aulas: tudo o que você precisa!',fx:[]}};
export function themeOn(s){const c=s?.theme_cfg;if(!c||!c.on)return null;const d=new Date(),td=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 if(c.start&&td<c.start)return null;if(c.end&&td>c.end)return null;
 const b=c.key==='custom'?{n:'Personalizado',e:c.custom?.emoji||'✨',c1:c.custom?.c1||'#0b2a5b',c2:c.custom?.c2||'#1e6bff',btn:c.custom?.btn||'#1e6bff',t:'',fx:c.custom?.emoji?[c.custom.emoji]:[]}:THEMES[c.key];
 return b?{...b,cfg:c}:null}
// ---- enfeites dos temas (gorros, bandeirinhas, ovos, gravatas)
const _u=s=>'data:image/svg+xml,'+encodeURIComponent(s),_c=s=>_u(s).replace(/\(/g,'%28').replace(/\)/g,'%29');
const PAL=[['#ffd6e7','#8e5bd1','#2e9e4f','#f4b400'],['#cdeeff','#ff7a00','#d62828','#ffffff'],['#fff3b0','#1e6bff','#d6336c','#2e9e4f'],['#d9f5d0','#f4b400','#8e5bd1','#d62828'],['#e5d4ff','#d6336c','#00a8a8','#ffd23f'],['#ffe0cc','#2e9e4f','#1e6bff','#8e5bd1']];
const TC=[['#1e3a8a','#93b4ff'],['#b91c1c','#ffb3b3'],['#166534','#a7e3b8'],['#6b21a8','#d9b3ff'],['#0f766e','#99ebe0']];
const EP='M20 2C30 2 38 22 38 34C38 45 30 50 20 50C10 50 2 45 2 34C2 22 10 2 20 2Z',SV='<svg xmlns="http://www.w3.org/2000/svg" ';
const eggIn=(p,id)=>`<defs><clipPath id="${id}"><path d="${EP}"/></clipPath></defs><path d="${EP}" fill="${p[0]}"/><g clip-path="url(#${id})"><rect x="0" y="17" width="40" height="7" fill="${p[1]}"/><polyline points="0,35 5,30 10,35 15,30 20,35 25,30 30,35 35,30 40,35" fill="none" stroke="${p[2]}" stroke-width="4"/>${[10,20,30].map(x=>`<circle cx="${x}" cy="44" r="3" fill="${p[3]}"/>`).join('')}<circle cx="14" cy="9" r="2.5" fill="${p[3]}"/><circle cx="26" cy="9" r="2.5" fill="${p[3]}"/></g><path d="${EP}" fill="none" stroke="#0003" stroke-width="1"/>`;
const tieIn=(c,id)=>`<defs><clipPath id="${id}"><polygon points="9,12 21,12 25,52 15,60 5,52"/></clipPath></defs><polygon points="9,12 21,12 25,52 15,60 5,52" fill="${c[0]}"/><g clip-path="url(#${id})" stroke="${c[1]}" stroke-width="3">${[20,32,44,56,68].map(y=>`<line x1="0" y1="${y}" x2="30" y2="${y-18}"/>`).join('')}</g><polygon points="11,1 19,1 21,12 9,12" fill="${c[0]}"/><polygon points="11,1 19,1 21,12 9,12" fill="#0003"/>`;
const HATSVG=SV+'viewBox="0 0 64 48"><path d="M10 36 L34 6 L54 36 Z" fill="#d62828"/><path d="M34 6 L54 36 L44 36 Z" fill="#b71c1c"/><rect x="6" y="31" width="52" height="13" rx="6.5" fill="#fff"/><circle cx="34" cy="6" r="6" fill="#fff"/></svg>';
let TH=null,DK={},cc=0,AREA='all';
export function makeDeco(d){
 if(d==='hats'){const h=_u(HATSVG);return{corner:[h],fxi:[h]}}
 if(d==='bunting')return{strip:_c(SV+'width="200" height="34"><line x1="0" y1="3" x2="200" y2="3" stroke="#5c3a21" stroke-width="2"/>'+['#d62828','#f4b400','#2e9e4f','#1e6bff','#ff7a00'].map((c,i)=>`<polygon points="${i*40+5},3 ${i*40+35},3 ${i*40+20},31" fill="${c}"/>`).join('')+'</svg>')};
 if(d==='eggs'){const E=PAL.map(p=>_u(SV+'viewBox="0 0 40 52">'+eggIn(p,'c')+'</svg>'));return{corner:E,fxi:E,strip:_c(SV+'width="200" height="34">'+PAL.slice(0,5).map((p,i)=>`<g transform="translate(${i*40+8},2) scale(.6)">${eggIn(p,'c'+i)}</g>`).join('')+'</svg>')}}
 if(d==='ties'){const V=SV+'viewBox="0 0 30 60">';return{corner:TC.map(c=>_u(V+tieIn(c,'t')+'</svg>')),ties:TC.map(c=>_u(V+tieIn(c,'t')+'</svg>')),tc:TC.map(c=>_c(V+tieIn(c,'t')+'</svg>')),
  pat:_c(SV+'width="260" height="220"><g opacity=".14">'+[[20,10,-18,.9,0],[140,40,22,.8,1],[70,120,10,1,2],[190,130,-25,.85,3]].map((a,i)=>`<g transform="translate(${a[0]},${a[1]}) rotate(${a[2]}) scale(${a[3]})">${tieIn(TC[a[4]],'p'+i)}</g>`).join('')+'</g></svg>')}}
 return{}}
export function cornerDeco(){if(!TH||!DK.corner||AREA==='top')return '';const k=cc++,d=TH.deco;
 if(d==='ties'?k%2===0:k%2===1)return '';
 return `<img class=tdc style="width:${d==='hats'?34:d==='eggs'?28:22}px;transform:rotate(${d==='ties'?16:d==='eggs'?12:14}deg)" src="${DK.corner[k%DK.corner.length]}" alt="">`}
export function fitFx(){const f=document.getElementById('fx');if(!f||AREA!=='top')return;const b=document.querySelector('.car')||document.querySelector('.tbd')||document.querySelector('header');if(!b)return;const h=Math.round(b.getBoundingClientRect().bottom+window.scrollY);f.style.height=h+'px';f.style.setProperty('--fh',(h+40)+'px')}
export function decorHero(){fitFx();const el=document.querySelector('.car');if(!el||!DK.ties)return;
 el.insertAdjacentHTML('beforeend',[['right:3%;top:-10px;width:30px;transform:rotate(14deg)',0],['right:12%;bottom:-16px;width:26px;transform:rotate(-20deg)',1],['right:21%;top:-14px;width:22px;transform:rotate(24deg)',2]].map(([s,i])=>`<img class=tie style="${s}" src="${DK.ties[i]}" alt="">`).join(''))}
const stripHtml=()=>DK.strip?`<div class=tbd style="background-image:url(${DK.strip})"></div>`:'';
function logoDeco(){if(!TH)return '';
 if(TH.deco==='hats')return `<img class=tdl src="${DK.corner[0]}" style="width:30px;top:-12px;left:-8px;transform:rotate(-14deg)" alt="">`;
 if(TH.deco==='eggs')return '<span class=tdl style="font-size:20px;top:-12px;left:-6px;transform:rotate(-12deg)">🐰</span>';
 if(TH.deco==='ties')return `<img src="${DK.ties[1]}" style="width:16px;transform:rotate(-10deg)" alt="">`;return ''}
// ---- som de Natal (sintetizado no navegador: sem arquivo de áudio e sem direitos de terceiros; melodia de domínio público)
const XM=[['E5',1],['E5',1],['E5',2],['E5',1],['E5',1],['E5',2],['E5',1],['G5',1],['C5',1.5],['D5',.5],['E5',4],['F5',1],['F5',1],['F5',1.5],['F5',.5],['F5',1],['E5',1],['E5',1],['E5',.5],['E5',.5],['E5',1],['D5',1],['D5',1],['E5',1],['D5',2],['G5',2]];
const FQ={C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99};
export function scheduleXmas(ac,t0,out){const q=.4;let t=t0;
 const bell=(f,t,d)=>{[[1,1],[2.76,.45],[5.4,.2],[8.93,.1]].forEach(([r,a])=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f*r;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16*a,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+Math.min(1.6,d*q+.9));o.connect(g);g.connect(out);o.start(t);o.stop(t+2)})};
 const shake=t=>{const n=Math.floor(ac.sampleRate*.08),buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=ac.createBufferSource();s.buffer=buf;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=6500;f.Q.value=2;const g=ac.createGain();g.gain.value=.12;s.connect(f);f.connect(g);g.connect(out);s.start(t)};
 for(const [n,d] of XM){bell(FQ[n],t,d);shake(t);t+=d*q}
 return t-t0}
function initSound(){const b=document.createElement('button');b.id='snd';b.type='button';b.textContent='🔔 Som de Natal';b.setAttribute('aria-pressed','false');
 document.head.insertAdjacentHTML('beforeend','<style>#snd{position:fixed;left:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:30;background:#0b2a5b;color:#fff;border:2px solid #fff;border-radius:99px;padding:10px 16px;font:600 .9rem system-ui,sans-serif;box-shadow:0 3px 12px #0006;cursor:pointer;min-height:44px}@media(max-width:799px){body:has(#bb) #snd{bottom:92px}}</style>');
 let ac=null,tm=null;
 const stop=()=>{clearTimeout(tm);tm=null;if(ac){ac.close().catch(()=>{});ac=null}b.textContent='🔔 Som de Natal';b.setAttribute('aria-pressed','false')};
 const loop=()=>{const cp=ac.createDynamicsCompressor(),g=ac.createGain();g.gain.value=.8;g.connect(cp);cp.connect(ac.destination);const dur=scheduleXmas(ac,ac.currentTime+.1,g);tm=setTimeout(()=>{if(ac)loop()},(dur+1.8)*1000)};
 b.onclick=()=>{if(ac)return stop();try{const C=window.AudioContext||window.webkitAudioContext;ac=new C();if(ac.resume)ac.resume();b.textContent='🔕 Desligar som';b.setAttribute('aria-pressed','true');loop()}catch(e){stop()}};
 document.body.appendChild(b)}
const TLINK=/^(https?:\/\/|[\w.\/?=&%-]+$)/i;
function themeUi(th){if(!th)return '';const x=th.cfg,txt=x.text||(th.e+' '+th.t);
 let css='.tbar{background:var(--c2);color:#fff;text-align:center;font-size:.9rem;padding:8px 12px;font-weight:600}.tbar a{text-decoration:underline}#fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:15}#fx i{position:absolute;top:-8vh;font-style:normal;animation:fx linear infinite;opacity:.85;will-change:transform}@keyframes fx{to{transform:translateY(var(--fh,112vh)) rotate(360deg)}}#fx.top{position:absolute;inset:0 0 auto 0;height:160px;z-index:25}#fx.top i{top:-30px}.logo{position:relative}.tdl{position:absolute;z-index:2;filter:drop-shadow(0 1px 1px #0004)}.tdc{position:absolute;top:-2px;right:4px;z-index:2;pointer-events:none;filter:drop-shadow(0 1px 2px #0003)}.tbd{height:34px;background-repeat:repeat-x;background-size:200px 34px}.car>.tie{position:absolute;z-index:2;pointer-events:none;filter:drop-shadow(0 2px 2px #0004)}';
 if(DK.pat&&AREA!=='top')css+=`body{background-image:url(${DK.pat});background-size:260px 220px}.sh h2::after{content:"";display:inline-block;width:12px;height:24px;margin-left:6px;vertical-align:-4px;transform:rotate(12deg);background:url(${DK.tc[0]}) center/contain no-repeat}footer{position:relative}footer::before{content:"";position:absolute;right:16px;top:-14px;width:26px;height:52px;transform:rotate(-16deg);background:url(${DK.tc[3]}) center/contain no-repeat}`;
 document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');
 if(x.fx!==false&&th.fx?.length&&!matchMedia('(prefers-reduced-motion:reduce)').matches){const f=document.createElement('div');f.id='fx';if(AREA==='top')f.className='top';f.setAttribute('aria-hidden','true');
  for(let k=0;k<(AREA==='top'?12:16);k++){const i=document.createElement('i');
   if(th.deco==='hats'&&k%5===2)i.innerHTML=`<img src="${DK.fxi[0]}" width="26" alt="">`;
   else if(th.deco==='eggs')i.innerHTML=k%4===3?'🐰':`<img src="${DK.fxi[k%6]}" width="24" alt="">`;
   else i.textContent=th.fx[k%th.fx.length];
   i.style.cssText='left:'+Math.random()*100+'%;font-size:'+(14+Math.random()*14)+'px;animation-duration:'+(AREA==='top'?5+Math.random()*5:9+Math.random()*9)+'s;animation-delay:-'+Math.random()*14+'s';f.appendChild(i)}document.body.appendChild(f)}
 return '<div class=tbar>'+(x.link&&TLINK.test(x.link)?'<a href="'+esc(x.link)+'">'+esc(txt)+'</a>':esc(txt))+'</div>'}
export async function boot(){
 if(!CONFIGURED){document.body.insertAdjacentHTML('afterbegin','<p style="background:#fde2e2;color:#7a1010;padding:12px;margin:0;text-align:center">Site ainda não configurado: preencha o arquivo config.js (veja o Guia, Parte 3).</p>')}
 const {data}=await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle();
 S={...DEF,...(data?.data||{})};const inst=S.install_btn===true&&CONFIGURED;PWA.on=inst;const th=themeOn(S);TH=th;DK=th?makeDeco(th.deco):{};AREA=th&&th.cfg.area==='top'?'top':'all';if(th&&th.cfg.colors!==false)S={...S,c1:th.c1,c2:th.c2,btn:th.btn};const r=document.documentElement.style;
 r.setProperty('--c1',S.c1);r.setProperty('--c2',S.c2);r.setProperty('--btn',S.btn);
 document.title=(document.title&&document.title!=='x'&&!document.querySelector('title[data-auto]')?document.title+' | ':'')+(S.seo_title||S.name); // data-auto: título provisório gravado pelo gerar-previas.mjs; aqui vale o valor atual do painel
 if(S.seo_desc){let m=document.querySelector('meta[name=description]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'description'}));m.content=S.seo_desc}
 if(S.favicon){let l=document.querySelector('link[rel=icon]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'icon'}));l.href=S.favicon}
 $('#hdr').innerHTML=themeUi(th)+`<header><div class=w><div class=top><a class=logo href=index.html>${logoDeco()}${S.logo?`<img src="${esc(S.logo)}" alt="">`:''}<span>${esc(S.name)}<small>${esc(S.slogan)}</small></span></a>${inst?'<button type=button id=pwai hidden aria-label="Instalar para receber ofertas">📲 <span class=t>Instalar para receber ofertas</span></button>':''}
 <form action=lista.html><input type=hidden name=tipo value=busca><input name=q placeholder="O que você está procurando?" aria-label="Pesquisar"><button aria-label="Buscar">🔍</button></form></div>
 <nav><a href=index.html>Início</a><a href="lista.html?tipo=categorias">Categorias</a><a href="lista.html?tipo=ofertas">Ofertas</a><a href="lista.html?tipo=destaques">Destaques</a><a href=contato.html>Contato</a></nav></div></header>${stripHtml()}`;
 $('#ftr').innerHTML=`${AREA==='top'?'':stripHtml()}<footer><div class=w><p><b>${esc(S.name)}</b> — ${esc(S.slogan)}</p><p><button type=button id=tema class=temabtn></button></p><p>${DISCLAIMER}</p><p>${S.footer_text?esc(S.footer_text)+'<br>':''}
 <a href="pagina.html?p=sobre">Sobre</a><a href=contato.html>Contato</a><a href="pagina.html?p=privacidade">Privacidade</a></p><p class=cpy>© ${new Date().getFullYear()} ${esc(S.name)}. Todos os direitos reservados.</p></div></footer>
 <div id=lb></div>`;
 temaBtn();
 {const here=(location.pathname.split('/').pop()||'index.html')+location.search;document.querySelectorAll('header nav a').forEach(a=>{if(a.getAttribute('href')===here){a.setAttribute('aria-current','page');const n=a.parentNode;if(a.offsetLeft+a.offsetWidth>n.clientWidth)n.scrollLeft=a.offsetLeft-12}})}
 if(th&&th.cfg.key==='natal'&&th.cfg.snd)initSound();
 fitFx();addEventListener('load',fitFx);addEventListener('resize',fitFx);
 if(CONFIGURED){swReg();pushBar().catch(e=>console.warn(e));visitTrack()}
 if(inst)import('./instalador.js').then(m=>m.init()).catch(e=>{console.warn('instalador',e);document.getElementById('pwai')?.remove()});
 return S}
// ---- monitoramento de visitantes (Estatísticas do painel): só um código anônimo de sessão, sem dados pessoais.
// Entrada ao abrir o site; sinal de atividade a cada 30 s com a aba visível; saída ao fechar/sair.
// A mesma sessão é reaproveitada por 30 min (recarregar ou trocar de página não conta nova entrada).
// Se o navegador fechar sem aviso, o servidor encerra a sessão após 3 min sem sinal.
const VK='cr_visit',VIDLE=30*60e3,VBEAT=30e3;let vOn=false;
function visitTrack(){if(vOn||navigator.webdriver||!crypto.randomUUID)return;vOn=true;
 let mem=null;const rd=()=>{try{return JSON.parse(localStorage.getItem(VK))||mem}catch(e){return mem}},wr=o=>{mem=o;try{localStorage.setItem(VK,JSON.stringify(o))}catch(e){}};
 const sid=(fresh)=>{let o=rd();if(fresh||!o||!o.id||Date.now()-(o.t||0)>VIDLE)o={id:crypto.randomUUID(),t:Date.now()};wr(o);return o.id};
 let act=Date.now(),timer=null,ended=false,inNav=0;
 const send=async(ev,keep)=>{const o=rd()||{};if(ev!=='end'&&o.id)wr({...o,t:Date.now()});
  try{const r=await fetch(U+'/rest/v1/rpc/cr_visit_track',{method:'POST',keepalive:!!keep,headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({p_sid:o.id,p_event:ev})});
   if(ev!=='end'&&r.ok&&(await r.json())==='expired'){sid(true);await send('start')}}catch(e){}};
 const stop=()=>{clearInterval(timer);timer=null};
 const beat=()=>{if(document.visibilityState!=='visible'){stop();return}
  if(Date.now()-act>VIDLE){stop();if(!ended){ended=true;send('end')}return}send('ping')};
 const wake=()=>{act=Date.now();if(document.visibilityState!=='visible')return;
  if(ended){ended=false;sid(true);send('start')}else if(!timer)send('ping');if(!timer)timer=setInterval(beat,VBEAT)};
 ['pointerdown','keydown','scroll','touchstart'].forEach(e=>addEventListener(e,()=>{const was=Date.now()-act>VIDLE;act=Date.now();if(was||ended)wake()},{passive:true,capture:true}));
 document.addEventListener('visibilitychange',()=>document.visibilityState==='visible'?wake():stop());
 // navegação interna (links do próprio site / busca): não é saída, a próxima página continua a sessão
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(a&&!e.defaultPrevented&&a.origin===location.origin&&a.target!=='_blank'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)inNav=Date.now()},true);
 document.addEventListener('submit',()=>{inNav=Date.now()},true);
 addEventListener('pagehide',()=>{stop();if(ended||Date.now()-inNav<5e3)return;send('end',true)});
 addEventListener('pageshow',e=>{if(e.persisted){ended=false;wake()}});
 sid();send('start');timer=setInterval(beat,VBEAT)}
const SEL='id,name,price,price_max,old_price,offer,offer_start,offer_end,category_id,created_at,merchants:cr_merchants(name),product_images:cr_product_images(url,sort)';
export const isOffer=p=>p.offer&&(!p.offer_end||new Date(p.offer_end)>new Date())&&(!p.offer_start||new Date(p.offer_start)<=new Date());
// preço em faixa (ex.: Shopee): "R$ 14,50 – R$ 25,90" quando price_max for maior que o preço
export const isRange=p=>p.price!=null&&p.price_max!=null&&+p.price_max>+p.price;
export const priceTxt=p=>p.price==null?'':money(p.price)+(isRange(p)?' – '+money(p.price_max):'');
// se a coluna price_max ainda não existir no banco (SQL 02 não executado), busca sem ela para o site não parar
let NOMAX=false;const sel=()=>NOMAX?SEL.replace('price_max,',''):SEL,miss=e=>!!e&&/price_max/.test(e.message||'');
export const showOld=p=>p.old_price>p.price&&(!p.offer||isOffer(p));
export const cover=p=>[...(p.product_images||[])].sort((a,b)=>a.sort-b.sort)[0]?.url||PH;
// miniatura (320px) para os cards: fotos da Shopee aceitam o sufixo _tn e ficam ~10x mais leves; as demais ficam como estão
export const thumb=p=>{const u=cover(p);return /^https:\/\/cf\.shopee\.com\.br\/file\/[\w-]+(?<!_tn)$/.test(u)?u+'_tn':u};
// ---- busca: ignora acentos, maiúsculas e espaços extras; exige TODAS as palavras (em qualquer ordem) e ordena por relevância
export const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set('a o e de da do das dos com sem para pra por em no na nos nas um uma ou'.split(' '));
// palavras da busca já normalizadas; "calças" vira "calca" para achar singular e plural
export const sTokens=q=>{const w=norm(q).split(' ').filter(Boolean),t=w.filter(x=>!STOP.has(x)&&(x.length>1||/\d/.test(x)));
 return [...new Set((t.length?t:w).map(x=>x.length>3&&/[^s]s$/.test(x)?x.slice(0,-1):x))]};
// padrão ilike que aceita a letra com ou sem acento (o servidor traz candidatos; a conferência exata é feita em sMatch)
export const sPat=t=>'%'+t.replace(/[aeiouc]/g,'_')+'%';
const sWords=s=>norm(s).split(' ');
// pontuação de relevância (0 = não atende); name e desc são o texto original
export function sMatch(toks,name,desc=''){if(!toks.length)return 1;const n=norm(name),d=norm(desc),nw=sWords(name);let sc=0;
 for(const t of toks){const inN=n.includes(t);if(!inN&&!d.includes(t))return 0;
  if(inN){sc+=10;if(nw.some(w=>w===t||w===t+'s'||w===t+'es'))sc+=6;else if(nw.some(w=>w.startsWith(t)))sc+=3;if(nw[0]?.startsWith(t))sc+=2}else sc+=1}
 const ph=toks.join(' ');if(toks.length>1&&n.includes(ph))sc+=15;if(n.startsWith(ph))sc+=5;return sc}
export const sFilter=(toks,arr,get=x=>x.name)=>!toks.length?arr:arr.map(x=>[x,sMatch(toks,get(x))]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
// candidatos no banco: cada palavra tem que aparecer no nome OU na descrição
function sQuery(r,toks,desc=true){for(const t of toks)r=desc?r.or(`name.ilike.${sPat(t)},description.ilike.${sPat(t)}`):r.ilike('name',sPat(t));return r}
export async function list(o={}){if(o.q&&sTokens(o.q).length)return search(o);let res=await list1(o);if(miss(res.error)){NOMAX=true;res=await list1(o)}return res}
async function search({q,offer,featured,cat,page=1,per=12}){const toks=sTokens(q),now=new Date().toISOString();
 const cand=async tk=>{let r=sb.from('cr_products').select('id,name,description,created_at').eq('status','active');
  if(offer)r=r.eq('offer',true).or('offer_end.is.null,offer_end.gt.'+now).or('offer_start.is.null,offer_start.lte.'+now);
  if(featured)r=r.eq('featured',true);if(cat)r=r.eq('category_id',cat);
  const {data,error}=await sQuery(r,tk).limit(2000);if(error)return {error,rows:[]};
  return {rows:(data||[]).map(p=>({id:p.id,c:p.created_at,s:sMatch(tk,p.name,p.description)})).filter(x=>x.s)}};
 let {rows,error}=await cand(toks),similar=false;
 // nada com todas as palavras: mostra os que têm pelo menos uma no nome (avisando que são parecidos)
 if(!rows.length&&!error&&toks.length>1){const m=new Map();for(const t of toks)for(const x of (await cand([t])).rows)if(x.s>=10){const o=m.get(x.id);if(o)o.s+=x.s;else m.set(x.id,x)}rows=[...m.values()];similar=rows.length>0}
 rows.sort((a,b)=>b.s-a.s||(a.c<b.c?1:-1));const ids=rows.slice((page-1)*per,page*per).map(x=>x.id);
 return {data:await byIds(ids),count:rows.length,error,similar}}
async function list1({offer,featured,q,cat,page=1,per=12}={}){
 let r=sb.from('cr_products').select(sel(),{count:'exact'}).eq('status','active');const now=new Date().toISOString();
 if(offer)r=r.eq('offer',true).or('offer_end.is.null,offer_end.gt.'+now).or('offer_start.is.null,offer_start.lte.'+now);
 if(featured)r=r.eq('featured',true);if(cat)r=r.eq('category_id',cat);
 const {data,count,error}=await r.order('created_at',{ascending:false}).range((page-1)*per,page*per-1);
 return {data:data||[],count:count||0,error}}
export async function byIds(ids){if(!ids?.length)return [];const go=()=>sb.from('cr_products').select(sel()).eq('status','active').in('id',ids);let {data,error}=await go();if(miss(error)){NOMAX=true;({data}=await go())}const m=Object.fromEntries((data||[]).map(p=>[p.id,p]));return ids.map(i=>m[i]).filter(Boolean)}
export function card(p){const o=isOffer(p);
 return `<a class=card href="produto.html?id=${p.id}"><div class=im>${o?'<span class=tag>Oferta</span>':''}<img loading=lazy decoding=async src="${esc(thumb(p))}" data-full="${esc(cover(p))}" onerror="this.onerror=null;this.src=this.dataset.full" alt="${esc(p.name)}">${cornerDeco()}</div>
 <div class=cb><h3>${esc(p.name)}</h3><div class=pr>${p.price!=null?`<b${isRange(p)?' class=rg':''}>${priceTxt(p)}</b>`:''}${showOld(p)?`<s>${money(p.old_price)}</s>`:''}</div><small>${esc(p.merchants?.name||'')}</small><span class=btn>Ver produto</span></div></a>`}

// ---- página de contato: ícones, links e configuração (guardada em cr_site_settings.data.contact)
const _sk=(d,w=2)=>`<g fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;
const _PH='M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z';
export const CTYPES={
 whatsapp:{n:'WhatsApp',g:'at',c:'#25D366',ph:'(11) 91234-5678',s:_sk('<path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z"/>')+`<path fill="#fff" transform="translate(6.6 6.6) scale(.45)" d="${_PH}"/>`},
 phone:{n:'Telefone',g:'at',c:'#1e6bff',ph:'(11) 3333-4444',s:`<path fill="#fff" d="${_PH}"/>`},
 email:{n:'E-mail',g:'at',c:'#e5384f',ph:'contato@sualoja.com',s:_sk('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>')},
 instagram:{n:'Instagram',g:'rs',c:'#d6246e',ph:'@sualoja ou link',s:_sk('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/>')+'<circle cx="17.2" cy="6.8" r="1.2" fill="#fff"/>'},
 facebook:{n:'Facebook',g:'rs',c:'#1877f2',ph:'link da página',s:'<path fill="#fff" d="M14 8.5V7c0-.8.3-1.2 1.3-1.2H17V2.2h-2.6C11.5 2.2 10.4 4 10.4 6.7v1.8H8v3.6h2.4V22H14v-9.9h2.7l.4-3.6z"/>'},
 youtube:{n:'YouTube',g:'rs',c:'#ff0000',ph:'link do canal ou @canal',s:'<rect x="2" y="5" width="20" height="14" rx="4.5" fill="#fff"/><path d="M10 8.8v6.4l5.6-3.2z" fill="#ff0000"/>'},
 site:{n:'Outro site',g:'lk',c:'#0f766e',ph:'www.seusite.com.br',s:_sk('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="3.8" ry="9"/><path d="M3 12h18"/>',1.8)}};
export const CGROUPS={at:'Atendimento',rs:'Redes sociais',lk:'Outro site'};
export const cIcon=(it,sz=44)=>{const t=CTYPES[it.type]||CTYPES.site;
 if(it.icon&&/^https?:\/\//i.test(it.icon))return `<img class=cic src="${esc(it.icon)}" alt="" width=${sz} height=${sz}>`;
 return `<svg class=cic viewBox="-4 -4 32 32" width=${sz} height=${sz} aria-hidden=true><rect x="-4" y="-4" width="32" height="32" rx="9" fill="${it.color||t.c}"/>${t.s}</svg>`};
export function cHref(it){const v=String(it.value||'').trim();if(!v)return '';const t=it.type,d=v.replace(/\D/g,'');
 if(/^(https?:\/\/|mailto:|tel:)/i.test(v))return v.replace(/\s/g,'');
 if(t==='whatsapp')return d.length>=10?'https://wa.me/'+(d.length<=11?'55'+d:d)+(it.msg?'?text='+encodeURIComponent(it.msg):''):'';
 if(t==='phone')return d.length>=8?'tel:+'+(d.length<=11?'55'+d:d):'';
 if(t==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'mailto:'+v:'';
 const B={instagram:'https://instagram.com/',facebook:'https://facebook.com/',youtube:'https://youtube.com/@'},h=v.replace(/^@/,'');
 if(B[t]&&/^[\w.-]+$/.test(h))return B[t]+h;
 if(/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v))return 'https://'+v;
 return ''}
export const CBLOCKS={sobre:'Sobre a loja',at:'Atendimento',rs:'Redes sociais',lk:'Outro site',horario:'Horário de atendimento'};
// configuração da página; se ainda não foi salva no painel, monta a partir dos dados que já existem (telefone, e-mail, Instagram, Facebook)
export function contactCfg(s){const c=s?.contact;if(c&&Array.isArray(c.items))return {...c,blocks:c.blocks?.length?c.blocks:Object.keys(CBLOCKS).map(k=>({k,on:true}))};
 const items=[];if(s?.phone)items.push({type:'whatsapp',label:'WhatsApp',value:s.phone,on:true});if(s?.email)items.push({type:'email',label:'E-mail',value:s.email,on:true});
 if(s?.instagram)items.push({type:'instagram',label:'Instagram',value:s.instagram,on:true});if(s?.facebook)items.push({type:'facebook',label:'Facebook',value:s.facebook,on:true});
 return {title:'Fale com a gente',subtitle:s?.contact_text||'Estamos aqui para ajudar. Escolha o canal que preferir.',store_name:'',intro:'',about:s?.about||'',hours:'',logo:'',show_logo:true,cover:'',
  blocks:Object.keys(CBLOCKS).map(k=>({k,on:true})),items}}

// ---- notificações push (receber ofertas no celular)
export const SW_URL=new URL('../sw.js?u='+encodeURIComponent(U)+'&k='+encodeURIComponent(K),import.meta.url).href;
export const pushOk=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
export const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let _reg=null;
export function swReg(){if(!('serviceWorker' in navigator))return Promise.resolve(null);
 return _reg||(_reg=navigator.serviceWorker.register(SW_URL,{scope:new URL('../',import.meta.url).pathname}).then(()=>navigator.serviceWorker.ready).catch(e=>{console.warn('SW',e);_reg=null;return null}))}
// chave VAPID em base64url -> Uint8Array (formato exigido pelo pushManager.subscribe)
export function b64uToBytes(s){s=String(s).trim();const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function saveSub(sub){const j=sub.toJSON();const {error}=await sb.rpc('cr_push_subscribe',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_user_agent:navigator.userAgent.slice(0,300),p_origin:location.origin});if(error)throw error;return sub}
export async function currentSub(){if(!pushOk())return null;const r=await swReg();return r?r.pushManager.getSubscription():null}
// só chame depois de um toque do visitante (o navegador exige)
export async function pushSubscribe(){
 if(!pushOk())throw new Error(isIOS()&&!isStandalone()?'No iPhone, adicione o site à Tela de Início e abra pelo ícone para ativar.':'Este navegador não aceita notificações.');
 const perm=await Notification.requestPermission();
 if(perm!=='granted')throw new Error(perm==='denied'?'As notificações estão bloqueadas. Libere nas configurações do navegador para este site.':'Permissão não concedida.');
 const r=await swReg();if(!r)throw new Error('Não foi possível preparar as notificações neste aparelho.');
 let sub=await r.pushManager.getSubscription();
 if(!sub){let key=S.vapid_public_key;if(!key){const {data}=await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle();key=data?.data?.vapid_public_key}
  if(!key)throw new Error('Notificações ainda não configuradas na loja.');
  sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(key)})}
 return saveSub(sub)}
export async function pushUnsubscribe(){const sub=await currentSub();if(!sub)return;await sb.rpc('cr_push_unsubscribe',{p_endpoint:sub.endpoint});await sub.unsubscribe()}
function iosHelp(){const d=document.createElement('div');d.id='pnh';
 d.innerHTML=`<div role=dialog aria-modal=true aria-labelledby=pnht><h3 id=pnht>📲 Ativar ofertas no iPhone</h3><p>No iPhone, as notificações só funcionam com o site instalado na Tela de Início:</p>
 <ol><li>Toque em <b>Compartilhar</b> <span aria-hidden=true>⬆️</span> (na barra do Safari).</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li><li>Abra o <b>Compras Rápidas</b> pelo novo ícone e toque de novo em <b>Receber ofertas no celular</b>.</li></ol>
 <p class=note>Precisa do iOS 16.4 ou mais novo.</p><button class="btn big" type=button>Entendi</button></div>`;
 d.onclick=e=>{if(e.target===d||e.target.tagName==='BUTTON')d.remove()};document.body.appendChild(d);d.querySelector('button').focus()}
const PN_KEY='cr_push_dismiss',PN_OK='cr_push_ok';
async function pushBar(){
 const ios=isIOS(),inst=isStandalone();
 if(!pushOk()&&!(ios&&!inst))return;          // navegador sem suporte: não mostra nada
 if(pushOk()&&Notification.permission==='denied')return;
 try{if(+localStorage.getItem(PN_KEY)>Date.now())return}catch(_){}
 let ok=false;try{ok=localStorage.getItem(PN_OK)==='1'}catch(_){}
 if(pushOk()){const sub=await currentSub().catch(()=>null);
  if(sub){if(Notification.permission==='granted')saveSub(sub).catch(()=>{});try{localStorage.setItem(PN_OK,'1')}catch(_){}return} // já inscrito: esconde (e confirma no banco)
  // permissão já dada (ex.: app instalado/APK, que às vezes perde a inscrição ao fechar): reinscreve em silêncio, sem perguntar de novo
  if(Notification.permission==='granted'){try{await pushSubscribe();try{localStorage.setItem(PN_OK,'1')}catch(_){}return}catch(e){console.warn('push',e);if(ok)return}}
 }
 if(ok)return; // já aceitou antes neste aparelho: não pergunta de novo
 document.head.insertAdjacentHTML('beforeend',`<style>#pnb{background:#fff;border-bottom:1px solid #cdd8e8;color:#12213a}#pnb .w{display:flex;align-items:center;gap:10px;padding:8px 12px;flex-wrap:wrap}#pnb p{margin:0;flex:1 1 180px;font-size:.92rem}#pnb .btn{padding:8px 14px;font-weight:700;font-size:.92rem}#pnb .x{background:none;border:0;font-size:1.4rem;line-height:1;color:#556;cursor:pointer;min-width:44px;min-height:44px}
#pnh{position:fixed;inset:0;background:#000a;z-index:60;display:grid;place-items:center;padding:16px}#pnh>div{background:#fff;border-radius:14px;padding:18px;max-width:420px;width:100%}#pnh h3{margin:0 0 8px;color:var(--c1)}#pnh ol{padding-left:20px}#pnh li{margin:6px 0}</style>`);
 const bar=document.createElement('div');bar.id='pnb';
 bar.innerHTML=`<div class=w><p>🔔 <b>Receba as melhores ofertas no celular.</b> Avisamos quando surgir novidade.</p><button class=btn type=button id=pnok>Receber ofertas no celular</button><button class=x type=button id=pnx aria-label="Agora não">×</button></div>`;
 const h=$('#hdr');(h?h:document.body).insertAdjacentElement(h?'afterend':'afterbegin',bar);
 $('#pnx').onclick=()=>{try{localStorage.setItem(PN_KEY,Date.now()+7*864e5)}catch(_){}bar.remove();fitFx()};
 $('#pnok').onclick=async()=>{if(ios&&!inst)return iosHelp();const b=$('#pnok');b.disabled=true;b.textContent='Ativando…';
  try{await pushSubscribe();try{localStorage.setItem(PN_OK,'1')}catch(_){}bar.querySelector('.w').innerHTML='<p>✅ Pronto! Você vai receber nossas ofertas neste aparelho.</p>';setTimeout(()=>{bar.remove();fitFx()},4000)}
  catch(e){b.disabled=false;b.textContent='Receber ofertas no celular';alert(e.message||e);if(Notification.permission==='denied'){bar.remove();fitFx()}}};
 fitFx()}
// Chave do tema (no rodapé): "claro" (padrão) mantém a página clara mesmo com o celular no modo escuro; "auto" deixa o navegador seguir o tema do celular.
function temaBtn(){const b=$('#tema');if(!b)return;const R=document.documentElement;let auto=R.dataset.tema==='auto';
 const draw=()=>{b.textContent=auto?'🌙 Seguindo o tema do celular — tocar para deixar sempre claro':'☀️ Tema sempre claro — tocar para seguir o tema do celular';b.setAttribute('aria-pressed',String(!auto))};
 b.onclick=()=>{auto=!auto;if(auto)R.dataset.tema='auto';else delete R.dataset.tema;try{auto?localStorage.setItem('cr_tema','auto'):localStorage.removeItem('cr_tema')}catch(e){}draw()};draw()}
