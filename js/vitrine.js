// SISTEMA INTELIGENTE DA VITRINE — módulo independente da loja.
// O que ele faz: escolhe QUAIS produtos aparecem e EM QUE ORDEM (Ofertas e Novidades do Início e a ordem dentro das categorias).
// O que ele NUNCA faz: alterar produtos, preços, imagens, descrições ou links de afiliado. Ele só lê cr_products e devolve uma lista de IDs.
// Perfil de interesses: anônimo e guardado SOMENTE no aparelho do visitante (localStorage). Nada de comportamento é enviado ao servidor.
// Configuração: cr_site_settings.data.vitrine (já lida pela loja em todo carregamento; nenhuma tabela nova).
// Segurança: toda função pública trata os próprios erros. Se algo falhar, a página usa a vitrine original.
// Desligar: painel > Sistema Inteligente da Vitrine > desmarcar "Ligado". Forçar original numa página: ?vitrine=0. Testar sem ligar para todos: ?vitrine=teste.
import {sb,norm,sTokens,isOffer} from './app.js';

export const SEGS={economico:'Econômico',achadinhos:'Achadinhos',feminino:'Feminino',masculino:'Masculino',tecnologia:'Tecnologia',ferramentas:'Ferramentas',casa:'Casa e utilidades'};
export const PROFS={...SEGS,misto:'Misto'};
export const SEG_KEYS=Object.keys(SEGS);

// ---- configuração padrão (o painel salva uma cópia editável em cr_site_settings.data.vitrine)
// Regras dos segmentos: categorias (cats = lista de IDs; null = automático pelo nome da categoria em cat_pat),
// palavras-chave no nome do produto (vírgula; * no fim = começo de palavra) e exclusões.
export const DEF={
 on:false,hours:6,base:'misto',intensity:80,
 areas:{ofertas:true,novidades:true,categorias:true},
 privacy_optout:true,
 rules:{
  economico:{cats:null,cat_pat:'',kw:'',excl:'',max_price:30},
  achadinhos:{cats:null,cat_pat:'',kw:'mini*, portatil, portateis, criativ*, divertid*, retro, magnetic*, inteligente*, led, organizador*',excl:'',min_disc:30},
  feminino:{cats:null,cat_pat:'feminin',kw:'feminin*, mulher*, vestido*, saia*, blusa*, cropped, sutia*, calcinha*, maquiag*, batom*, brinco*, colar*, pulseira*, bolsa*, legging*, pantalona*, macacao*, regata*',excl:'masculin*, menino*'},
  masculino:{cats:null,cat_pat:'masculin',kw:'masculin*, homem, homens, cueca*, barba*, bermuda*, carteira*',excl:'feminin*, menina*'},
  tecnologia:{cats:null,cat_pat:'eletronic|tecnolog',kw:'bluetooth, usb, wifi, fone*, smartwatch*, carregador*, hub, cabo*, mouse, teclado*, notebook*, celular*, camera*, impressora*, gamer, headset*',excl:''},
  ferramentas:{cats:null,cat_pat:'ferrament',kw:'ferrament*, furadeira*, parafusadeira*, alicate*, martelo*, trena*, serra*, broca*, chave de, multimetro*, solda*, esmerilhadeira*, macaco hidraulico, compressor*',excl:''},
  casa:{cats:null,cat_pat:'casa|cozinha|eletrodomestic|utilidade',kw:'cozinha, banheiro, organizador*, panela*, pote*, toalha*, lixeira*, prateleira*, cabide*, limpeza',excl:''}},
 // Perfis de composição: porcentagem de cada segmento na vitrine ("livre" = melhores produtos de qualquer segmento). Soma 100.
 profiles:{
  economico:{economico:60,achadinhos:20,livre:20},
  achadinhos:{achadinhos:60,economico:20,livre:20},
  feminino:{feminino:60,achadinhos:15,economico:10,livre:15},
  masculino:{masculino:60,ferramentas:10,tecnologia:10,livre:20},
  tecnologia:{tecnologia:60,achadinhos:15,ferramentas:10,livre:15},
  ferramentas:{ferramentas:55,tecnologia:15,casa:10,livre:20},
  casa:{casa:60,economico:15,achadinhos:10,livre:15},
  misto:{economico:12,achadinhos:12,feminino:12,masculino:12,tecnologia:12,ferramentas:12,casa:12,livre:16}}};

