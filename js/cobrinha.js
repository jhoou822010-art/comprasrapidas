// Jogo da Cobrinha (só diversão, SEM prêmios). Carregado apenas em cobrinha.html: as outras páginas não baixam este arquivo.
// Duas partes: o MOTOR (regras puras, sem tela — fácil de conferir) e a TELA (canvas, botões, teclado, toque e som).
// Reaproveita de js/jogos.js as cores do tema ativo e a preferência "reduzir movimento". Sem bibliotecas.
// O recorde pessoal fica só no aparelho do visitante (localStorage); nada é enviado ao banco.
import {cssv,calmo,OFERTAS} from './jogos.js';

// ---------- MOTOR
export const N=20;            // tabuleiro N x N
export const PONTOS=10;       // pontos por alimento
export const DIRS={cima:{x:0,y:-1},baixo:{x:0,y:1},esq:{x:-1,y:0},dir:{x:1,y:0}};
// tempo entre um passo e outro (ms): começa em 160 e fica 4 ms mais rápido a cada alimento, até 70
export const intervalo=p=>Math.max(70,160-Math.floor(p/PONTOS)*4);
export const nivel=p=>1+Math.floor(p/(PONTOS*5));
function sorteia(s){const oc=new Set(s.cobra.map(c=>c.y*s.n+c.x)),livres=[];for(let i=0;i<s.n*s.n;i++)if(!oc.has(i))livres.push(i);
 if(!livres.length)return null;const k=livres[Math.min(livres.length-1,Math.floor(s.rnd()*livres.length))];return {x:k%s.n,y:Math.floor(k/s.n)}}
export function novo(rnd=Math.random,n=N){const m=Math.floor(n/2),s={n,rnd,cobra:[{x:m-1,y:m},{x:m-2,y:m},{x:m-3,y:m}],dir:DIRS.dir,fila:[],pontos:0,fim:false,comeu:false,ant:null};
 s.ant=s.cobra.map(c=>({...c}));s.comida=sorteia(s);return s}
// pedido de virada: entra numa fila curta (até 2), nunca permite dar meia-volta em cima do próprio corpo
export function virar(s,d){const u=s.fila.length?s.fila[s.fila.length-1]:s.dir;if(!d||s.fila.length>=2||(d.x===u.x&&d.y===u.y)||(d.x===-u.x&&d.y===-u.y))return false;s.fila.push(d);return true}
// um passo: anda, come (cresce e pontua) ou bate (parede ou corpo) e termina
export function passo(s){if(s.fim)return s;if(s.fila.length)s.dir=s.fila.shift();
 const h={x:s.cobra[0].x+s.dir.x,y:s.cobra[0].y+s.dir.y},come=!!s.comida&&h.x===s.comida.x&&h.y===s.comida.y,corpo=come?s.cobra:s.cobra.slice(0,-1); // a ponta do rabo sai do lugar no mesmo passo
 s.comeu=false;if(h.x<0||h.y<0||h.x>=s.n||h.y>=s.n||corpo.some(c=>c.x===h.x&&c.y===h.y)){s.fim=true;return s}
 s.ant=s.cobra.map(c=>({...c}));s.cobra.unshift(h);
 if(come){s.pontos+=PONTOS;s.comeu=true;s.comida=sorteia(s);if(!s.comida)s.fim=true}else s.cobra.pop();
 return s}

// ---------- TELA
const RK='cr_cobrinha_rec',SK='cr_cobrinha_som';
const ler=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},gravar=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
export const recorde=()=>Math.max(0,parseInt(ler(RK,'0'),10)||0);
const SETA='<svg width=26 height=26 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=3 stroke-linecap=round stroke-linejoin=round aria-hidden=true><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const TECLAS={ArrowUp:'cima',ArrowDown:'baixo',ArrowLeft:'esq',ArrowRight:'dir',w:'cima',s:'baixo',a:'esq',d:'dir'};

export function cobrinha(el){
 el.innerHTML=`<div class=cbh><span>Pontos <b id=cbp>0</b></span><span>Recorde <b id=cbr>0</b></span><span>Nível <b id=cbn>1</b></span></div>
 <div class=cbt><canvas role=img aria-label="Tabuleiro do Jogo da Cobrinha"></canvas><div class=cbo></div></div>
 <div class=cbb><button class=btn type=button id=cbgo>Iniciar</button><button class="btn alt" type=button id=cbrs>Reiniciar</button><button class="btn alt" type=button id=cbsom aria-pressed=false>🔇 Som</button></div>
 <div class=cbd role=group aria-label="Controles de direção">${[['cima','Para cima',0],['esq','Para a esquerda',-90],['dir','Para a direita',90],['baixo','Para baixo',180]].map(([k,t,g])=>`<button type=button class="cbk cb-${k}" data-d=${k} aria-label="${t}" style="--g:${g}deg">${SETA}</button>`).join('')}</div>
 <p class="note cbaj">No computador: setas ou W A S D (Espaço pausa). No celular: deslize o dedo no tabuleiro ou use os botões.</p><p class=sr aria-live=polite id=cbav></p>`;
 const q=s=>el.querySelector(s),cv=q('canvas'),g=cv.getContext('2d'),ov=q('.cbo'),bgo=q('#cbgo'),bsom=q('#cbsom'),tab=q('.cbt');
 let s=novo(),est='pronto',rec=recorde(),acc=0,ult=0,raf=0,som=ler(SK,'0')==='1',ac=null,L=0,novoRec=false;
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
   :est==='fim'?`<p class=cbtt>Fim de jogo</p><p>Você fez <b class=cbfp>${s.pontos}</b> ${s.pontos===1?'ponto':'pontos'}.</p>${novoRec?'<p class=cbnr>Novo recorde pessoal! 🎉</p>':`<p>Seu recorde: <b>${rec}</b></p>`}<button class="btn big" type=button data-a=go>Jogar de novo</button><a class="btn alt" href="${OFERTAS}">Ver ofertas</a><a class=cbvl href="jogos.html">Voltar aos jogos</a>`:''};
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
 const comecar=()=>{s=novo();novoRec=false;medir();placar();avisar('Partida iniciada.');enquadrar();rodar()};
 const pausar=()=>{if(est!=='jogando')return;est='pausado';cancelAnimationFrame(raf);tela();desenhar(1);avisar('Jogo pausado.')};
 const fim=()=>{est='fim';cancelAnimationFrame(raf);novoRec=s.pontos>rec;if(novoRec){rec=s.pontos;gravar(RK,String(rec))}placar();desenhar(1);tela();bip(220,.25,'sawtooth');setTimeout(()=>bip(150,.35,'sawtooth'),160);
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
 medir();placar();tela();desenhar(1)}
