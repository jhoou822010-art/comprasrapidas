// Brick Game 2 em 1 (só diversão, SEM prêmios): A = Corrida, B = Blocos. Carregado apenas em brickgame.html.
// Duas partes: o MOTOR (regras puras, sem tela — fácil de conferir) e o APARELHO (tela LCD em canvas, botões, teclado, toque e som).
// Sem bibliotecas, sem imagens e sem internet depois de carregado. Os recordes ficam só no aparelho (localStorage).

// ================= MOTOR =================
export const W=10,H=20;

// ---------- A) Corrida: duas faixas, carros vindo de cima; o seu carro fica embaixo
// desenho do carro (4 linhas):  .X.  /  XXX  /  .X.  /  X.X
export const CARRO=[[1,0],[0,1],[1,1],[2,1],[1,2],[0,3],[2,3]];
export const FAIXAS=[2,5];          // coluna da esquerda do carro em cada faixa (paredes nas colunas 0 e 9)
export const PY=H-4;                // linha de cima do carro do jogador
export const carro=(x,y)=>CARRO.map(([dx,dy])=>[x+dx,y+dy]);
export const rNivel=s=>Math.min(10,1+Math.floor(s.pontos/150));          // sobe a cada 150 linhas percorridas
export const rIntervalo=(s,turbo)=>Math.max(40,150-(rNivel(s)-1)*11)/(turbo?3:1); // ms entre passos
export function corrida(rnd=Math.random){return {jogo:'A',rnd,faixa:0,inimigos:[],pista:0,pontos:0,fim:false,vao:9}}
// batida: outro carro na mesma faixa ocupando alguma das 4 linhas do seu carro (como se vê na tela)
export function rBateu(s){return s.inimigos.some(e=>e.faixa===s.faixa&&e.y<=PY+3&&e.y+3>=PY)}
export function rMover(s,d){if(s.fim)return false;const f=Math.max(0,Math.min(1,s.faixa+d));if(f===s.faixa)return false;s.faixa=f;s.fim=rBateu(s);return true}
export function rPasso(s){if(s.fim)return s;
 s.pista=(s.pista+1)%4;s.inimigos.forEach(e=>e.y++);s.inimigos=s.inimigos.filter(e=>e.y<H);s.pontos++; // 1 ponto por linha percorrida
 // um carro novo só nasce quando o anterior desceu o bastante: sempre sobra espaço para trocar de faixa
 const topo=s.inimigos.reduce((m,e)=>Math.min(m,e.y),H);
 if(topo+4>=s.vao){s.inimigos.push({faixa:s.rnd()<.5?0:1,y:-4});s.vao=8+Math.floor(s.rnd()*4)}
 s.fim=rBateu(s);return s}