const clone=o=>JSON.parse(JSON.stringify(o));
// junta o que está salvo com o padrão (campos novos ou ausentes recebem o padrão)
export function cfg(S){const v=S&&typeof S.vitrine==='object'&&S.vitrine||{},c=clone(DEF);
 for(const k of ['on','privacy_optout'])if(typeof v[k]==='boolean')c[k]=v[k];
 const h=+v.hours;if(h>=0.5&&h<=720)c.hours=h;
 if(PROFS[v.base])c.base=v.base;
 const it=+v.intensity;if(v.intensity!=null&&it>=0&&it<=100)c.intensity=it;
 if(v.areas)for(const k in c.areas)if(typeof v.areas[k]==='boolean')c.areas[k]=v.areas[k];
 if(v.rules)for(const k of SEG_KEYS)if(v.rules[k])c.rules[k]={...c.rules[k],...v.rules[k]};
 if(v.profiles)for(const k in c.profiles){const p=v.profiles[k];if(p&&typeof p==='object'){const o={};let s=0;for(const x of [...SEG_KEYS,'livre']){const n=Math.max(0,+p[x]||0);if(n){o[x]=n;s+=n}}if(s>0)c.profiles[k]=o}}
 return c}

// ---- estado do módulo
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const SS={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};
const K_PROF='cr_vi',K_POOL='cr_vpool',K_ON='cr_von',K_OFF='cr_vi_off';
let C=null,ON=false;

// Decide se a vitrine inteligente vale para esta página. Chame depois do boot() com as configurações da loja.
// ?vitrine=0 força a vitrine original; ?vitrine=teste liga só nesta aba (para o administrador validar antes de ligar para todos).
export function start(S){try{
 const q=new URLSearchParams(location.search).get('vitrine');
 if(q==='0')SS.set('cr_vtest','0');else if(q==='teste'||q==='1')SS.set('cr_vtest','1');
 const t=SS.get('cr_vtest');C=cfg(S);
 ON=t==='0'?false:t==='1'?true:!!C.on;
 LS.set(K_ON,C.on?1:0);   // lembra para pré-carregar na próxima visita
 if(ON)observe();
 return ON}catch(e){ON=false;return false}}
export const isOn=()=>ON;
export const area=k=>ON&&!!C?.areas?.[k];
export const testMode=()=>SS.get('cr_vtest')==='1';

// Visitante pediu para não personalizar (página de privacidade) ou o navegador envia o sinal de privacidade (GPC): sem perfil, só rodízio.
export const optedOut=()=>{try{return localStorage.getItem(K_OFF)==='1'||navigator.globalPrivacyControl===true}catch(e){return false}};
export function setOptOut(v){try{if(v){localStorage.setItem(K_OFF,'1');LS.del(K_PROF)}else localStorage.removeItem(K_OFF)}catch(e){}}

// ---- catálogo enxuto (só o necessário para escolher), com cache de 20 min no aparelho.
// Uma única consulta, somente leitura, só produtos ativos. Nada é gravado no banco.
const POOL_TTL=20*60e3,POOL_SEL='id,name,price,old_price,offer,offer_start,offer_end,category_id,created_at,categories:cr_categories(name)';
let poolMem=null,poolReq=null;
const slim=r=>({id:r.id,n:r.name,p:r.price==null?null:+r.price,o:r.old_price==null?null:+r.old_price,of:!!r.offer,os:r.offer_start,oe:r.offer_end,c:r.category_id,cn:r.categories?.name||'',t:r.created_at});
function poolCached(){if(poolMem&&Date.now()-poolMem.t<POOL_TTL)return poolMem.rows;const x=LS.get(K_POOL);if(x&&Array.isArray(x.rows)&&Date.now()-x.t<POOL_TTL){poolMem=x;return x.rows}return null}
export function pool(){const c=poolCached();if(c)return Promise.resolve(c);
 if(!poolReq)poolReq=(async()=>{const {data,error}=await sb.from('cr_products').select(POOL_SEL).eq('status','active').order('created_at',{ascending:false}).limit(5000);
  if(error)throw error;const rows=(data||[]).map(slim);poolMem={t:Date.now(),rows};LS.set(K_POOL,poolMem);return rows})().finally(()=>{poolReq=null});
 return poolReq}
// começa a buscar o catálogo em paralelo com o resto da página, mas só se na última visita o sistema estava ligado
export function prefetch(){try{const t=SS.get('cr_vtest');if(t==='0')return;if(t==='1'||LS.get(K_ON)===1)pool().catch(()=>{})}catch(e){}}
// espera o catálogo no máximo ms milissegundos; se demorar, a página segue com a vitrine original
export const poolWithin=(ms=3500)=>Promise.race([pool(),new Promise((_,r)=>setTimeout(()=>r(new Error('vitrine: tempo esgotado')),ms))]);

