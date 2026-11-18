// Jogos da vitrine (Raspadinha e Roleta): só diversão, SEM prêmios, descontos ou cupons.
// O "resultado" é sempre um destino dentro do próprio site (ofertas, achadinhos, categoria, produto ou link interno).
// Configuração: chave "jogos" de cr_site_settings.data (painel › Jogos). Contagem: tabela cr_jogos_eventos (supabase/05-jogos.sql).
// Sem bibliotecas: canvas e JavaScript puro. Usado por jogos.html e pelo painel (js/jogos-admin.js).
import {SUPABASE_URL as U,SUPABASE_KEY as K} from '../config.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const TIPOS={todas:'Todas as ofertas',achadinhos:'Achadinhos baratos',categoria:'Uma categoria',produto:'Um produto',link:'Link interno do site'};
export const MAXR=12; // máximo de resultados (fatias legíveis na roleta)
export const DEF={raspadinha:false,roleta:false,cobrinha:false,banner:false,achadinhos_max:30,limite:0,resultados:[
 {txt:'Ver todas as ofertas',emoji:'🛍️',tipo:'todas',valor:'',peso:3},
 {txt:'Achadinhos baratos',emoji:'💸',tipo:'achadinhos',valor:'',peso:3},
 {txt:'Destaques da vitrine',emoji:'⭐',tipo:'link',valor:'lista.html?tipo=destaques',peso:2},
 {txt:'Explorar categorias',emoji:'🧭',tipo:'link',valor:'lista.html?tipo=categorias',peso:1}]};
