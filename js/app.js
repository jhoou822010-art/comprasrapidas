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
 S={...DEF,...(data?.data||{})};const th=themeOn(S);TH=th;DK=th?makeDeco(th.deco):{};AREA=th&&th.cfg.area==='top'?'top':'all';if(th&&th.cfg.colors!==false)S={...S,c1:th.c1,c2:th.c2,btn:th.btn};const r=document.documentElement.style;
 r.setProperty('--c1',S.c1);r.setProperty('--c2',S.c2);r.setProperty('--btn',S.btn);
 document.title=(document.title&&document.title!=='x'?document.title+' | ':'')+(S.seo_title||S.name);
 if(S.seo_desc){let m=document.querySelector('meta[name=description]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'description'}));m.content=S.seo_desc}
 if(S.favicon){let l=document.querySelector('link[rel=icon]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'icon'}));l.href=S.favicon}
 $('#hdr').innerHTML=themeUi(th)+`<header><div class=w><div class=top><a class=logo href=index.html>${logoDeco()}${S.logo?`<img src="${esc(S.logo)}" alt="">`:''}<span>${esc(S.name)}<small>${esc(S.slogan)}</small></span></a>
 <form action=lista.html><input type=hidden name=tipo value=busca><input name=q placeholder="O que você está procurando?" aria-label="Pesquisar"><button aria-label="Buscar">🔍</button></form></div>
 <nav><a href=index.html>Início</a><a href="lista.html?tipo=categorias">Categorias</a><a href="lista.html?tipo=ofertas">Ofertas</a><a href="lista.html?tipo=destaques">Destaques</a><a href=contato.html>Contato</a></nav></div></header>${stripHtml()}`;
 $('#ftr').innerHTML=`${AREA==='top'?'':stripHtml()}<footer><div class=w><p><b>${esc(S.name)}</b> — ${esc(S.slogan)}</p><p>${DISCLAIMER}</p><p>${S.footer_text?esc(S.footer_text)+'<br>':''}
 <a href="pagina.html?p=sobre">Sobre</a><a href=contato.html>Contato</a><a href="pagina.html?p=privacidade">Privacidade</a></p><p class=cpy>© ${new Date().getFullYear()} ${esc(S.name)}. Todos os direitos reservados.</p></div></footer>
 <div id=lb></div>`;
 {const here=(location.pathname.split('/').pop()||'index.html')+location.search;document.querySelectorAll('header nav a').forEach(a=>{if(a.getAttribute('href')===here){a.setAttribute('aria-current','page');const n=a.parentNode;if(a.offsetLeft+a.offsetWidth>n.clientWidth)n.scrollLeft=a.offsetLeft-12}})}
 if(th&&th.cfg.key==='natal'&&th.cfg.snd)initSound();
 fitFx();addEventListener('load',fitFx);addEventListener('resize',fitFx);
 return S}
const SEL='id,name,price,old_price,offer,offer_start,offer_end,category_id,created_at,merchants:cr_merchants(name),product_images:cr_product_images(url,sort)';
export const isOffer=p=>p.offer&&(!p.offer_end||new Date(p.offer_end)>new Date())&&(!p.offer_start||new Date(p.offer_start)<=new Date());
export const showOld=p=>p.old_price>p.price&&(!p.offer||isOffer(p));
export const cover=p=>[...(p.product_images||[])].sort((a,b)=>a.sort-b.sort)[0]?.url||PH;
export async function list({offer,featured,q,cat,page=1,per=12}={}){
 let r=sb.from('cr_products').select(SEL,{count:'exact'}).eq('status','active');const now=new Date().toISOString();
 if(offer)r=r.eq('offer',true).or('offer_end.is.null,offer_end.gt.'+now).or('offer_start.is.null,offer_start.lte.'+now);
 if(featured)r=r.eq('featured',true);if(cat)r=r.eq('category_id',cat);
 if(q){q=q.replace(/[,()%*]/g,' ').trim();r=r.or(`name.ilike.%${q}%,description.ilike.%${q}%`)}
 const {data,count,error}=await r.order('created_at',{ascending:false}).range((page-1)*per,page*per-1);
 return {data:data||[],count:count||0,error}}
export async function byIds(ids){if(!ids?.length)return [];const {data}=await sb.from('cr_products').select(SEL).eq('status','active').in('id',ids);const m=Object.fromEntries((data||[]).map(p=>[p.id,p]));return ids.map(i=>m[i]).filter(Boolean)}
export function card(p){const o=isOffer(p);
 return `<a class=card href="produto.html?id=${p.id}"><div class=im>${o?'<span class=tag>Oferta</span>':''}<img loading=lazy decoding=async src="${esc(cover(p))}" alt="${esc(p.name)}">${cornerDeco()}</div>
 <div class=cb><h3>${esc(p.name)}</h3><div class=pr>${p.price!=null?`<b>${money(p.price)}</b>`:''}${showOld(p)?`<s>${money(p.old_price)}</s>`:''}</div><small>${esc(p.merchants?.name||'')}</small><span class=btn>Ver produto</span></div></a>`}

// ---- página de contato: ícones, links e configuração (guardada em cr_site_settings.data.contact)
const _sk=(d,w=2)=>`<g fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;
const _PH='M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z';
export const CTYPES={
 whatsapp:{n:'WhatsApp',g:'at',c:'#25D366',ph:'(11) 91234-5678',s:_sk('<path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z"/>')+`<path fill="#fff" transform="translate(6.6 6.6) scale(.45)" d="${_PH}"/>`},
 phone:{n:'Telefone',g:'at',c:'#1e6bff',ph:'(11) 3333-4444',s:`<path fill="#fff" d="${_PH}"/>`},
 email:{n:'E-mail',g:'at',c:'#e5384f',ph:'contato@sualoja.com',s:_sk('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>')},
 location:{n:'Endereço',g:'at',c:'#d97706',ph:'Rua Exemplo, 123 - Cidade/UF',s:'<path fill="#fff" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/>'},
 instagram:{n:'Instagram',g:'rs',c:'#d6246e',ph:'@sualoja ou link',s:_sk('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/>')+'<circle cx="17.2" cy="6.8" r="1.2" fill="#fff"/>'},
 facebook:{n:'Facebook',g:'rs',c:'#1877f2',ph:'link da página',s:'<path fill="#fff" d="M14 8.5V7c0-.8.3-1.2 1.3-1.2H17V2.2h-2.6C11.5 2.2 10.4 4 10.4 6.7v1.8H8v3.6h2.4V22H14v-9.9h2.7l.4-3.6z"/>'},
 youtube:{n:'YouTube',g:'rs',c:'#ff0000',ph:'link do canal ou @canal',s:'<rect x="2" y="5" width="20" height="14" rx="4.5" fill="#fff"/><path d="M10 8.8v6.4l5.6-3.2z" fill="#ff0000"/>'},
 tiktok:{n:'TikTok',g:'rs',c:'#111111',ph:'@sualoja ou link',s:'<path fill="#fff" d="M15.6 2.5h-3.3v12.7a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V9.2a6.1 6.1 0 1 0 5.2 6V8.9a7.4 7.4 0 0 0 4.3 1.4V7a4.3 4.3 0 0 1-4.3-4.5z"/>'},
 x:{n:'X (Twitter)',g:'rs',c:'#111111',ph:'@sualoja ou link',s:_sk('<path d="M4.5 4h4.2l10.8 16h-4.2zM19 4l-6.1 7M11.1 13 5 20"/>',1.8)},
 telegram:{n:'Telegram',g:'rs',c:'#229ed9',ph:'@sualoja ou link',s:'<path fill="#fff" d="M21.4 3.6 2.9 10.8c-1 .4-1 1.5 0 1.8l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.4 4.8 3.5c.7.5 1.6.1 1.8-.7l3.1-14.7c.2-1-.8-1.8-1.8-1.4zM9.6 14.3l8.2-7.4-6.7 8.6-.4 2.6z"/>'},
 linkedin:{n:'LinkedIn',g:'rs',c:'#0a66c2',ph:'link do perfil',s:'<g fill="#fff"><rect x="3.5" y="9" width="3.6" height="11.5"/><circle cx="5.3" cy="5.3" r="2.1"/><path d="M9.8 9h3.4v1.6c.6-1 1.8-1.9 3.6-1.9 2.8 0 3.7 1.8 3.7 4.5v7.3h-3.6v-6.4c0-1.4-.4-2.3-1.7-2.3s-1.8 1-1.8 2.3v6.4H9.8z"/></g>'},
 pinterest:{n:'Pinterest',g:'rs',c:'#e60023',ph:'@sualoja ou link',s:'<text x="12" y="18" text-anchor="middle" font-size="17" font-weight="700" font-family="Georgia,serif" fill="#fff">P</text>'},
 site:{n:'Site',g:'lk',c:'#0f766e',ph:'www.seusite.com.br',s:_sk('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="3.8" ry="9"/><path d="M3 12h18"/>',1.8)},
 shop:{n:'Loja / marketplace',g:'lk',c:'#ee4d2d',ph:'link da sua loja',s:_sk('<path d="M5 8h14l-1.2 12.5H6.2z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>')},
 link:{n:'Link personalizado',g:'lk',c:'#6a28b5',ph:'https://...',s:_sk('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')}};
export const CGROUPS={at:'Atendimento',rs:'Redes sociais',lk:'Outros sites e links'};
export const cIcon=(it,sz=44)=>{const t=CTYPES[it.type]||CTYPES.link;
 if(it.icon&&/^https?:\/\//i.test(it.icon))return `<img class=cic src="${esc(it.icon)}" alt="" width=${sz} height=${sz}>`;
 return `<svg class=cic viewBox="-4 -4 32 32" width=${sz} height=${sz} aria-hidden=true><rect x="-4" y="-4" width="32" height="32" rx="9" fill="${it.color||t.c}"/>${t.s}</svg>`};
export function cHref(it){const v=String(it.value||'').trim();if(!v)return '';const t=it.type,d=v.replace(/\D/g,'');
 if(/^(https?:\/\/|mailto:|tel:)/i.test(v))return v.replace(/\s/g,'');
 if(t==='whatsapp')return d.length>=10?'https://wa.me/'+(d.length<=11?'55'+d:d)+(it.msg?'?text='+encodeURIComponent(it.msg):''):'';
 if(t==='phone')return d.length>=8?'tel:+'+(d.length<=11?'55'+d:d):'';
 if(t==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'mailto:'+v:'';
 if(t==='location')return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v);
 const B={instagram:'https://instagram.com/',facebook:'https://facebook.com/',youtube:'https://youtube.com/@',tiktok:'https://www.tiktok.com/@',x:'https://x.com/',telegram:'https://t.me/',pinterest:'https://pinterest.com/',linkedin:'https://www.linkedin.com/in/'},h=v.replace(/^@/,'');
 if(B[t]&&/^[\w.-]+$/.test(h))return B[t]+h;
 if(/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v))return 'https://'+v;
 return ''}
export const CBLOCKS={sobre:'Sobre a loja',at:'Atendimento',rs:'Redes sociais',lk:'Outros sites e links',horario:'Horário de atendimento'};
// configuração da página; se ainda não foi salva no painel, monta a partir dos dados que já existem (telefone, e-mail, Instagram, Facebook)
export function contactCfg(s){const c=s?.contact;if(c&&Array.isArray(c.items))return {...c,blocks:c.blocks?.length?c.blocks:Object.keys(CBLOCKS).map(k=>({k,on:true}))};
 const items=[];if(s?.phone)items.push({type:'whatsapp',label:'WhatsApp',value:s.phone,on:true});if(s?.email)items.push({type:'email',label:'E-mail',value:s.email,on:true});
 if(s?.instagram)items.push({type:'instagram',label:'Instagram',value:s.instagram,on:true});if(s?.facebook)items.push({type:'facebook',label:'Facebook',value:s.facebook,on:true});
 return {title:'Fale com a gente',subtitle:s?.contact_text||'Estamos aqui para ajudar. Escolha o canal que preferir.',store_name:'',intro:'',about:s?.about||'',hours:'',logo:'',show_logo:true,cover:'',
  blocks:Object.keys(CBLOCKS).map(k=>({k,on:true})),items}}