// ---- regras: palavras-chave
const kwList=s=>String(s||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const pre=x.endsWith('*');const t=norm(pre?x.slice(0,-1):x);return t?{t,pre,multi:t.includes(' ')}:null}).filter(Boolean);
const kwHit=(list,nn,words)=>list.some(k=>k.multi?(' '+nn+' ').includes(' '+k.t+(k.pre?'':' ')):k.pre?words.some(w=>w.startsWith(k.t)):words.some(w=>w===k.t||w===k.t+'s'||w===k.t+'es'));
const disc=p=>p.o>0&&p.p!=null&&p.o>p.p?(p.o-p.p)/p.o*100:0;
const offerOn=p=>isOffer({offer:p.of,offer_start:p.os,offer_end:p.oe});

// Regras compiladas (uma vez por configuração)
function compile(c){const R={};for(const k of SEG_KEYS){const r=c.rules[k];let pat=null;try{pat=r.cat_pat?new RegExp(r.cat_pat,'i'):null}catch(e){}
 R[k]={cats:Array.isArray(r.cats)?new Set(r.cats):null,pat,kw:kwList(r.kw),ex:kwList(r.excl),max:+r.max_price||0,disc:+r.min_disc||0}}return R}
// Em quais segmentos o produto entra (0 a 1 em cada). Usa só nome, categoria, preço e desconto já cadastrados.
export function segsOf(p,R){if(p._s)return p._s;const nn=norm(p.n),w=nn.split(' '),cn=norm(p.cn),s={};
 for(const k of SEG_KEYS){const r=R[k];if(r.ex.length&&kwHit(r.ex,nn,w))continue;let v=0;
  const inCat=r.cats?r.cats.has(p.c):!!(r.pat&&cn&&r.pat.test(cn));if(inCat)v=1;else if(r.kw.length&&kwHit(r.kw,nn,w))v=.9;
  if(k==='economico'&&r.max&&p.p!=null)v=Math.max(v,p.p<=r.max?1:p.p<=r.max*1.6?.45:0);
  if(k==='achadinhos'){const d=disc(p);if(r.disc&&d>=r.disc&&offerOn(p))v=Math.max(v,1);else if(v&&p.p!=null&&p.p>250)v*=.5}
  if(v)s[k]=v}
 Object.defineProperty(p,'_s',{value:s,enumerable:false,configurable:true});return s}
export const classify=(rows,c)=>{const R=compile(c||C||DEF);for(const p of rows)delete p._s;return rows.map(p=>({p,s:segsOf(p,R)}))};

// ---- perfil individual (anônimo, só neste aparelho)
const HALF=21*864e5;           // meia-vida dos interesses: 21 dias (interesses antigos perdem força aos poucos)
const W={search:3,cat:2,view:2,click:1,buy:4};
const newProf=()=>({v:1,id:(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)),t0:Date.now(),lu:Date.now(),ev:0,seg:{},cat:{},tok:{},pr:{n:0,s:0,q:0},sel:null,hist:{e:-1,ids:[]},prev:[]});
function loadProf(){const p=LS.get(K_PROF);return p&&p.v===1&&p.id?p:newProf()}
function decay(p){const f=Math.pow(.5,(Date.now()-(p.lu||Date.now()))/HALF);if(f<.999){for(const m of [p.seg,p.cat,p.tok])for(const k in m){m[k]*=f;if(m[k]<.05)delete m[k]}p.ev*=f;p.pr.n*=f;p.pr.s*=f;p.pr.q*=f}p.lu=Date.now()}
const cap=(m,n)=>{const e=Object.entries(m);if(e.length>n){e.sort((a,b)=>b[1]-a[1]);for(const [k] of e.slice(n))delete m[k]}};
const add=(m,k,v)=>{if(k)m[k]=(m[k]||0)+v};
const STOPW=new Set('kit com sem para de da do das dos em no na unidades unidade pecas peca cm mm ml litros original novo nova cor cores tamanho modelo premium pro'.split(' '));
const nameToks=n=>[...new Set(norm(n).split(' ').filter(x=>x.length>=4&&!STOPW.has(x)&&!/^\d/.test(x)))].slice(0,5);
const ECON=/\b(barat\w*|econom\w*|promo\w*|em conta|precinho)\b/,ACH=/\b(oferta\w*|desconto\w*|achad\w*|liquida\w*)\b/;