// link interno: só caminho relativo do próprio site (sem "http:", sem "//", sem "..")
export const linkOk=v=>/^[\w.?=&%#-][\w.\/?=&%#-]*$/.test(v||'')&&!v.includes('..');
// lê a configuração salva e corrige qualquer valor fora do esperado
export function cfg(s){const j=s?.jogos||{},n=(v,d,a,b)=>{v=Number(v);return Number.isFinite(v)?Math.min(b,Math.max(a,v)):d};
 const rs=(Array.isArray(j.resultados)?j.resultados:DEF.resultados).slice(0,MAXR).map(r=>({txt:String(r?.txt||'').trim().slice(0,40),emoji:String(r?.emoji||'').trim().slice(0,8),tipo:TIPOS[r?.tipo]?r.tipo:'todas',valor:String(r?.valor||'').trim().slice(0,200),peso:n(r?.peso,1,0,100)}));
 return {raspadinha:j.raspadinha===true,roleta:j.roleta===true,cobrinha:j.cobrinha===true,banner:j.banner===true,achadinhos_max:n(j.achadinhos_max,30,1,100000),limite:Math.round(n(j.limite,0,0,99)),resultados:rs}}
export const ligado=c=>c.raspadinha||c.roleta||c.cobrinha; // cobrinha: jogo com página própria (cobrinha.html, js/cobrinha.js)
export const valido=r=>!!r.txt&&r.peso>0&&(r.tipo==='todas'||r.tipo==='achadinhos'||(r.tipo==='link'?linkOk(r.valor):!!r.valor));
export const OFERTAS='lista.html?tipo=ofertas';
export const destino=r=>r.tipo==='achadinhos'?'lista.html?tipo=achadinhos':r.tipo==='categoria'&&r.valor?'lista.html?tipo=categoria&slug='+encodeURIComponent(r.valor):r.tipo==='produto'&&r.valor?'produto.html?id='+encodeURIComponent(r.valor):r.tipo==='link'&&linkOk(r.valor)?r.valor:OFERTAS;
// sorteio pelo peso (peso maior = mais chance de cair)
export function sortear(rs,rnd=Math.random){const t=rs.reduce((a,r)=>a+r.peso,0);let x=rnd()*t;for(const r of rs){x-=r.peso;if(x<0)return r}return rs[rs.length-1]}

// ---- limite de jogadas por dia, por aparelho (vale para os dois jogos juntos; 0 = sem limite)
const LK='cr_jogos_dia';let mem=null;
const hoje=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function lido(){let o=mem;try{o=JSON.parse(localStorage.getItem(LK))||mem}catch(e){}return o&&o.d===hoje()&&o.n>=0?o:{d:hoje(),n:0}}
export const jogadas=()=>lido().n;
export const podeJogar=lim=>!lim||lido().n<lim;
export function contar(){const o=lido();o.n++;mem=o;try{localStorage.setItem(LK,JSON.stringify(o))}catch(e){}}
// sem internet (página aberta pelo cache do app): usa a última configuração vista neste aparelho
const CK='cr_jogos_cfg';
export function lembrar(S){try{if(S?.jogos)localStorage.setItem(CK,JSON.stringify(S.jogos));else if(!navigator.onLine){const j=JSON.parse(localStorage.getItem(CK));if(j)return {...S,jogos:j}}}catch(e){}return S}

// ---- contagem anônima: "jogou" e "clicou" (no botão do resultado). keepalive termina de gravar mesmo trocando de página
export function registrar(jogo,tipo,r){try{fetch(U+'/rest/v1/cr_jogos_eventos',{method:'POST',keepalive:true,headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=minimal'},
 body:JSON.stringify({jogo,tipo,resultado:r?.txt?String(r.txt).slice(0,60):null,destino:TIPOS[r?.tipo]?r.tipo:null})}).catch(()=>{})}catch(e){}}

// ---- cores do tema ativo (as mesmas variáveis que o site usa: --c1, --c2 e --btn)
const hex=c=>{const m=/^#([0-9a-f]{6})$/i.exec(String(c||'').trim());return m?[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)):null};
export const cssv=(k,d)=>{let v='';try{v=getComputedStyle(document.documentElement).getPropertyValue(k).trim()}catch(e){}return hex(v)?v.toLowerCase():d};
const mix=(c,p)=>'#'+hex(c).map(x=>Math.round(x+(255-x)*p).toString(16).padStart(2,'0')).join('');
const claro=c=>{const [r,g,b]=hex(c);return (r*299+g*587+b*114)/1000>150};
export function cores(){const b=[...new Set([cssv('--c1','#0b2a5b'),cssv('--c2','#1a5fd6'),cssv('--btn','#1a5fd6')])];return b.flatMap(c=>[c,mix(c,.8)])}
export const calmo=()=>{try{return matchMedia('(prefers-reduced-motion:reduce)').matches}catch(e){return false}};

// ---- telas comuns: resultado (com o botão grande do destino) e limite do dia
function bloqueio(el){el.innerHTML=`<div class=jres><p class=jem aria-hidden=true>🌙</p><p class=jtt>Volte amanhã para jogar de novo</p><p class=note>As jogadas de hoje neste aparelho já foram usadas.</p><a class="btn big" href="${OFERTAS}">Ver ofertas</a></div>`}
function mostrar(out,jogo,r,o,denovo){const p=r.tipo==='produto'?o.prods?.[r.valor]:null,ok=podeJogar(o.lim);
 out.innerHTML=`<div class=jres><p class=jtt>Olha o que separamos pra você!</p>${p?.img?`<img src="${esc(p.img)}" alt="" width=120 height=120>`:''}<a class="btn big jgo" href="${esc(destino(r))}">${esc((r.emoji?r.emoji+' ':'')+r.txt)} →</a>${ok?`<button class="btn alt" type=button>${jogo==='roleta'?'Girar de novo':'Raspar outro cartão'}</button>`:`<p class=jlim>Volte amanhã para jogar de novo.</p><a class="btn alt" href="${OFERTAS}">Ver ofertas</a>`}</div>`;
 out.querySelector('.jgo').addEventListener('click',()=>registrar(jogo,'clicou',r));
 const b=out.querySelector('button');if(b)b.onclick=denovo;
 try{out.scrollIntoView({block:'nearest',behavior:calmo()?'auto':'smooth'})}catch(e){}}

// ---- RASPADINHA: o cartão é um canvas por cima do resultado; raspar apaga a tinta. Com ~50% raspado, revela tudo.
// o = {rs: resultados válidos, lim: limite por dia, prods: {id: {img}}}
const GX=24,GY=15; // grade usada para medir quanto já foi raspado (sem ler os pixels do canvas)
function capa(cv){const g=cv.getContext('2d'),w=cv.width,h=cv.height,gr=g.createLinearGradient(0,0,w,h);
 gr.addColorStop(0,cssv('--c2','#1a5fd6'));gr.addColorStop(1,cssv('--c1','#0b2a5b'));g.globalCompositeOperation='source-over';g.fillStyle=gr;g.fillRect(0,0,w,h);
 g.fillStyle='#ffffff2e';for(let i=0;i<40;i++){g.beginPath();g.arc((i*97%100)/100*w,(i*53%100)/100*h,w*(.006+(i%4)*.004),0,7);g.fill()}
 g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${Math.round(w*.085)}px system-ui,sans-serif`;g.fillText('Raspe aqui ✨',w/2,h/2-w*.02);
 g.font=`${Math.round(w*.045)}px system-ui,sans-serif`;g.fillText('com o dedo ou com o mouse',w/2,h/2+w*.075)}
export function raspadinha(el,o){
 const novo=()=>{if(!podeJogar(o.lim))return bloqueio(el);
  const r=sortear(o.rs);
  el.innerHTML=`<div class=rsp><div class=rsu><span class=jem aria-hidden=true>${esc(r.emoji||'✨')}</span><b>${esc(r.txt)}</b></div><canvas role=img aria-label="Cartão da raspadinha. Raspe para revelar."></canvas></div><p class="note rsd">Raspe o cartão com o dedo ou com o mouse.</p><button class="lnk rsd" type=button>Revelar sem raspar</button><div class=jout aria-live=polite></div>`;
  const cv=el.querySelector('canvas'),box=el.querySelector('.rsp'),out=el.querySelector('.jout'),bx=cv.getBoundingClientRect(),dp=Math.min(window.devicePixelRatio||1,2);
  cv.width=Math.round(bx.width*dp)||640;cv.height=Math.round(bx.height*dp)||400;capa(cv);
  const g=cv.getContext('2d'),raio=cv.width*.075,cel=new Uint8Array(GX*GY);let feito=0,ini=false,fim=false,baixo=false,ult=null;
  const comecar=()=>{if(ini)return;ini=true;contar();registrar('raspadinha','jogou',r)};
  const marca=(x,y)=>{const cw=cv.width/GX,ch=cv.height/GY;for(let j=Math.max(0,Math.floor((y-raio)/ch));j<=Math.min(GY-1,Math.floor((y+raio)/ch));j++)for(let i=Math.max(0,Math.floor((x-raio)/cw));i<=Math.min(GX-1,Math.floor((x+raio)/cw));i++){
   if(!cel[j*GX+i]&&Math.hypot((i+.5)*cw-x,(j+.5)*ch-y)<=raio){cel[j*GX+i]=1;feito++}}};
  const risca=(a,b)=>{g.globalCompositeOperation='destination-out';g.lineWidth=raio*2;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0]+.01,b[1]);g.stroke();
   const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(raio/2)));for(let k=0;k<=n;k++)marca(a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n)};
  const revelar=()=>{if(fim)return;fim=true;comecar();cv.classList.add('fim');box.classList.add('on');el.querySelectorAll('.rsd').forEach(x=>x.remove());
   setTimeout(()=>{cv.remove();mostrar(out,'raspadinha',r,o,novo)},calmo()?0:480)};
  const pos=e=>{const b=cv.getBoundingClientRect();return [(e.clientX-b.left)*cv.width/(b.width||1),(e.clientY-b.top)*cv.height/(b.height||1)]};
  cv.addEventListener('pointerdown',e=>{if(fim)return;e.preventDefault();comecar();baixo=true;ult=pos(e);try{cv.setPointerCapture(e.pointerId)}catch(_){}risca(ult,ult)});
  cv.addEventListener('pointermove',e=>{if(!baixo||fim)return;e.preventDefault();const p=pos(e);risca(ult,p);ult=p;if(feito/(GX*GY)>=.5)revelar()});
  const solta=()=>{baixo=false;if(!fim&&feito/(GX*GY)>=.5)revelar()};cv.addEventListener('pointerup',solta);cv.addEventListener('pointercancel',solta);
  // a página não rola enquanto o dedo raspa (touch-action:none no CSS; isto cobre navegadores antigos)
  ['touchstart','touchmove'].forEach(t=>cv.addEventListener(t,e=>e.preventDefault(),{passive:false}));
  el.querySelector('button.rsd').onclick=revelar};
 novo()}

// ---- ROLETA: fatias desenhadas uma vez no canvas; o giro é uma rotação CSS suave até a fatia sorteada parar no ponteiro (em cima).
export function roleta(el,o){if(!podeJogar(o.lim))return bloqueio(el);
 const base=o.rs.slice(0,MAXR),fat=[];for(let k=Math.max(1,Math.ceil(6/base.length));k>0;k--)fat.push(...base); // poucas opções: repete para a roda ficar cheia
 el.innerHTML=`<div class=rlt><span class=rpt aria-hidden=true></span><canvas width=640 height=640 role=img aria-label="Roleta com ${base.length} ${base.length===1?'opção':'opções'}"></canvas></div><button class="btn big rgo" type=button>Girar a roleta</button><div class=jout aria-live=polite></div>`;
 const cv=el.querySelector('canvas'),btn=el.querySelector('.rgo'),out=el.querySelector('.jout'),g=cv.getContext('2d'),N=fat.length,seg=2*Math.PI/N,T=640,R=T/2-8,pal=cores(),fs=N>10?22:N>8?25:28;
 fat.forEach((r,i)=>{let c=pal[i%pal.length];if(i===N-1&&c===pal[0])c=pal[2%pal.length];const a=-Math.PI/2+i*seg; // fatia i fica centrada a i*seg do topo, no sentido horário
  g.beginPath();g.moveTo(T/2,T/2);g.arc(T/2,T/2,R,a-seg/2,a+seg/2);g.closePath();g.fillStyle=c;g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.stroke();
  g.save();g.translate(T/2,T/2);g.rotate(a);g.fillStyle=claro(c)?'#14213d':'#fff';g.textBaseline='middle';g.textAlign='right';
  let t=r.txt,f=fs;const larg=R-64-50,fonte=()=>{g.font=`600 ${f}px system-ui,sans-serif`};fonte(); // texto longo: primeiro diminui a letra, só depois corta
  while(f>18&&g.measureText(t).width>larg){f--;fonte()}while(t.length>4&&g.measureText(t).width>larg)t=t.slice(0,-2).trimEnd()+'…';g.fillText(t,R-64,0);
  if(r.emoji){g.textAlign='center';g.font=`${fs+8}px system-ui,sans-serif`;g.fillText(r.emoji,R-34,2)}g.restore()});
 g.beginPath();g.arc(T/2,T/2,R,0,7);g.strokeStyle=pal[0];g.lineWidth=10;g.stroke();
 g.beginPath();g.arc(T/2,T/2,38,0,7);g.fillStyle='#fff';g.fill();g.strokeStyle=pal[0];g.lineWidth=8;g.stroke();
 let rot=0,girando=false;
 btn.onclick=()=>{if(girando)return;if(!podeJogar(o.lim))return bloqueio(el);girando=true;btn.disabled=true;out.innerHTML='';contar();
  const r=sortear(base),ix=fat.map((x,i)=>x===r?i:-1).filter(i=>i>=0),k=ix[Math.floor(Math.random()*ix.length)],red=calmo();registrar('roleta','jogou',r);
  const alvo=(360-k*360/N+(Math.random()-.5)*(360/N)*.7+360)%360;rot=rot-rot%360+(red?360:1800)+alvo;
  cv.style.transition=red?'none':'';cv.style.transform=`rotate(${rot}deg)`; // "reduzir movimento": vai direto para a fatia, sem girar
  let ok=false;const fim=()=>{if(ok)return;ok=true;girando=false;btn.disabled=false;btn.hidden=!podeJogar(o.lim);mostrar(out,'roleta',r,o,()=>btn.click())};
  if(red)setTimeout(fim,200);else{cv.addEventListener('transitionend',fim,{once:true});setTimeout(fim,5400)}}}
