// Jogo da Cobrinha (só diversão, SEM prêmios). Carregado apenas em cobrinha.html: as outras páginas não baixam este arquivo.
// Duas partes: o MOTOR (regras puras, sem tela — fácil de conferir) e a TELA (canvas, botões, teclado, toque e som).
// Reaproveita de js/jogos.js as cores do tema ativo e a preferência "reduzir movimento". Sem bibliotecas.
// O recorde pessoal fica no aparelho (localStorage). O RANKING GERAL é conferido pelo servidor (supabase/07-cobrinha-ranking.sql):
// o servidor sorteia a semente das frutas, recebe só as viradas e refaz a partida para calcular os pontos.
// Qualquer mudança nas regras do MOTOR precisa ser repetida em cr_cobrinha_enviar, senão as partidas são recusadas.
import {cssv,calmo,OFERTAS} from './jogos.js';
import {SUPABASE_URL as U,SUPABASE_KEY as K} from '../config.js';

// ---------- MOTOR
export const N=20;            // tabuleiro N x N
export const PONTOS=10;       // pontos por alimento
export const DIRS={cima:{x:0,y:-1},baixo:{x:0,y:1},esq:{x:-1,y:0},dir:{x:1,y:0}};
// tempo entre um passo e outro (ms): começa em 160 e fica 4 ms mais rápido a cada alimento, até 70
export const intervalo=p=>Math.max(70,160-Math.floor(p/PONTOS)*4);
export const nivel=p=>1+Math.floor(p/(PONTOS*5));
export const codigo=d=>d.y<0?0:d.y>0?1:d.x<0?2:3; // 0 cima, 1 baixo, 2 esquerda, 3 direita (o mesmo código do servidor)
// sorteio das frutas com semente do servidor: gerador de Park-Miller, com contas inteiras exatas aqui e no Postgres
const PM=2147483647;
export const gerador=sem=>{let x=Math.floor(sem);if(!(x>=1&&x<PM))x=1;return len=>{x=x*48271%PM;return Math.floor(x*len/PM)}};
function sorteia(s){const oc=new Set(s.cobra.map(c=>c.y*s.n+c.x)),livres=[];for(let i=0;i<s.n*s.n;i++)if(!oc.has(i))livres.push(i);
 if(!livres.length)return null;const k=livres[s.pick(livres.length)];return {x:k%s.n,y:Math.floor(k/s.n)}}
// origem: número = semente do servidor (partida que vale para o ranking); função = sorteio comum (sem conexão)
export function novo(origem=Math.random,n=N){const m=Math.floor(n/2),pick=typeof origem==='number'?gerador(origem):len=>Math.min(len-1,Math.floor(origem()*len));
 const s={n,pick,cobra:[{x:m-1,y:m},{x:m-2,y:m},{x:m-3,y:m}],dir:DIRS.dir,fila:[],pontos:0,fim:false,comeu:false,ant:null,passos:0,log:[]};
 s.ant=s.cobra.map(c=>({...c}));s.comida=sorteia(s);return s}
// pedido de virada: entra numa fila curta (até 2), nunca permite dar meia-volta em cima do próprio corpo
export function virar(s,d){const u=s.fila.length?s.fila[s.fila.length-1]:s.dir;if(!d||s.fila.length>=2||(d.x===u.x&&d.y===u.y)||(d.x===-u.x&&d.y===-u.y))return false;s.fila.push(d);return true}
// um passo: anda, come (cresce e pontua) ou bate (parede ou corpo) e termina
// s.log guarda [passo, direção] de cada virada: é tudo o que vai para o servidor no fim
export function passo(s){if(s.fim)return s;const i=s.passos++;if(s.fila.length){s.dir=s.fila.shift();s.log.push(i,codigo(s.dir))}
 const h={x:s.cobra[0].x+s.dir.x,y:s.cobra[0].y+s.dir.y},come=!!s.comida&&h.x===s.comida.x&&h.y===s.comida.y,corpo=come?s.cobra:s.cobra.slice(0,-1); // a ponta do rabo sai do lugar no mesmo passo
 s.comeu=false;if(h.x<0||h.y<0||h.x>=s.n||h.y>=s.n||corpo.some(c=>c.x===h.x&&c.y===h.y)){s.fim=true;return s}
 s.ant=s.cobra.map(c=>({...c}));s.cobra.unshift(h);
 if(come){s.pontos+=PONTOS;s.comeu=true;s.comida=sorteia(s);if(!s.comida)s.fim=true}else s.cobra.pop();
 return s}