// ---------- B) Blocos: as sete peças clássicas caindo num poço 10 x 20
export const PECAS={I:[[0,1],[1,1],[2,1],[3,1]],O:[[1,0],[2,0],[1,1],[2,1]],T:[[1,0],[0,1],[1,1],[2,1]],
 S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
export const TIPOS=Object.keys(PECAS);
export const PONTOS_LINHAS=[0,100,300,500,800];
export const bNivel=s=>Math.min(15,1+Math.floor(s.linhas/10));             // sobe a cada 10 linhas
export const bIntervalo=s=>Math.max(70,800-(bNivel(s)-1)*55);
const caixa=t=>t==='I'?4:t==='O'?0:3;                                       // tamanho da caixa de giro (O não gira)
function saco(rnd){const a=[...TIPOS];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const proxima=s=>{if(!s.saco.length)s.saco=saco(s.rnd);return s.saco.shift()};
export const celulas=p=>p.c.map(([x,y])=>[p.x+x,p.y+y]);
export function livre(s,cs){return cs.every(([x,y])=>x>=0&&x<W&&y<H&&(y<0||!s.poco[y][x]))}
function nasce(s){const t=s.prox;s.prox=proxima(s);s.peca={t,c:PECAS[t].map(c=>[...c]),x:3,y:t==='I'?-1:0};if(!livre(s,celulas(s.peca)))s.fim=true}
export function blocos(rnd=Math.random){const s={jogo:'B',rnd,poco:Array.from({length:H},()=>Array(W).fill(0)),saco:[],pontos:0,linhas:0,fim:false,peca:null,prox:null,ultimas:0};
 s.prox=proxima(s);nasce(s);return s}
export function bMover(s,dx){if(s.fim)return false;const p={...s.peca,x:s.peca.x+dx};if(!livre(s,celulas(p)))return false;s.peca=p;return true}
export function bGirar(s){if(s.fim)return false;const n=caixa(s.peca.t);if(!n)return false;
 const c=s.peca.c.map(([x,y])=>[n-1-y,x]);
 for(const k of [0,-1,1,-2,2]){const p={...s.peca,c,x:s.peca.x+k};if(livre(s,celulas(p))){s.peca=p;return true}}return false}
// prende a peça, apaga linhas completas, soma pontos e chama a próxima peça
function prende(s){let fora=false;for(const [x,y] of celulas(s.peca)){if(y<0)fora=true;else s.poco[y][x]=1}
 if(fora){s.fim=true;return 0}
 const cheias=s.poco.reduce((a,l,y)=>l.every(Boolean)?[...a,y]:a,[]);
 if(cheias.length){s.pontos+=PONTOS_LINHAS[cheias.length]*bNivel(s);s.linhas+=cheias.length;s.poco=[...Array.from({length:cheias.length},()=>Array(W).fill(0)),...s.poco.filter((_,y)=>!cheias.includes(y))]}
 s.ultimas=cheias.length;nasce(s);return cheias.length}
// queda natural: desce uma linha ou prende. Retorna -1 se desceu, ou o número de linhas apagadas ao prender
export function bCair(s){if(s.fim)return 0;const p={...s.peca,y:s.peca.y+1};if(livre(s,celulas(p))){s.peca=p;return -1}return prende(s)}
// DOWN: acelera a queda (1 ponto por linha descida com o botão)
export function bDescer(s){const r=bCair(s);if(r===-1)s.pontos+=1;return r}

// ================= APARELHO =================
const NOMES={A:'Corrida',B:'Blocos'};
const RK='cr_brick_rec',SK='cr_brick_som';
const lerRec=()=>{try{const o=JSON.parse(localStorage.getItem(RK));return o&&typeof o==='object'?o:{}}catch(e){return {}}};
const gravarRec=o=>{try{localStorage.setItem(RK,JSON.stringify(o))}catch(e){}};
const somOn=()=>{try{return localStorage.getItem(SK)!=='0'}catch(e){return true}};

// cores de um LCD antigo: fundo verde-acinzentado, cristais apagados quase invisíveis, acesos quase pretos
const LCD='#9eac88',ACESO='#1d2416',APAGADO='rgba(29,36,22,.09)',TXT='#2a3320';
// números de 7 segmentos (a b c d e f g)
const SEG=['1111110','0110000','1101101','1111001','0110011','1011011','1011111','1110000','1111111','1111011'];

// letras grandes do menu, feitas com os próprios cristais (5 x 7)
const LETRA={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110']};

export function brickgame(raiz){
 raiz.innerHTML=`<div class=bg-corpo>
  <div class=bg-topo><span class=bg-luz aria-hidden=true></span><span class=bg-marca>BRICK GAME</span><span class=bg-sub>2 IN 1</span></div>
  <div class=bg-moldura><canvas class=bg-lcd role=img aria-label="Tela do jogo"></canvas></div>
  <p class=bg-dica aria-live=polite></p>
  <div class=bg-peq>
   <button type=button class=bg-pill data-k=som aria-label="Som">SOUND</button>
   <button type=button class=bg-pill data-k=start aria-label="Iniciar ou pausar">START</button>
   <button type=button class=bg-pill data-k=reset aria-label="Reiniciar">RESET</button></div>
  <div class=bg-ctrl>
   <div class=bg-cruz>
    <button type=button class="bg-bt bg-up" data-k=girar aria-label="Girar"><span>ROTATE</span></button>
    <button type=button class="bg-bt bg-le" data-k=esq aria-label="Esquerda"><span>LEFT</span></button>
    <button type=button class="bg-bt bg-ri" data-k=dir aria-label="Direita"><span>RIGHT</span></button>
    <button type=button class="bg-bt bg-dn" data-k=baixo aria-label="Descer mais rápido"><span>DOWN</span></button></div>
   <button type=button class="bg-bt bg-rot" data-k=girar aria-label="Girar"><span>ROTATE</span></button></div>
  <p class=bg-rodape>9999 IN 1 · MADE FOR FUN</p></div>`;
 const cv=raiz.querySelector('canvas'),dica=raiz.querySelector('.bg-dica'),ctx=cv.getContext('2d');
 // ---- estado do aparelho
 let modo='menu',jogo='A',s=null,rec=lerRec(),som=somOn(),acum=0,ult=0,turbo=false,anim=null,piscar=0,novoRec=false;
 // ---- som: bipes de onda quadrada, como o alto-falante de um portátil
 let ac=null;const bip=(f,d=.06,v=.05)=>{if(!som)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
  const o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.value=f;g.gain.value=v;o.connect(g).connect(ac.destination);const t=ac.currentTime;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.start(t);o.stop(t+d+.02)}catch(e){}};
 const melodia=(ns,passo=.09)=>ns.forEach((f,i)=>setTimeout(()=>bip(f,passo*.9,.05),i*passo*1000));
 // ---- medidas do LCD (em pixels lógicos; o canvas é ampliado pela densidade da tela)
 const C=15,OX=10,OY=10,GW=W*C,GH=H*C,PX=OX+GW+12,LW=PX+92,LH=OY*2+GH;
 // o aparelho inteiro precisa caber na tela: a largura do LCD acompanha a altura disponível (o resto do aparelho ocupa ~400px)
  const ajustar=()=>{const corpo=raiz.querySelector('.bg-corpo'),mo=cv.parentElement,ms=getComputedStyle(mo),larg=mo.clientWidth-parseFloat(ms.paddingLeft)-parseFloat(ms.paddingRight)-4,resto=corpo.getBoundingClientRect().height-cv.getBoundingClientRect().height;
  const alt=(window.innerHeight||800)-resto-16;cv.style.width=Math.max(150,Math.min(larg,alt*LW/LH))+'px';const dpr=Math.min(3,window.devicePixelRatio||1);cv.width=Math.round(LW*dpr);cv.height=Math.round(LH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);desenhar()};
 // ---- desenho
 const cristal=(x,y,on,c=C)=>{const a=on?ACESO:APAGADO;ctx.strokeStyle=a;ctx.fillStyle=a;ctx.lineWidth=Math.max(1,c*.11);
  ctx.strokeRect(x+c*.1,y+c*.1,c*.8,c*.8);ctx.fillRect(x+c*.3,y+c*.3,c*.4,c*.4)};
 const digito=(x,y,n,w=9,h=16)=>{const t=Math.max(1.6,w*.2),on=n==null?'0000000':SEG[n];
  const seg=[[x+t,y,w-2*t,t],[x+w-t,y+t,t,h/2-1.5*t],[x+w-t,y+h/2+t/2,t,h/2-1.5*t],[x+t,y+h-t,w-2*t,t],[x,y+h/2+t/2,t,h/2-1.5*t],[x,y+t,t,h/2-1.5*t],[x+t,y+h/2-t/2,w-2*t,t]];
  seg.forEach((r,i)=>{ctx.fillStyle=on[i]==='1'?ACESO:APAGADO;ctx.fillRect(...r)})};
 const numero=(x,y,v,casas,w,h)=>{const t=String(Math.max(0,Math.floor(v||0))).slice(-casas).padStart(casas,' ');
  for(let i=0;i<casas;i++){const ch=t[i];digito(x+i*(w+3),y,ch===' '?null:+ch,w,h)}};
 const rotulo=(x,y,t)=>{ctx.fillStyle=TXT;ctx.font='bold 8.5px ui-monospace,Menlo,Consolas,monospace';ctx.textBaseline='top';ctx.fillText(t,x,y)};
 function grade(){const m=Array.from({length:H},()=>Array(W).fill(0));
  if(modo==='menu'){LETRA[jogo].forEach((l,y)=>[...l].forEach((b,x)=>{if(b==='1')m[2+y][2+x]=1}));
   if(jogo==='A')carro(3,12).forEach(([x,y])=>{m[y][x]=1});else celulas({c:PECAS.T,x:3,y:13}).forEach(([x,y])=>{m[y][x]=1});
   if(piscar%2){for(let y=0;y<H;y++){m[y][0]=1;m[y][W-1]=1}}return m}
  if(!s)return m;
  if(s.jogo==='A'){for(let y=0;y<H;y++)if((y+s.pista)%4!==3){m[y][0]=1;m[y][W-1]=1}
   for(const e of s.inimigos)for(const [x,y] of carro(FAIXAS[e.faixa],e.y))if(y>=0&&y<H)m[y][x]=1;
   const pisca=s.fim&&piscar%2;if(!pisca)for(const [x,y] of carro(FAIXAS[s.faixa],PY))m[y][x]=1}
  else{s.poco.forEach((l,y)=>l.forEach((b,x)=>{if(b)m[y][x]=1}));if(!s.fim)for(const [x,y] of celulas(s.peca))if(y>=0)m[y][x]=1}
  if(anim!=null)for(let y=H-1;y>=H-anim;y--)m[y].fill(1); // fim de jogo: a tela enche de baixo para cima
  return m}
 function desenhar(){ctx.fillStyle=LCD;ctx.fillRect(0,0,LW,LH);
  ctx.strokeStyle='rgba(29,36,22,.45)';ctx.lineWidth=1;ctx.strokeRect(OX-3.5,OY-3.5,GW+7,GH+7);
  const m=grade();for(let y=0;y<H;y++)for(let x=0;x<W;x++)cristal(OX+x*C,OY+y*C,m[y][x]);
  const g=s&&modo!=='menu'?s.jogo:jogo,pts=s&&modo!=='menu'?s.pontos:0;
  rotulo(PX,OY,'SCORE');numero(PX,OY+12,pts,6,9,16);
  rotulo(PX,OY+40,'HI-SCORE');numero(PX,OY+52,rec[g]||0,6,9,16);
  rotulo(PX,OY+82,'NEXT');const nx=PX+14,ny=OY+96,c2=11;
  const prox=g==='B'&&s&&modo!=='menu'?s.prox:null;
  const dy=prox==='I'?0:1;for(let y=0;y<4;y++)for(let x=0;x<4;x++)cristal(nx+x*c2,ny+y*c2,!!prox&&PECAS[prox].some(([a,b])=>a===x&&b+dy===y),c2);
  const nv=!s||modo==='menu'?1:g==='A'?rNivel(s):bNivel(s);
  rotulo(PX,OY+150,'SPEED');numero(PX+40,OY+162,nv,2,9,16);
  rotulo(PX,OY+190,g==='B'?'LINES':'LEVEL');numero(PX+22,OY+202,g==='B'&&s&&modo!=='menu'?s.linhas:nv,4,9,16);
  rotulo(PX,OY+232,'GAME');ctx.fillStyle=ACESO;ctx.font='bold 20px ui-monospace,Menlo,Consolas,monospace';ctx.fillText(g,PX+44,OY+228);
  // ícones: xícara (pausa) e alto-falante (som), acesos só quando valem
  const ix=PX,iy=OY+262;ctx.fillStyle=modo==='pausa'?ACESO:APAGADO;ctx.fillRect(ix,iy+4,14,11);ctx.fillRect(ix+14,iy+6,4,6);ctx.fillRect(ix-2,iy+16,18,2);
  ctx.fillStyle=som?ACESO:APAGADO;const sx=PX+44;ctx.fillRect(sx,iy+7,5,7);ctx.beginPath();ctx.moveTo(sx+5,iy+7);ctx.lineTo(sx+12,iy+2);ctx.lineTo(sx+12,iy+19);ctx.lineTo(sx+5,iy+14);ctx.fill();
  if(som){ctx.fillRect(sx+15,iy+6,2,9);ctx.fillRect(sx+19,iy+3,2,15)}
  rotulo(PX,OY+292,modo==='pausa'?'PAUSE':modo==='fim'?'GAME OVER':modo==='menu'?'SELECT':'');}
 const avisar=t=>{dica.textContent=t};
 const textoModo=()=>modo==='menu'?`Jogo ${jogo} · ${NOMES[jogo]} — LEFT/RIGHT escolhe, START começa`:modo==='pausa'?'Pausado — START continua · RESET recomeça':
  modo==='fim'?`Fim de jogo: ${s?.pontos||0} pontos${novoRec?' · NOVO RECORDE!':''} — START joga de novo · RESET volta ao menu`:
  jogo==='A'?'LEFT/RIGHT troca de faixa · segure DOWN para acelerar':'LEFT/RIGHT move · ROTATE gira · DOWN desce mais rápido';
 // ---- ciclo do jogo
 // rola até o aparelho aparecer inteiro (o topo do site sai de cena ao rolar, então só a altura da tela importa)
 const mostrar=()=>{try{const r=raiz.querySelector('.bg-corpo').getBoundingClientRect();let d=0;if(r.bottom>innerHeight-6)d=r.bottom-innerHeight+6;if(r.top-d<6)d=r.top-6;if(d)scrollBy(0,d)}catch(e){}};
 function comecar(){mostrar();s=jogo==='A'?corrida():blocos();modo='jogo';acum=0;anim=null;novoRec=false;melodia([523,659,784]);avisar(textoModo());desenhar()}
 function terminar(){modo='anim';anim=0;bip(110,.35,.07);const g=s.jogo;if((s.pontos||0)>(rec[g]||0)){rec={...rec,[g]:s.pontos};gravarRec(rec);novoRec=true}}
 function passo(dt){
  if(modo==='menu'){acum+=dt;if(acum>500){acum=0;piscar++;desenhar()}return}
  if(modo==='anim'){acum+=dt;if(acum>35){acum=0;anim++;if(anim>H){anim=null;modo='fim';piscar=0;avisar(textoModo());if(novoRec)melodia([784,988,1175,1568],.1)}desenhar()}return}
  if(modo==='fim'){acum+=dt;if(acum>400&&s.jogo==='A'&&piscar<6){acum=0;piscar++;desenhar()}return}
  if(modo!=='jogo')return;
  acum+=dt;const iv=s.jogo==='A'?rIntervalo(s,turbo):bIntervalo(s);let mudou=false;
  while(acum>=iv&&modo==='jogo'){acum-=iv;mudou=true;
   if(s.jogo==='A'){const nv=rNivel(s);rPasso(s);if(rNivel(s)>nv)melodia([660,880]);if(s.fim){piscar=0;terminar();break}}
   else{const r=bCair(s);if(r>0)melodia(r===4?[523,659,784,1047]:[784,1047],.07);else if(r===0)bip(180,.04,.03);if(s.fim){terminar();break}}}
  if(mudou)desenhar()}
 const quadro=t=>{if(!raiz.isConnected)return;const dt=ult?Math.min(100,t-ult):0;ult=t;passo(dt);requestAnimationFrame(quadro)};
 // ---- ações dos botões
 function acao(k){
  if(k==='som'){som=!som;try{localStorage.setItem(SK,som?'1':'0')}catch(e){}bip(880,.05);desenhar();return}
  if(k==='start'){if(modo==='menu'||modo==='fim')comecar();else if(modo==='jogo'){modo='pausa';bip(440,.08)}else if(modo==='pausa'){modo='jogo';acum=0;bip(660,.08)}avisar(textoModo());desenhar();return}
  if(k==='reset'){if(modo==='jogo'||modo==='pausa')comecar();else if(modo==='fim'||modo==='anim'){modo='menu';s=null;anim=null;piscar=0;bip(330,.06)}avisar(textoModo());desenhar();return}
  if(modo==='menu'){if(k==='esq'||k==='dir'){jogo=jogo==='A'?'B':'A';bip(587,.04);avisar(textoModo());desenhar()}else if(k==='girar')acao('start');return}
  if(modo!=='jogo')return;
  if(s.jogo==='A'){if(k==='esq'||k==='dir'){if(rMover(s,k==='esq'?-1:1))bip(520,.03);if(s.fim){piscar=0;terminar()}}}
  else{if(k==='esq'&&bMover(s,-1))bip(520,.025);if(k==='dir'&&bMover(s,1))bip(520,.025);if(k==='girar'&&bGirar(s))bip(700,.03);
   if(k==='baixo'){const r=bDescer(s);if(r>0)melodia(r===4?[523,659,784,1047]:[784,1047],.07);if(s.fim)terminar()}}
  desenhar()}
 // ---- toque e clique: ação na hora; segurando, repete (LEFT, RIGHT, DOWN). Na corrida, segurar DOWN acelera.
 const REP={esq:1,dir:1,baixo:1};let rep=null,repT=null;
 const solta=()=>{clearTimeout(repT);clearInterval(rep);rep=repT=null;turbo=false;raiz.querySelectorAll('.bg-bt.on,.bg-pill.on').forEach(b=>b.classList.remove('on'))};
 raiz.querySelectorAll('[data-k]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();solta();b.classList.add('on');try{b.setPointerCapture(e.pointerId)}catch(_){}
   const k=b.dataset.k;if(navigator.vibrate)try{navigator.vibrate(8)}catch(_){}
   if(k==='baixo'&&s&&s.jogo==='A'&&modo==='jogo'){turbo=true;return}
   acao(k);if(REP[k])repT=setTimeout(()=>{rep=setInterval(()=>acao(k),k==='baixo'?55:85)},190)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,solta));
  b.addEventListener('click',e=>{if(e.detail===0)acao(b.dataset.k)}); // teclado/leitor de tela: Enter ou espaço no botão
  b.addEventListener('contextmenu',e=>e.preventDefault())});
 // ---- teclado: setas, espaço/↑ gira, Enter/P inicia ou pausa, R reinicia, M som
 const TECLA={ArrowLeft:'esq',ArrowRight:'dir',ArrowDown:'baixo',ArrowUp:'girar',' ':'girar',Enter:'start',p:'start',P:'start',r:'reset',R:'reset',m:'som',M:'som'};
 const aqui=()=>raiz.isConnected&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'');
 const kd=e=>{const k=TECLA[e.key];if(!k||!aqui())return;if(document.activeElement?.closest?.('.bg-corpo')&&(e.key==='Enter'||e.key===' '))return;e.preventDefault();
  if(k==='baixo'&&s&&s.jogo==='A'&&modo==='jogo'){turbo=true;return}if(e.repeat&&!REP[k])return;acao(k)};
 const ku=e=>{if(e.key==='ArrowDown')turbo=false};
 addEventListener('keydown',kd);addEventListener('keyup',ku);
 // ao sair da aba, o jogo pausa sozinho
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&modo==='jogo'){modo='pausa';solta();avisar(textoModo());desenhar()}});
 addEventListener('resize',ajustar);
 avisar(textoModo());ajustar();requestAnimationFrame(quadro);
 const api={acao,estado:()=>({modo,jogo,s,rec,som})};raiz.__bg=api;return api // estado consultado pelos testes automáticos
}