// Registra um sinal de interesse. Nunca envia nada ao servidor. Ignorado com o sistema desligado ou se o visitante recusou.
// tipo: 'search' {q} · 'cat' {id} · 'view' {p} (produto com price/category_id/name) · 'click' {id} · 'buy' {p}
export function track(type,d={}){try{if(!ON||optedOut())return;const w=W[type];if(!w)return;
 const P=loadProf();decay(P);const R=compile(C);P.ev+=w;
 const obs=pr=>{if(pr>0){const l=Math.log(pr);P.pr.n+=w;P.pr.s+=l*w;P.pr.q+=l*l*w}};
 if(type==='search'){const q=String(d.q||'').slice(0,120),nq=norm(q),toks=sTokens(q);for(const t of toks.filter(t=>t.length>=3&&!/^\d+$/.test(t)))add(P.tok,t,w);
  if(ECON.test(nq))add(P.seg,'economico',w);if(ACH.test(nq))add(P.seg,'achadinhos',w);
  const m=nq.match(/(?:ate|abaixo de|menos de|por)\s*r?\s*(\d{1,5})/)||nq.match(/(\d{1,5})\s*reais/);if(m)obs(+m[1]);
  // palavras da busca que batem com as regras (ex.: "furadeira" → Ferramentas)
  const w2=nq.split(' ');for(const k of SEG_KEYS){const r=R[k];if(r.kw.length&&kwHit(r.kw,nq,w2)&&!(r.ex.length&&kwHit(r.ex,nq,w2)))add(P.seg,k,w)}
  // produtos que a busca encontraria (catálogo já guardado no aparelho; sem consulta nova): categorias e segmentos deles ganham força
  const rows=poolCached();if(rows&&toks.length){const hit=rows.filter(p=>{const n=norm(p.n);return toks.every(t=>n.includes(t))}).slice(0,12);
   if(hit.length){const f=w/hit.length;for(const p of hit){add(P.cat,p.c,f);for(const [k,v] of Object.entries(segsOf(p,R)))if(k!=='economico'&&k!=='achadinhos')add(P.seg,k,f*v*.8)}}}}
 else if(type==='cat')add(P.cat,d.id,w);
 else{let p=d.p;if(!p&&d.id){const rows=poolCached();p=rows&&rows.find(x=>x.id===d.id)}if(p){const sp=p.n!=null?p:slim(p);
  add(P.cat,sp.c,w);obs(sp.p);for(const t of nameToks(sp.n))add(P.tok,t,w*.35);for(const [k,v] of Object.entries(segsOf(sp,R)))add(P.seg,k,w*v*.6);
  if(type!=='click'){P.seen=(P.seen||[]).filter(x=>x!==sp.id);P.seen.unshift(sp.id);P.seen.length=Math.min(P.seen.length,30)}}}
 cap(P.cat,30);cap(P.tok,40);cap(P.seg,10);LS.set(K_PROF,P)}catch(e){}}

// cliques nos cards de produto (qualquer página que carregou o módulo)
let obsOn=false;function observe(){if(obsOn)return;obsOn=true;
 document.addEventListener('click',e=>{const a=e.target.closest?.('a.card[href*="produto.html?id="]');if(!a)return;const id=new URL(a.href,location.href).searchParams.get('id');if(id)track('click',{id})},{capture:true,passive:true})}

// ---- números aleatórios reproduzíveis (mesma semente = mesma vitrine dentro do intervalo de renovação)
const h32=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rnd=(seed,id)=>{let x=h32(seed+'|'+id);x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;return (x>>>0)/4294967296};

// período atual de renovação deste visitante (cada visitante tem seu próprio relógio, a partir da 1ª visita)
const epochOf=(P,c)=>Math.floor((Date.now()-(P.t0||0))/(Math.max(.5,c.hours)*36e5));