// ---------- TELA
const RK='cr_cobrinha_rec',SK='cr_cobrinha_som',IK='cr_cobrinha_id',AK='cr_cobrinha_apelido';
const ler=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},gravar=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
export const apelidoOk=a=>{a=String(a||'').trim().replace(/\s+/g,' ');return /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ._-]{2,12}$/.test(a)?a:''};
// código anônimo do aparelho (só identifica o aparelho no ranking; nunca aparece para ninguém)
function idAparelho(){let v=ler(IK,'');if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))return v;
 try{v=crypto.randomUUID()}catch(e){const b=new Uint8Array(16);try{crypto.getRandomValues(b)}catch(_){for(let i=0;i<16;i++)b[i]=Math.random()*256|0}b[6]=b[6]&15|64;b[8]=b[8]&63|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');v=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`}
 gravar(IK,v);return v}
const escH=t=>String(t??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
export const recorde=()=>Math.max(0,parseInt(ler(RK,'0'),10)||0);
const SETA='<svg width=26 height=26 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=3 stroke-linecap=round stroke-linejoin=round aria-hidden=true><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const TECLAS={ArrowUp:'cima',ArrowDown:'baixo',ArrowLeft:'esq',ArrowRight:'dir',w:'cima',s:'baixo',a:'esq',d:'dir'};

// o = {sb}: cliente do banco (js/db.js). Sem ele, ou sem o SQL 07 rodado, o jogo funciona normalmente, só sem ranking.
export function cobrinha(el,o={}){
 el.innerHTML=`<div class=cbh><span>Pontos <b id=cbp>0</b></span><span>Recorde <b id=cbr>0</b></span><span>Nível <b id=cbn>1</b></span></div>
 <div class=cbt><canvas role=img aria-label="Tabuleiro do Jogo da Cobrinha"></canvas><div class=cbo></div></div>
 <div class=cbb><button class=btn type=button id=cbgo>Iniciar</button><button class="btn alt" type=button id=cbrs>Reiniciar</button><button class="btn alt" type=button id=cbsom aria-pressed=false>🔇 Som</button></div>
 <div class=cbd role=group aria-label="Controles de direção">${[['cima','Para cima',0],['esq','Para a esquerda',-90],['dir','Para a direita',90],['baixo','Para baixo',180]].map(([k,t,g])=>`<button type=button class="cbk cb-${k}" data-d=${k} aria-label="${t}" style="--g:${g}deg">${SETA}</button>`).join('')}</div>
 <p class="note cbaj">No computador: setas ou W A S D (Espaço pausa). No celular: deslize o dedo no tabuleiro ou use os botões.</p><p class=sr aria-live=polite id=cbav></p>
 <section class=cbrk aria-labelledby=cbrkt hidden><h2 id=cbrkt>Ranking geral 🏆</h2><ol class=cbrl id=cbrl></ol><p class=cbrv id=cbrv></p>
  <form class=cbap id=cbap><label for=cbapi>Seu apelido no ranking</label><span><input id=cbapi maxlength=12 autocomplete=nickname enterkeyhint=done placeholder="ex.: Ana_22"><button class="btn alt" type=submit>Salvar</button></span><small class=cbae id=cbae role=alert></small></form>
  <p class="note cbpv">O ranking guarda só o apelido e os pontos, ligados a um código anônimo deste aparelho. A pontuação é conferida pelo servidor.</p></section>`;
 const q=s=>el.querySelector(s),cv=q('canvas'),g=cv.getContext('2d'),ov=q('.cbo'),bgo=q('#cbgo'),bsom=q('#cbsom'),tab=q('.cbt');
 let s=novo(),est='pronto',rec=recorde(),acc=0,ult=0,raf=0,som=ler(SK,'0')==='1',ac=null,L=0,novoRec=false;
 // ---- ranking (servidor): sessão = partida pedida ao servidor antes de começar, com a semente das frutas
 const sb=o.sb,aparelho=idAparelho();let rkOn=false,ses=null,pedindo=null,atual=null,pend=null,msgRk='';
 const pedir=()=>{if(!rkOn||ses||pedindo)return pedindo;pedindo=sb.rpc('cr_cobrinha_iniciar',{p_aparelho:aparelho}).then(({data,error})=>{pedindo=null;if(!error&&data?.id&&+data.semente>0)ses=data;else if(error)console.warn('ranking: partida não iniciada',error.message);return ses}).catch(()=>{pedindo=null;return null});return pedindo};
 const lista=r=>{const box=q('.cbrk');if(!r)return;box.hidden=false;const top=r.top||[];
  q('#cbrl').innerHTML=top.length?top.map(x=>`<li class="${x.voce?'eu':''}"><b>${x.pos}º${['',' 🥇',' 🥈',' 🥉'][x.pos]||''}</b><span>${escH(x.apelido)}${x.voce?' <small>(você)</small>':''}</span><i>${x.pontos}</i></li>`).join(''):'<li class=vz>Ninguém no ranking ainda. Seja o primeiro!</li>';
  const v=r.voce;q('#cbrv').innerHTML=v?(top.some(x=>x.voce)?`Você está em <b>${v.pos}º lugar</b> com ${v.pontos} pontos.`:`Sua posição: <b>${v.pos}º</b> de ${r.total}, com ${v.pontos} pontos.`):'Faça pontos e escolha um apelido para entrar no ranking.'};
 const carregar=async()=>{if(!sb)return;try{const {data,error}=await sb.rpc('cr_cobrinha_ranking',{p_aparelho:aparelho,p_limite:10});
  if(error){if(!error.network)return; // sem o SQL 07 (ou jogo desligado): fica sem ranking, em silêncio
   q('.cbrk').hidden=false;q('#cbrl').innerHTML='<li class=vz>Ranking indisponível sem conexão.</li>';return}
  rkOn=true;lista(data);pedir()}catch(e){}};
 q('#cbapi').value=ler(AK,'');
 q('#cbap').onsubmit=e=>{e.preventDefault();const a=apelidoOk(q('#cbapi').value);if(!a){q('#cbae').classList.remove('ok');q('#cbae').textContent='Use de 2 a 12 letras ou números.';return}
  q('#cbapi').value=a;gravar(AK,a);q('#cbae').textContent='Salvo! Vale a partir da próxima partida enviada.';q('#cbae').classList.add('ok')};
 // envio: só as viradas (s.log). Os pontos que valem são os que o servidor calcular.
 const enviar=async(p,ap)=>{pend=null;msgRk='Enviando para o ranking…';status();
  try{const {data,error}=await sb.rpc('cr_cobrinha_enviar',{p_id:p.id,p_aparelho:aparelho,p_apelido:ap||null,p_movs:p.log});
   if(error){if(/Apelido/.test(error.message||'')){msgRk='';pend={id:p.id,log:p.log,pontos:p.pontos,erro:error.message}}else msgRk='Não foi possível registrar esta partida no ranking.';status();return}
   if(data.pontos!==p.pontos)console.warn('ranking: pontos diferentes do servidor',p.pontos,data.pontos);
   const v=data.ranking?.voce;msgRk=!ap?'Partida registrada.':v?`Você está em ${v.pos}º lugar no ranking geral!`:'Partida registrada.';lista(data.ranking)}
  catch(e){msgRk='Sem conexão: esta partida não entrou no ranking.'}status()};
 // texto do ranking na tela de fim de jogo (e formulário de apelido, quando falta)
 const status=()=>{const x=ov.querySelector('.cbrs');if(!x)return;
  if(pend&&!pend.enviando){x.innerHTML=`<form class=cbaf><label for=cbafi>Coloque um apelido para entrar no ranking</label><span><input id=cbafi maxlength=12 autocomplete=nickname enterkeyhint=send value="${escH(ler(AK,''))}" placeholder="ex.: Ana_22"><button class=btn type=submit>Entrar</button></span>${pend.erro?`<small class=cbae role=alert>${escH(pend.erro)}</small>`:''}<button class=lnk type=button data-a=pular>Agora não</button></form>`;
   x.querySelector('form').onsubmit=e=>{e.preventDefault();const a=apelidoOk(x.querySelector('input').value);if(!a){pend.erro='Use de 2 a 12 letras ou números.';status();return}gravar(AK,a);q('#cbapi').value=a;const p=pend;p.enviando=true;enviar(p,a)};
   x.querySelector('[data-a=pular]').onclick=()=>{const p=pend;p.enviando=true;enviar(p,null)};return}
  x.textContent=msgRk};
 // ao sair da tela de fim sem escolher (jogar de novo ou fechar a página): a partida vai sem apelido (conta, mas não aparece)
 const soltar=()=>{if(pend&&!pend.enviando){const p=pend;p.enviando=true;enviar(p,null)}};
 addEventListener('pagehide',()=>{if(!pend||pend.enviando)return;pend.enviando=true; // keepalive: termina de enviar mesmo saindo da página
  try{fetch(U+'/rest/v1/rpc/cr_cobrinha_enviar',{method:'POST',keepalive:true,headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'},body:JSON.stringify({p_id:pend.id,p_aparelho:aparelho,p_apelido:null,p_movs:pend.log})}).catch(()=>{})}catch(e){}});
 // ---- som (opcional, desligado por padrão): bipes sintetizados, sem arquivos de áudio
 const bip=(f,d,t='square',v=.05)=>{if(!som)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const o=ac.createOscillator(),a=ac.createGain(),n=ac.currentTime;
  o.type=t;o.frequency.value=f;a.gain.setValueAtTime(v,n);a.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(a);a.connect(ac.destination);o.start(n);o.stop(n+d)}catch(e){}};
 const somUi=()=>{bsom.textContent=som?'🔊 Som':'🔇 Som';bsom.setAttribute('aria-pressed',String(som));bsom.setAttribute('aria-label',som?'Som ligado. Tocar para desligar.':'Som desligado. Tocar para ligar.')};
 bsom.onclick=()=>{som=!som;gravar(SK,som?'1':'0');somUi();bip(660,.08)};somUi();
 // ---- desenho
 const medir=()=>{const w=cv.clientWidth||320,dp=Math.min(window.devicePixelRatio||1,2),t=Math.round(w*dp);if(t!==cv.width){cv.width=cv.height=t}L=cv.width/s.n};
 const desenhar=t=>{const W=cv.width,c1=cssv('--c1','#0b2a5b'),c2=cssv('--c2','#1a5fd6'),bt=cssv('--btn','#1a5fd6');
  g.clearRect(0,0,W,W);g.fillStyle='#ffffff';g.fillRect(0,0,W,W);g.fillStyle=c2+'12';for(let y=0;y<s.n;y++)for(let x=(y%2);x<s.n;x+=2)g.fillRect(x*L,y*L,L,L); // xadrez bem leve
  if(s.comida){const p=calmo()?1:1+Math.sin(performance.now()/260)*.08,cx=(s.comida.x+.5)*L,cy=(s.comida.y+.5)*L;
   g.fillStyle='#e23b4e';g.beginPath();g.arc(cx,cy+L*.04,L*.36*p,0,7);g.fill();g.fillStyle='#ffffff99';g.beginPath();g.arc(cx-L*.12,cy-L*.08,L*.09,0,7);g.fill();
   g.strokeStyle='#2f8f46';g.lineWidth=L*.12;g.lineCap='round';g.beginPath();g.moveTo(cx,cy-L*.28);g.lineTo(cx+L*.14,cy-L*.44);g.stroke()}
  // cada gomo desliza da casa anterior para a nova (t de 0 a 1); com "reduzir movimento" anda de casa em casa
  const k=calmo()||s.fim?1:t,pt=s.cobra.map((c,i)=>{const a=s.ant[i]||s.ant[s.ant.length-1];return [(a.x+(c.x-a.x)*k+.5)*L,(a.y+(c.y-a.y)*k+.5)*L]});
  g.lineCap='round';g.lineJoin='round';g.strokeStyle=c1;g.lineWidth=L*.84;g.beginPath();pt.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
  g.strokeStyle=c2===c1?bt:c2;g.lineWidth=L*.6;g.beginPath();pt.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0]+.01,p[1]));g.stroke();
  const [hx,hy]=pt[0],d=s.dir;g.fillStyle=c1;g.beginPath();g.arc(hx,hy,L*.46,0,7);g.fill(); // cabeça com olhos virados para onde ela vai
  for(const sn of [-1,1]){const ex=hx+d.x*L*.14+d.y*sn*L*.2,ey=hy+d.y*L*.14+d.x*sn*L*.2;g.fillStyle='#fff';g.beginPath();g.arc(ex,ey,L*.13,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(ex+d.x*L*.05,ey+d.y*L*.05,L*.06,0,7);g.fill()}};
 // ---- placar e telas por cima do tabuleiro
 const placar=()=>{q('#cbp').textContent=s.pontos;q('#cbr').textContent=Math.max(rec,s.pontos);q('#cbn').textContent=nivel(s.pontos)};
 const tela=()=>{bgo.textContent=est==='jogando'?'Pausar':est==='pausado'?'Continuar':est==='fim'?'Jogar de novo':'Iniciar';tab.dataset.e=est;
  ov.hidden=est==='jogando';
  ov.innerHTML=est==='pronto'?'<p class=cbtt>Jogo da Cobrinha</p><p>Coma as frutas, cresça e não bata nas paredes nem no próprio corpo.</p><button class="btn big" type=button data-a=go>Iniciar</button>'
   :est==='pausado'?'<p class=cbtt>Jogo pausado</p><button class="btn big" type=button data-a=go>Continuar</button>'
   :est==='fim'?`<p class=cbtt>Fim de jogo</p><p>Você fez <b class=cbfp>${s.pontos}</b> ${s.pontos===1?'ponto':'pontos'}.${novoRec?' <span class=cbnr>Novo recorde pessoal! 🎉</span>':` <span class=cbsr>Seu recorde: <b>${rec}</b></span>`}</p><div class=cbrs aria-live=polite></div><button class="btn big" type=button data-a=go>Jogar de novo</button><p class=cblk><a href="${OFERTAS}">Ver ofertas</a><span aria-hidden=true>·</span><a href="jogos.html">Voltar aos jogos</a></p>`:''};
 const avisar=t=>{q('#cbav').textContent=t};
 // ---- laço do jogo: só roda enquanto está jogando (pausado, parado ou em outra aba = zero processamento)
 const quadro=agora=>{if(est!=='jogando')return;acc+=Math.min(250,agora-ult);ult=agora;let iv=intervalo(s.pontos);
  while(acc>=iv&&!s.fim){acc-=iv;passo(s);if(s.comeu){bip(740,.07);bip(990,.09,'square',.04);placar()}iv=intervalo(s.pontos)}
  if(s.fim){fim();return}desenhar(acc/iv);raf=requestAnimationFrame(quadro)};
 const rodar=()=>{est='jogando';acc=0;ult=performance.now();tela();cancelAnimationFrame(raf);raf=requestAnimationFrame(quadro)};
 // ao começar, ajusta a rolagem (o mínimo possível) para o tabuleiro e os botões de direção caberem juntos na tela
 const enquadrar=()=>{try{const d=q('.cbd'),topo=q('.cbh').getBoundingClientRect().top,fundo=(d.offsetParent?d:tab).getBoundingClientRect().bottom,vh=window.innerHeight;
  let dy=fundo>vh?Math.min(fundo-vh+8,Math.max(0,tab.getBoundingClientRect().top-4)):topo<0?topo-8:0; // desce só o que falta, sem esconder o topo do tabuleiro; ou sobe se o placar ficou cortado
  if(dy)window.scrollBy({top:dy,behavior:calmo()?'auto':'smooth'})}catch(e){}};
 const comecar=()=>{soltar();atual=ses;ses=null;s=novo(atual?+atual.semente:Math.random);msgRk=rkOn&&!atual?'Sem conexão com o ranking: esta partida não vai valer pontos no ranking.':'';
  if(rkOn)setTimeout(pedir,1500);novoRec=false;medir();placar();avisar('Partida iniciada.');enquadrar();rodar()};
 const pausar=()=>{if(est!=='jogando')return;est='pausado';cancelAnimationFrame(raf);tela();desenhar(1);avisar('Jogo pausado.')};
 const fim=()=>{est='fim';cancelAnimationFrame(raf);novoRec=s.pontos>rec;if(novoRec){rec=s.pontos;gravar(RK,String(rec))}placar();desenhar(1);
  if(atual){const p={id:atual.id,log:s.log.slice(),pontos:s.pontos};atual=null;const ap=ler(AK,'');if(s.pontos>0&&!apelidoOk(ap)){pend=p;msgRk=''}else{tela();enviar(p,apelidoOk(ap))}}
  tela();status();bip(220,.25,'sawtooth');setTimeout(()=>bip(150,.35,'sawtooth'),160);
  avisar(`Fim de jogo. Você fez ${s.pontos} pontos.${novoRec?' Novo recorde pessoal!':''}`)};
 const principal=()=>{if(est==='jogando')pausar();else if(est==='pausado'){avisar('Jogo retomado.');rodar()}else comecar()};
 const mover=k=>{const d=DIRS[k];if(!d)return;if(est==='pronto'){comecar();virar(s,d)}else if(est==='jogando'&&virar(s,d))bip(330,.03,'sine',.03)};
 bgo.onclick=principal;q('#cbrs').onclick=comecar;ov.addEventListener('click',e=>{if(e.target.closest('[data-a=go]'))principal()});
 // ---- controles: botões grandes (toque), deslizar no tabuleiro e teclado
 el.querySelectorAll('.cbk').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();mover(b.dataset.d)});b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mover(b.dataset.d)}})});
 let p0=null;tab.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;p0=[e.clientX,e.clientY]});
 tab.addEventListener('pointermove',e=>{if(!p0)return;const dx=e.clientX-p0[0],dy=e.clientY-p0[1];if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;mover(Math.abs(dx)>Math.abs(dy)?(dx>0?'dir':'esq'):(dy>0?'baixo':'cima'));p0=[e.clientX,e.clientY]});
 ['pointerup','pointercancel','pointerleave'].forEach(t=>tab.addEventListener(t,()=>{p0=null}));
 // a página não rola enquanto o dedo está no tabuleiro ou nos botões (touch-action:none no CSS; isto cobre navegadores antigos)
 [tab,q('.cbd')].forEach(x=>x.addEventListener('touchmove',e=>{if(est==='jogando')e.preventDefault()},{passive:false}));
 const tecla=e=>{if(!el.isConnected){document.removeEventListener('keydown',tecla);return}if(e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName||''))return;
  const k=TECLAS[e.key]||TECLAS[String(e.key).toLowerCase()];
  if(k){if(est==='jogando'||est==='pronto'){e.preventDefault();mover(k)}return} // as setas só deixam de rolar a página durante a partida
  if((e.key===' '||e.code==='Space')&&!e.target.closest?.('button,a')&&(est==='jogando'||est==='pausado')){e.preventDefault();principal()}};
 document.addEventListener('keydown',tecla);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pausar()}); // trocou de aba ou bloqueou o celular: pausa sozinho
 addEventListener('resize',()=>{medir();if(est!=='jogando')desenhar(1)});
 medir();placar();tela();desenhar(1);carregar()}