// Mistura final de segmentos para este visitante = perfil base do administrador combinado com os perfis dos interesses aprendidos.
// confiança cresce aos poucos com a quantidade de sinais: uma única busca muda pouco; vários sinais na mesma direção mudam mais.
export function mixFor(P,c){const base=c.profiles[c.base]||c.profiles.misto,tot=Object.values(P.seg||{}).reduce((a,b)=>a+b,0);
 const conf=1-Math.exp(-(P.ev||0)/8),k=(c.intensity/100)*conf;const out={};
 let interests=[];if(tot>0&&k>0){interests=Object.entries(P.seg).map(([s,v])=>[s,v/tot]).filter(x=>x[1]>=.12&&c.profiles[x[0]]);const t2=interests.reduce((a,x)=>a+x[1],0);interests=interests.map(([s,v])=>[s,v/t2])}
 const kk=interests.length?k:0;   // sem interesses claros: fica só o perfil base
 for(const [s,v] of Object.entries(base))out[s]=(out[s]||0)+v*(1-kk);
 for(const [s,w] of interests)for(const [x,v] of Object.entries(c.profiles[s]))out[x]=(out[x]||0)+v*kk*w;
 const sum=Object.values(out).reduce((a,b)=>a+b,0)||1;for(const s in out)out[s]=out[s]/sum;
 return {mix:out,conf,k:kk,interests}}

// pontuação individual de um produto (quanto combina com o que o visitante procura)
function scorer(P,c,seed,R,opt={}){const mc=Math.max(1,...Object.values(P.cat||{})),mt=Math.max(1,...Object.values(P.tok||{})),st=Object.values(P.seg||{}).reduce((a,b)=>a+b,0)||1;
 const pn=P.pr?.n||0,mu=pn>=2?P.pr.s/pn:null,sd=pn>=2?Math.max(.45,Math.sqrt(Math.max(0,P.pr.q/pn-mu*mu))):1;
 const prev1=new Set(P.prev?.[0]||[]),prev2=new Set(P.prev?.[1]||[]),seen=new Set(P.seen||[]);const toks=Object.entries(P.tok||{});
 return p=>{let s=0;const nn=norm(p.n);
  if(P.cat?.[p.c])s+=2.2*P.cat[p.c]/mc;
  let tk=0;for(const [t,v] of toks)if(nn.includes(t))tk+=v;s+=Math.min(2.5,2.5*tk/mt);
  if(mu!=null&&p.p>0){const z=(Math.log(p.p)-mu)/sd;s+=1.2*Math.exp(-z*z/2)}
  for(const [k,v] of Object.entries(segsOf(p,R)))s+=.8*v*(P.seg?.[k]||0)/st;
  s+=(opt.jit??1.6)*rnd(seed,p.id);                       // variedade a cada renovação
  if(prev1.has(p.id))s-=1.4;else if(prev2.has(p.id))s-=.6;   // evita repetir o que apareceu nos últimos períodos
  if(seen.has(p.id))s-=.3;                                 // já abriu este produto recentemente
  return s}}

// Monta a lista de um setor com as porcentagens da mistura (maiores restos) e depois ordena com variedade de categorias.
function compose(cands,n,mix,score,R){const sc=new Map(cands.map(p=>[p.id,score(p)]));const by=(a,b)=>sc.get(b.id)-sc.get(a.id);
 const ents=Object.entries(mix),raw=ents.map(([k,v])=>[k,v*n]);const q=Object.fromEntries(raw.map(([k,v])=>[k,Math.floor(v)]));
 let rest=n-Object.values(q).reduce((a,b)=>a+b,0);raw.sort((a,b)=>(b[1]%1)-(a[1]%1));for(const [k] of raw){if(rest<=0)break;q[k]++;rest--}
 const used=new Set(),pick=[];const take=(arr,m,tag)=>{for(const p of arr){if(m<=0)break;if(used.has(p.id))continue;used.add(p.id);pick.push([p,tag]);m--}return m};
 let left=0;for(const [k] of ents.filter(([k])=>k!=='livre').sort((a,b)=>b[1]-a[1])){const arr=cands.filter(p=>(segsOf(p,R)[k]||0)>=.45).sort(by);left+=take(arr,q[k]||0,k)}
 take([...cands].sort(by),(q.livre||0)+left,'livre');
 // ordem: melhores primeiro, sem 3 seguidos da mesma categoria
 const sorted=pick.sort((a,b)=>sc.get(b[0].id)-sc.get(a[0].id)).map(x=>x[0]),outp=[];
 while(sorted.length){let i=0;const L=outp.length;if(L>=2&&outp[L-1].c===outp[L-2].c){const j=sorted.findIndex(p=>p.c!==outp[L-1].c);if(j>0)i=j}outp.push(sorted.splice(i,1)[0])}
 return outp}

function ctx(){const P=optedOut()?newProf():loadProf();const e=epochOf(P,C);
 if(P.hist?.e!==e){if(P.hist&&P.hist.e>=0&&P.hist.ids?.length)P.prev=[P.hist.ids,...(P.prev||[])].slice(0,2);P.hist={e,ids:[]};P.sel=null}   // renovou: novos produtos, mesmos interesses
 return {P,e,seed:P.id+':'+e,R:compile(C)}}
const sigOf=(P,mx)=>Object.entries(mx.mix).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]+Math.round(x[1]*10)).join(',')+'|'+(Object.entries(P.cat||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]||'');

// Vitrine do Início. keys = seções a personalizar com a quantidade; devolve {chave: [ids em ordem]} com folga extra
// (a página remove os já exibidos no carrossel/seções anteriores e corta na quantidade). Mesma seleção dentro do período.
export function home(rows,secs,exclude=new Set()){const {P,e,seed,R}=ctx();const mx=mixFor(P,C),sig=sigOf(P,mx);
 const valid=new Set(rows.map(p=>p.id));const out={};
 for(const {key,qty} of secs){const n=Math.max(1,qty|0),want=n+12;
  const cached=P.sel&&P.sel.e===e&&P.sel.sig===sig&&P.sel[key];
  if(cached&&cached.length>=n&&cached.every(id=>valid.has(id))){out[key]=cached;continue}
  let cands=rows.filter(p=>!exclude.has(p.id));
  if(key==='ofertas')cands=cands.filter(offerOn);
  const score0=scorer(P,C,seed+':'+key,R);let score=score0;
  if(key==='novidades'){const win=Math.max(60,n*5);cands=cands.slice().sort((a,b)=>a.t<b.t?1:-1).slice(0,win);const rk=new Map(cands.map((p,i)=>[p.id,i]));score=p=>score0(p)+1.6*(1-rk.get(p.id)/win)}
  if(!cands.length){out[key]=[];continue}
  out[key]=compose(cands,Math.min(want,cands.length),mx.mix,score,R).map(p=>p.id)}
 P.sel={...(P.sel?.e===e&&P.sel?.sig===sig?P.sel:{}),...out,e,sig};if(!optedOut())LS.set(K_PROF,P);
 return out}
// Ordem dos produtos dentro de uma categoria (todas as páginas). Estável dentro do período de renovação.
export function category(rows,catId){const {P,seed,R}=ctx();const cands=rows.filter(p=>p.c===catId);
 const score0=scorer(P,C,seed+':cat:'+catId,R,{jit:1.1}),win=cands.length||1,rk=new Map(cands.map((p,i)=>[p.id,i]));   // rows já vêm dos mais novos para os mais antigos
 const sc=new Map(cands.map(p=>[p.id,score0(p)+.6*(1-rk.get(p.id)/win)]));
 return cands.sort((a,b)=>sc.get(b.id)-sc.get(a.id)).map(p=>p.id)}
// guarda o que foi exibido neste período (para a próxima renovação evitar repetições)
export function shown(ids){try{if(!ON||optedOut())return;const P=loadProf(),e=epochOf(P,C);if(P.hist?.e!==e){if(P.hist&&P.hist.e>=0&&P.hist.ids?.length)P.prev=[P.hist.ids,...(P.prev||[])].slice(0,2);P.hist={e,ids:[]}}
 P.hist.ids=[...new Set([...P.hist.ids,...ids])].slice(0,150);LS.set(K_PROF,P)}catch(e){}}

// ---- usado pelo painel (prévia/simulação). Não grava nada.
export function simulate(rows,c,signals,{qty=15,seed='simulacao',key='ofertas'}={}){C=cfg({vitrine:c});C.areas={ofertas:true,novidades:true,categorias:true};
 const P=newProf();P.id=seed;const R=compile(C);
 for(const [k,v] of Object.entries(signals.seg||{}))P.seg[k]=v;for(const [k,v] of Object.entries(signals.cat||{}))P.cat[k]=v;for(const [k,v] of Object.entries(signals.tok||{}))P.tok[k]=v;
 if(signals.price){const l=Math.log(signals.price);P.pr={n:4,s:4*l,q:4*l*l}}P.ev=signals.ev??Object.values(P.seg).reduce((a,b)=>a+b,0);
 const mx=mixFor(P,C);let cands=key==='ofertas'?rows.filter(offerOn):rows;
 const list=compose(cands,Math.min(qty,cands.length),mx.mix,scorer(P,C,seed,R),R);
 return {mix:mx,list,segs:list.map(p=>segsOf(p,R))}}
