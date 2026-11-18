// Brick Game 10 em 1 (só diversão, SEM prêmios): A Corrida, B Blocos, C Cobrinha, D Tanque, E Muralha, F Quebra-tijolos, G Travessia, H Pingue-pongue, I Chuva, J Saltador. Carregado apenas em brickgame.html.
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

// ---------- utilidades dos outros cartuchos
const dentro=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
const acende=(m,x,y)=>{if(dentro(x,y))m[y][x]=1};
const lim=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------- C) Cobrinha: setas mudam a direção (ROTATE = para cima); comer faz crescer; bater na parede ou em si mesma encerra
const CDIR={esq:{x:-1,y:0},dir:{x:1,y:0},girar:{x:0,y:-1},baixo:{x:0,y:1}};
export const cNivel=s=>Math.min(10,1+Math.floor(s.comidas/5));
function cComida(s){const l=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!s.cobra.some(c=>c.x===x&&c.y===y))l.push({x,y});return l.length?l[Math.floor(s.rnd()*l.length)]:null}
export function cobrinha(rnd=Math.random){const s={jogo:'C',rnd,cobra:[{x:4,y:12},{x:4,y:13},{x:4,y:14}],dir:CDIR.girar,fila:[],pontos:0,comidas:0,fim:false,t:0};s.comida=cComida(s);return s}
export function cVirar(s,k){const d=CDIR[k];if(!d||s.fim)return false;const u=s.fila.length?s.fila[s.fila.length-1]:s.dir;
 if((d.x===-u.x&&d.y===-u.y)||(d.x===u.x&&d.y===u.y)||s.fila.length>=2)return false;s.fila.push(d);return true}
export function cPasso(s){if(s.fim)return '';s.t++;if(s.fila.length)s.dir=s.fila.shift();
 const h={x:s.cobra[0].x+s.dir.x,y:s.cobra[0].y+s.dir.y},come=!!s.comida&&h.x===s.comida.x&&h.y===s.comida.y,corpo=come?s.cobra:s.cobra.slice(0,-1);
 if(!dentro(h.x,h.y)||corpo.some(c=>c.x===h.x&&c.y===h.y)){s.fim=true;return 'perde'}
 s.cobra.unshift(h);if(come){s.comidas++;s.pontos+=10*cNivel(s);s.comida=cComida(s);if(!s.comida)s.fim=true;return 'come'}s.cobra.pop();return ''}

// ---------- D) Tanque: o seu tanque embaixo atira para cima; os inimigos descem atirando. 3 vidas
const TQ=[[1,0],[0,1],[1,1],[2,1],[0,2],[2,2]];   // seu tanque (cano para cima):  .X. / XXX / X.X
const TI=[[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]];   // inimigo (cano para baixo):    X.X / XXX / .X.
export const tqCel=x=>TQ.map(([a,b])=>[x+a,H-3+b]);
export const tiCel=e=>TI.map(([a,b])=>[e.x+a,e.y+b]);
export const dNivel=s=>Math.min(10,1+Math.floor(s.abates/8));
export function tanque(rnd=Math.random){return {jogo:'D',rnd,x:4,inimigos:[],tiros:[],balas:[],pontos:0,abates:0,vidas:3,fim:false,t:0}}
function dAcertos(s){let ev='';s.tiros=s.tiros.filter(b=>{const i=s.inimigos.findIndex(e=>tiCel(e).some(([x,y])=>x===b.x&&y===b.y));if(i<0)return true;
 s.inimigos.splice(i,1);s.abates++;s.pontos+=100;ev='ponto';return false});return ev}
function dDano(s){const eu=new Set(tqCel(s.x).map(c=>c+''));
 const bate=s.balas.some(b=>eu.has([b.x,b.y]+''))||s.inimigos.some(e=>e.y>=H-5||tiCel(e).some(c=>eu.has(c+'')));
 if(!bate)return '';s.vidas--;s.inimigos=[];s.balas=[];s.tiros=[];if(s.vidas<=0)s.fim=true;return 'perde'}
export function dAcao(s,k){if(s.fim)return '';if(k==='esq'||k==='dir'){const x=lim(s.x+(k==='esq'?-1:1),0,W-3);if(x===s.x)return '';s.x=x;return dDano(s)||'mov'}
 if((k==='girar'||k==='baixo')&&s.tiros.length<3){s.tiros.push({x:s.x+1,y:H-4});return dAcertos(s)||'tiro'}return ''}
export function dPasso(s){if(s.fim)return '';s.t++;const n=dNivel(s);let ev='';
 s.tiros.forEach(b=>b.y--);s.tiros=s.tiros.filter(b=>b.y>=0);ev=dAcertos(s)||ev;
 if(s.t%Math.max(4,15-n)===0)for(const e of s.inimigos){e.y++;if(s.rnd()<.3){const nx=lim(e.x+(s.rnd()<.5?-1:1),0,W-3);if(!s.inimigos.some(o=>o!==e&&Math.abs(o.x-nx)<3&&Math.abs(o.y-e.y)<3))e.x=nx}}
 ev=dAcertos(s)||ev;
 for(const e of s.inimigos)if(e.y>=0&&s.rnd()<.015+.004*n)s.balas.push({x:e.x+1,y:e.y+3});
 if(s.t%2===0){s.balas.forEach(b=>b.y++);s.balas=s.balas.filter(b=>b.y<H)}
 if(s.t%Math.max(16,48-n*3)===0&&s.inimigos.length<4){const x=Math.floor(s.rnd()*(W-2));if(!s.inimigos.some(o=>o.y<2&&Math.abs(o.x-x)<3))s.inimigos.push({x,y:-2})}
 return dDano(s)||ev}

// ---------- E) Muralha: a parede desce de tempos em tempos; atire para abrir espaço antes que ela chegue em você
export const eNivel=s=>Math.min(10,1+Math.floor(s.pontos/250));
const eLinha=s=>Array.from({length:W},()=>s.rnd()<.5?1:0);
function eDescer(s){s.muro.pop();s.muro.unshift(eLinha(s))}
export const eCanhao=x=>[[x,H-2],[x-1,H-1],[x,H-1],[x+1,H-1]];
export function muralha(rnd=Math.random){const s={jogo:'E',rnd,muro:Array.from({length:H},()=>Array(W).fill(0)),x:4,pontos:0,fim:false,t:0,raio:null};for(let i=0;i<4;i++)eDescer(s);return s}
export function eAcao(s,k){if(s.fim)return '';if(k==='esq'||k==='dir'){const x=lim(s.x+(k==='esq'?-1:1),1,W-2);if(x===s.x)return '';s.x=x;return 'mov'}
 if(k==='girar'||k==='baixo'){for(let y=H-3;y>=0;y--)if(s.muro[y][s.x]){s.muro[y][s.x]=0;s.pontos+=10;s.raio={x:s.x,y0:y,y1:H-3,t:2};return 'ponto'}s.raio={x:s.x,y0:0,y1:H-3,t:2};return 'tiro'}return ''}
export function ePasso(s){if(s.fim)return '';s.t++;if(s.raio&&--s.raio.t<=0)s.raio=null;
 if(s.t%Math.max(6,Math.round(40-eNivel(s)*3))===0){eDescer(s);if(s.muro.slice(H-3).some(l=>l.some(Boolean))){s.fim=true;return 'perde'}return 'desce'}return ''}

// ---------- F) Quebra-tijolos: rebata a bolinha com a raquete e quebre todos os tijolos. 3 vidas
export const fNivel=s=>Math.min(10,s.fase);
function fParede(s){s.tij=Array.from({length:H},(_,y)=>Array(W).fill(y>=1&&y<=4?1:0))}
function fPrender(s){s.preso=true;s.espera=0;s.bola={x:s.x+1,y:H-2,dx:s.rnd()<.5?-1:1,dy:-1}}
export function tijolos(rnd=Math.random){const s={jogo:'F',rnd,x:3,pontos:0,vidas:3,fase:1,fim:false,t:0};fParede(s);fPrender(s);return s}
export function fAcao(s,k){if(s.fim)return '';if(k==='esq'||k==='dir'){const x=lim(s.x+(k==='esq'?-1:1),0,W-3);if(x===s.x)return '';s.x=x;if(s.preso)s.bola.x=x+1;return 'mov'}
 if((k==='girar'||k==='baixo')&&s.preso){s.preso=false;return 'tiro'}return ''}
export function fPasso(s){if(s.fim)return '';s.t++;if(s.preso){if(++s.espera<25)return '';s.preso=false}
 const b=s.bola,tem=(x,y)=>dentro(x,y)&&s.tij[y][x];let ev='';
 // o teto fica na linha 1 (a linha 0 é a borda): a ida e volta não fecha um ciclo exato e a bola vai mudando de caminho
 // bola que sobe reta (meio da raquete) volta inclinada para um lado qualquer: assim ela muda de caminho e alcança todos os tijolos
 const torto=()=>{if(!b.dx)b.dx=s.rnd()<.5?-1:1};
 for(let k=0;k<2;k++){if(b.x+b.dx<0||b.x+b.dx>=W)b.dx=-b.dx;if(b.y+b.dy<1){b.dy=1;torto()}
  if(tem(b.x,b.y+b.dy)){s.tij[b.y+b.dy][b.x]=0;b.dy=-b.dy;torto();s.pontos+=10;ev='ponto'}
  else if(tem(b.x+b.dx,b.y)){s.tij[b.y][b.x+b.dx]=0;b.dx=-b.dx;s.pontos+=10;ev='ponto'}
  else if(tem(b.x+b.dx,b.y+b.dy)){s.tij[b.y+b.dy][b.x+b.dx]=0;b.dx=-b.dx;b.dy=-b.dy;s.pontos+=10;ev='ponto'}
  else break}
 if(b.x+b.dx<0||b.x+b.dx>=W)b.dx=-b.dx;
 if(b.dy>0&&b.y===H-2){const nx=b.x+b.dx;if(nx>=s.x&&nx<=s.x+2){b.dy=-1;b.dx=nx===0||nx===W-1||nx===s.x+1?(s.rnd()<.4?0:(b.dx||(s.rnd()<.5?-1:1))):nx===s.x?-1:1;if(b.x+b.dx<0||b.x+b.dx>=W)b.dx=-b.dx;ev=ev||'bate'}}
 b.x+=b.dx;b.y+=b.dy;
 if(b.y>=H){s.vidas--;if(s.vidas<=0){s.fim=true;return 'perde'}fPrender(s);return 'perde'}
 if(!s.tij.some(l=>l.some(Boolean))){s.fase++;s.pontos+=100;fParede(s);fPrender(s);return 'fase'}return ev}

// ---------- G) Travessia: atravesse as pistas até o topo sem ser atropelado. 3 vidas
const PISTAS=[{y:2,d:1,car:3,vao:4,per:6},{y:4,d:-1,car:2,vao:3,per:5},{y:6,d:1,car:2,vao:5,per:4},{y:8,d:-1,car:3,vao:4,per:6},
 {y:11,d:1,car:2,vao:4,per:5},{y:13,d:-1,car:3,vao:3,per:7},{y:15,d:1,car:2,vao:3,per:4},{y:17,d:-1,car:2,vao:4,per:6}];
export const gNivel=s=>Math.min(10,s.fase);
function gPistas(s){s.pistas=PISTAS.map(p=>{const linha=[];while(linha.length<W)linha.push(...Array(p.car).fill(1),...Array(p.vao).fill(0));
 const o=Math.floor(s.rnd()*W);return {...p,cel:[...linha.slice(o),...linha.slice(0,o)].concat(linha).slice(0,W)}})}
const gInicio=s=>{s.sapo={x:4,y:H-1};s.melhor=H-1};
const gBateu=s=>s.pistas.some(p=>p.y===s.sapo.y&&p.cel[s.sapo.x]);
function gPerde(s){s.vidas--;if(s.vidas<=0)s.fim=true;else gInicio(s);return 'perde'}
export function travessia(rnd=Math.random){const s={jogo:'G',rnd,pontos:0,vidas:3,fase:1,fim:false,t:0};gPistas(s);gInicio(s);return s}
export function gAcao(s,k){if(s.fim)return '';const d={esq:[-1,0],dir:[1,0],girar:[0,-1],baixo:[0,1]}[k];if(!d)return '';
 const x=lim(s.sapo.x+d[0],0,W-1),y=lim(s.sapo.y+d[1],0,H-1);if(x===s.sapo.x&&y===s.sapo.y)return '';s.sapo={x,y};
 if(gBateu(s))return gPerde(s);
 if(y<s.melhor){s.pontos+=10;s.melhor=y}
 if(y===0){s.pontos+=100*s.fase;s.fase++;gInicio(s);return 'fase'}return 'mov'}
export function gPasso(s){if(s.fim)return '';s.t++;const n=gNivel(s);
 for(const p of s.pistas)if(s.t%Math.max(1,p.per-Math.floor((n-1)/2))===0)p.cel=p.d>0?[p.cel[W-1],...p.cel.slice(0,-1)]:[...p.cel.slice(1),p.cel[0]];
 return gBateu(s)?gPerde(s):''}

// ---------- H) Pingue-pongue: você embaixo, o aparelho em cima. Cada bola que ele deixa passar vale ponto. 3 vidas
export const hNivel=s=>Math.min(10,1+Math.floor(s.acertos/3));
const hSaque=(s,dy)=>{s.bola={x:4+Math.floor(s.rnd()*2),y:10,dx:s.rnd()<.5?-1:1,dy}};
export function pongue(rnd=Math.random){const s={jogo:'H',rnd,x:3,cpu:3,pontos:0,vidas:3,acertos:0,fim:false,t:0};hSaque(s,1);return s}
export function hAcao(s,k){if(s.fim||(k!=='esq'&&k!=='dir'))return '';const x=lim(s.x+(k==='esq'?-1:1),0,W-3);if(x===s.x)return '';s.x=x;return 'mov'}
export function hPasso(s){if(s.fim)return '';s.t++;const b=s.bola,n=hNivel(s);let ev='';
 // o aparelho segue a bola com um pouco de atraso (e às vezes erra)
 if((s.t%2===0||n>4)&&s.rnd()>.22){const alvo=lim(b.x-1,0,W-3);s.cpu+=Math.sign(alvo-s.cpu)}
 if(b.x+b.dx<0||b.x+b.dx>=W)b.dx=-b.dx;
 const rebate=(px,dy)=>{const nx=b.x+b.dx;if(nx>=px&&nx<=px+2){b.dy=dy;b.dx=nx===px?-1:nx===px+2?1:b.dx;if(b.x+b.dx<0||b.x+b.dx>=W)b.dx=-b.dx;return true}return false};
 if(b.dy>0&&b.y===H-2&&rebate(s.x,-1))ev='bate';
 if(b.dy<0&&b.y===1&&rebate(s.cpu,1))ev='bate';
 b.x+=b.dx;b.y+=b.dy;
 if(b.y>=H){s.vidas--;if(s.vidas<=0)s.fim=true;else hSaque(s,-1);return 'perde'}
 if(b.y<0){s.pontos+=100;s.acertos++;hSaque(s,1);return 'ponto'}return ev}

// ---------- I) Chuva: desvie do que cai do céu
export const iNivel=s=>Math.min(10,1+Math.floor(s.pontos/200));
export function chuva(rnd=Math.random){return {jogo:'I',rnd,x:4,gotas:[],pontos:0,fim:false,t:0}}
const iBateu=s=>s.gotas.some(g=>g.x===s.x&&g.y>=H-2);
export function iAcao(s,k){if(s.fim||(k!=='esq'&&k!=='dir'))return '';const x=lim(s.x+(k==='esq'?-1:1),0,W-1);if(x===s.x)return '';s.x=x;if(iBateu(s)){s.fim=true;return 'perde'}return 'mov'}
export function iPasso(s){if(s.fim)return '';s.t++;s.gotas.forEach(g=>g.y++);s.gotas=s.gotas.filter(g=>g.y<H);
 if(s.rnd()<.3+.035*iNivel(s))s.gotas.push({x:Math.floor(s.rnd()*W),y:0});s.pontos++;
 if(iBateu(s)){s.fim=true;return 'perde'}return ''}

// ---------- J) Saltador: pule os obstáculos que vêm pelo chão
export const SALTO=[1,2,3,3,3,2,1];
export const jNivel=s=>Math.min(10,1+Math.floor(s.passou/10));
export const jAltura=s=>s.pulo?SALTO[s.pulo-1]:0;
export const jCorpo=s=>[[1,H-3-jAltura(s)],[1,H-2-jAltura(s)]];
export function saltador(rnd=Math.random){return {jogo:'J',rnd,obst:[],pulo:0,pontos:0,passou:0,fim:false,t:0,prox:5}}
const jBateu=s=>{const eu=jCorpo(s);return s.obst.some(o=>eu.some(([x,y])=>x===o.x&&(y===H-2||(o.h===2&&y===H-3))))};
export function jAcao(s,k){if(s.fim||(k!=='girar'&&k!=='baixo')||s.pulo)return '';s.pulo=1;return 'pula'}
export function jPasso(s){if(s.fim)return '';s.t++;let ev='';if(s.pulo&&++s.pulo>SALTO.length)s.pulo=0;
 s.obst.forEach(o=>o.x--);const antes=s.obst.length;s.obst=s.obst.filter(o=>o.x>=0);
 if(s.obst.length<antes){s.passou++;s.pontos+=10;ev='ponto'}
 if(--s.prox<=0){s.obst.push({x:W-1,h:s.rnd()<.4?2:1});s.prox=8+Math.floor(s.rnd()*6)}
 if(jBateu(s)){s.fim=true;return 'perde'}return ev}

// ---------- cartuchos: o aparelho só conversa com esta lista
const iv=(base,passo,min)=>n=>Math.max(min,base-(n-1)*passo);
export const JOGOS={
 A:{nome:'Corrida',dica:'LEFT/RIGHT troca de faixa · segure DOWN para acelerar',novo:corrida,nivel:rNivel,turbo:true,intervalo:(s,t)=>rIntervalo(s,t),
  passo:s=>{const n=rNivel(s);rPasso(s);return s.fim?'perde':rNivel(s)>n?'fase':''},
  acao:(s,k)=>(k==='esq'||k==='dir')&&rMover(s,k==='esq'?-1:1)?(s.fim?'perde':'mov'):'',
  tela:(s,m,pisca)=>{for(let y=0;y<H;y++)if((y+s.pista)%4!==3){m[y][0]=1;m[y][W-1]=1}
   for(const e of s.inimigos)for(const [x,y] of carro(FAIXAS[e.faixa],e.y))acende(m,x,y);
   if(!(s.fim&&pisca))for(const [x,y] of carro(FAIXAS[s.faixa],PY))acende(m,x,y)},
  capa:m=>carro(3,12).forEach(([x,y])=>acende(m,x,y))},
 B:{nome:'Blocos',dica:'LEFT/RIGHT move · ROTATE gira · DOWN desce mais rápido',novo:blocos,nivel:bNivel,intervalo:s=>bIntervalo(s),
  passo:s=>{const r=bCair(s);return s.fim?'perde':r>=4?'linha4':r>0?'linha':r===0?'prende':''},
  acao:(s,k)=>k==='esq'?(bMover(s,-1)?'mov':''):k==='dir'?(bMover(s,1)?'mov':''):k==='girar'?(bGirar(s)?'gira':''):k==='baixo'?(r=>s.fim?'perde':r>=4?'linha4':r>0?'linha':'')(bDescer(s)):'',
  tela:s=>{const m=s.poco.map(l=>[...l]);if(!s.fim)for(const [x,y] of celulas(s.peca))acende(m,x,y);return m},
  proxima:s=>s.prox,rotulo:'LINES',valor:s=>s.linhas,
  capa:m=>celulas({c:PECAS.T,x:3,y:13}).forEach(([x,y])=>acende(m,x,y))},
 C:{nome:'Cobrinha',dica:'Setas mudam a direção (ROTATE = para cima) · coma e não bata',novo:cobrinha,nivel:cNivel,intervalo:s=>iv(280,22,80)(cNivel(s)),
  passo:cPasso,acao:(s,k)=>cVirar(s,k)?'mov':'',
  tela:(s,m,pisca)=>{s.cobra.forEach(c=>acende(m,c.x,c.y));if(s.comida&&(s.t%4<3||s.fim))acende(m,s.comida.x,s.comida.y)},
  capa:m=>[[2,16],[3,16],[4,16],[5,16],[5,15],[5,14],[6,14],[8,12]].forEach(([x,y])=>acende(m,x,y))},
 D:{nome:'Tanque',dica:'LEFT/RIGHT move o tanque · ROTATE ou DOWN atira',novo:tanque,nivel:dNivel,intervalo:()=>70,passo:dPasso,acao:dAcao,
  tela:(s,m,pisca)=>{for(const e of s.inimigos)tiCel(e).forEach(([x,y])=>acende(m,x,y));s.tiros.forEach(b=>acende(m,b.x,b.y));s.balas.forEach(b=>acende(m,b.x,b.y));
   if(!(s.fim&&pisca))tqCel(s.x).forEach(([x,y])=>acende(m,x,y))},
  capa:m=>{tiCel({x:5,y:11}).forEach(([x,y])=>acende(m,x,y));acende(m,4,15);TQ.forEach(([a,b])=>acende(m,3+a,16+b))}},
 E:{nome:'Muralha',dica:'LEFT/RIGHT mira · ROTATE ou DOWN atira · não deixe a parede chegar',novo:muralha,nivel:eNivel,intervalo:()=>100,passo:ePasso,acao:eAcao,
  tela:s=>{const m=s.muro.map(l=>[...l]);if(s.raio)for(let y=s.raio.y0;y<=s.raio.y1;y++)acende(m,s.raio.x,y);eCanhao(s.x).forEach(([x,y])=>acende(m,x,y));return m},
  capa:m=>{['1101111011','0111011110'].forEach((l,y)=>[...l].forEach((b,x)=>{if(b==='1')acende(m,x,11+y)}));eCanhao(4).forEach(([x,y])=>acende(m,x,y-1))}},
 F:{nome:'Quebra-tijolos',dica:'LEFT/RIGHT move a raquete · ROTATE lança a bolinha',novo:tijolos,nivel:fNivel,intervalo:s=>iv(150,10,55)(fNivel(s)),passo:fPasso,acao:fAcao,
  tela:(s,m,pisca)=>{m[0].fill(1);s.tij.forEach((l,y)=>l.forEach((b,x)=>{if(b)m[y][x]=1}));if(!(s.preso&&pisca))acende(m,s.bola.x,s.bola.y);for(let i=0;i<3;i++)acende(m,s.x+i,H-1)},
  capa:m=>{for(let x=0;x<W;x++)acende(m,x,11);acende(m,5,15);for(let i=0;i<3;i++)acende(m,3+i,18)}},
 G:{nome:'Travessia',dica:'Setas andam (ROTATE = para frente) · chegue ao topo sem ser atropelado',novo:travessia,nivel:gNivel,intervalo:()=>60,passo:gPasso,acao:gAcao,
  tela:(s,m,pisca)=>{for(const p of s.pistas)p.cel.forEach((b,x)=>{if(b)acende(m,x,p.y)});if(!(s.fim&&pisca)&&!(pisca&&s.t%2))acende(m,s.sapo.x,s.sapo.y)},
  capa:m=>{[[0,12],[1,12],[5,12],[6,12],[3,15],[4,15],[8,15],[9,15],[4,18]].forEach(([x,y])=>acende(m,x,y))}},
 H:{nome:'Pingue-pongue',dica:'LEFT/RIGHT move a raquete de baixo · ganhe do aparelho',novo:pongue,nivel:hNivel,intervalo:s=>iv(130,8,50)(hNivel(s)),passo:hPasso,acao:hAcao,
  tela:(s,m)=>{for(let i=0;i<3;i++){acende(m,s.cpu+i,0);acende(m,s.x+i,H-1)}acende(m,s.bola.x,s.bola.y)},
  capa:m=>{for(let i=0;i<3;i++){acende(m,1+i,11);acende(m,5+i,18)}acende(m,5,14)}},
 I:{nome:'Chuva',dica:'LEFT/RIGHT desvia do que cai',novo:chuva,nivel:iNivel,intervalo:s=>iv(140,9,45)(iNivel(s)),passo:iPasso,acao:iAcao,
  tela:(s,m,pisca)=>{s.gotas.forEach(g=>acende(m,g.x,g.y));if(!(s.fim&&pisca)){acende(m,s.x,H-2);acende(m,s.x,H-1)}},
  capa:m=>[[1,11],[6,12],[3,14],[8,15],[4,17],[4,18]].forEach(([x,y])=>acende(m,x,y))},
 J:{nome:'Saltador',dica:'ROTATE ou DOWN pula · não encoste nos obstáculos',novo:saltador,nivel:jNivel,intervalo:s=>iv(130,9,45)(jNivel(s)),passo:jPasso,acao:jAcao,
  tela:(s,m,pisca)=>{for(let x=0;x<W;x++)m[H-1][x]=1;s.obst.forEach(o=>{acende(m,o.x,H-2);if(o.h===2)acende(m,o.x,H-3)});if(!(s.fim&&pisca))jCorpo(s).forEach(([x,y])=>acende(m,x,y))},
  capa:m=>{for(let x=0;x<W;x++)acende(m,x,18);acende(m,2,16);acende(m,2,17);acende(m,6,17)}}};
export const ORDEM=Object.keys(JOGOS);

// ================= APARELHO =================
const RK='cr_brick_rec',SK='cr_brick_som';
const lerRec=()=>{try{const o=JSON.parse(localStorage.getItem(RK));return o&&typeof o==='object'?o:{}}catch(e){return {}}};
const gravarRec=o=>{try{localStorage.setItem(RK,JSON.stringify(o))}catch(e){}};
const somOn=()=>{try{return localStorage.getItem(SK)!=='0'}catch(e){return true}};

// cores de um LCD antigo: fundo verde-acinzentado, cristais apagados quase invisíveis, acesos quase pretos
const LCD='#9eac88',ACESO='#1d2416',APAGADO='rgba(29,36,22,.09)',TXT='#2a3320';
// números de 7 segmentos (a b c d e f g)
const SEG=['1111110','0110000','1101101','1111001','0110011','1011011','1011111','1110000','1111111','1111011'];

// letras grandes do menu, feitas com os próprios cristais (5 x 7)
const LETRA={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],
 C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],
 E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],
 G:['01111','10000','10000','10011','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],
 I:['01110','00100','00100','00100','00100','00100','01110'],J:['00111','00010','00010','00010','00010','10010','01100']};

// ganchos (opcionais, usados só no site para o Desafio): inicio(jogo), fim(jogo,pontos), escolheu(jogo). O app do celular não usa.
export function brickgame(raiz,ganchos={}){
 raiz.innerHTML=`<div class=bg-corpo>
  <div class=bg-topo><span class=bg-luz aria-hidden=true></span><span class=bg-marca>BRICK GAME</span><span class=bg-sub>10 IN 1</span></div>
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
 let geral={},modo='menu',jogo='A',s=null,rec=lerRec(),som=somOn(),acum=0,ult=0,turbo=false,anim=null,piscar=0,novoRec=false;
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
 function grade(){let m=Array.from({length:H},()=>Array(W).fill(0));
  if(modo==='menu'){LETRA[jogo].forEach((l,y)=>[...l].forEach((b,x)=>{if(b==='1')m[2+y][2+x]=1}));JOGOS[jogo].capa(m);
   if(piscar%2){for(let y=0;y<H;y++){m[y][0]=1;m[y][W-1]=1}}return m}
  if(!s)return m;
  const r=JOGOS[s.jogo].tela(s,m,!!(piscar%2)&&s.fim);if(r)m=r;
  if(anim!=null)for(let y=H-1;y>=H-anim;y--)m[y].fill(1); // fim de jogo: a tela enche de baixo para cima
  return m}
 function desenhar(){ctx.fillStyle=LCD;ctx.fillRect(0,0,LW,LH);
  ctx.strokeStyle='rgba(29,36,22,.45)';ctx.lineWidth=1;ctx.strokeRect(OX-3.5,OY-3.5,GW+7,GH+7);
  const m=grade();for(let y=0;y<H;y++)for(let x=0;x<W;x++)cristal(OX+x*C,OY+y*C,m[y][x]);
  const g=s&&modo!=='menu'?s.jogo:jogo,pts=s&&modo!=='menu'?s.pontos:0;
  rotulo(PX,OY,'SCORE');numero(PX,OY+12,pts,6,9,16);
  rotulo(PX,OY+40,'HI-SCORE');numero(PX,OY+52,Math.max(rec[g]||0,geral[g]||0),6,9,16); // o maior: o seu ou o recorde do Desafio
  const nx=PX+14,ny=OY+96,c2=11;
  const J=JOGOS[g],ativo=!!s&&modo!=='menu',prox=ativo&&J.proxima?J.proxima(s):null,vidas=ativo&&s.vidas!=null?s.vidas:null;
  // caixinha 4 x 4: a próxima peça (Blocos) ou as vidas que restam (jogos com vidas)
  rotulo(PX,OY+82,vidas!=null?'LIVES':'NEXT');
  const dy=prox==='I'?0:1;for(let y=0;y<4;y++)for(let x=0;x<4;x++)cristal(nx+x*c2,ny+y*c2,prox?PECAS[prox].some(([a,b])=>a===x&&b+dy===y):vidas!=null&&y===1&&x<vidas,c2);
  const nv=ativo?J.nivel(s):1;
  rotulo(PX,OY+150,'SPEED');numero(PX+40,OY+162,nv,2,9,16);
  rotulo(PX,OY+190,J.rotulo||'LEVEL');numero(PX+22,OY+202,ativo&&J.valor?J.valor(s):nv,4,9,16);
  rotulo(PX,OY+232,'GAME');ctx.fillStyle=ACESO;ctx.font='bold 20px ui-monospace,Menlo,Consolas,monospace';ctx.fillText(g,PX+44,OY+228);
  // ícones: xícara (pausa) e alto-falante (som), acesos só quando valem
  const ix=PX,iy=OY+262;ctx.fillStyle=modo==='pausa'?ACESO:APAGADO;ctx.fillRect(ix,iy+4,14,11);ctx.fillRect(ix+14,iy+6,4,6);ctx.fillRect(ix-2,iy+16,18,2);
  ctx.fillStyle=som?ACESO:APAGADO;const sx=PX+44;ctx.fillRect(sx,iy+7,5,7);ctx.beginPath();ctx.moveTo(sx+5,iy+7);ctx.lineTo(sx+12,iy+2);ctx.lineTo(sx+12,iy+19);ctx.lineTo(sx+5,iy+14);ctx.fill();
  if(som){ctx.fillRect(sx+15,iy+6,2,9);ctx.fillRect(sx+19,iy+3,2,15)}
  rotulo(PX,OY+292,modo==='pausa'?'PAUSE':modo==='fim'?'GAME OVER':modo==='menu'?'SELECT':'');}
 const avisar=t=>{dica.textContent=t};
 const aviso=(nome,...a)=>{try{ganchos[nome]?.(...a)}catch(e){}};
 const textoModo=()=>modo==='menu'?`Jogo ${jogo} · ${JOGOS[jogo].nome} (${ORDEM.indexOf(jogo)+1} de ${ORDEM.length}) — LEFT/RIGHT escolhe, START começa`:modo==='pausa'?'Pausado — START continua · RESET recomeça':
  modo==='fim'?`Fim de jogo: ${s?.pontos||0} pontos${novoRec?' · NOVO RECORDE!':''} — START joga de novo · RESET volta ao menu`:
  JOGOS[jogo].dica;
 // sons de cada acontecimento do jogo
 const SOM={mov:()=>bip(520,.025),gira:()=>bip(700,.03),tiro:()=>bip(900,.02,.03),ponto:()=>bip(1047,.04),come:()=>melodia([784,1047],.05),bate:()=>bip(600,.02),
  pula:()=>bip(660,.04),desce:()=>bip(200,.04,.03),perde:()=>bip(150,.15),fase:()=>melodia([660,880]),linha:()=>melodia([784,1047],.07),linha4:()=>melodia([523,659,784,1047],.07),prende:()=>bip(180,.04,.03)};
 // depois de cada passo ou botão: toca o som e, se acabou, encerra
 const efeito=ev=>{if(s.fim){piscar=0;terminar();return}SOM[ev]?.()};
 // ---- ciclo do jogo
 // rola até o aparelho aparecer inteiro (o topo do site sai de cena ao rolar, então só a altura da tela importa)
 const mostrar=()=>{try{const r=raiz.querySelector('.bg-corpo').getBoundingClientRect();let d=0;if(r.bottom>innerHeight-6)d=r.bottom-innerHeight+6;if(r.top-d<6)d=r.top-6;if(d)scrollBy(0,d)}catch(e){}};
 function comecar(){mostrar();s=JOGOS[jogo].novo();aviso('inicio',jogo);modo='jogo';acum=0;anim=null;novoRec=false;melodia([523,659,784]);avisar(textoModo());desenhar()}
 function terminar(){modo='anim';anim=0;bip(110,.35,.07);const g=s.jogo;aviso('fim',g,s.pontos||0);if((s.pontos||0)>(rec[g]||0)){rec={...rec,[g]:s.pontos};gravarRec(rec);novoRec=true}}
 function passo(dt){
  if(modo==='menu'){acum+=dt;if(acum>500){acum=0;piscar++;desenhar()}return}
  if(modo==='anim'){acum+=dt;if(acum>35){acum=0;anim++;if(anim>H){anim=null;modo='fim';piscar=0;avisar(textoModo());if(novoRec)melodia([784,988,1175,1568],.1)}desenhar()}return}
  if(modo==='fim'){acum+=dt;if(acum>400&&piscar<6){acum=0;piscar++;desenhar()}return}
  if(modo!=='jogo')return;
  const J=JOGOS[s.jogo];acum+=dt;let mudou=false;
  for(let t=J.intervalo(s,turbo);acum>=t&&modo==='jogo';t=J.intervalo(s,turbo)){acum-=t;mudou=true;efeito(J.passo(s))}
  if(mudou)desenhar()}
 const quadro=t=>{if(!raiz.isConnected)return;const dt=ult?Math.min(100,t-ult):0;ult=t;passo(dt);requestAnimationFrame(quadro)};
 // ---- ações dos botões
 function acao(k){
  if(k==='som'){som=!som;try{localStorage.setItem(SK,som?'1':'0')}catch(e){}bip(880,.05);desenhar();return}
  if(k==='start'){if(modo==='menu'||modo==='fim')comecar();else if(modo==='jogo'){modo='pausa';bip(440,.08)}else if(modo==='pausa'){modo='jogo';acum=0;bip(660,.08)}avisar(textoModo());desenhar();return}
  if(k==='reset'){if(modo==='jogo'||modo==='pausa')comecar();else if(modo==='fim'||modo==='anim'){modo='menu';s=null;anim=null;piscar=0;bip(330,.06)}avisar(textoModo());desenhar();return}
  if(modo==='menu'){if(k==='esq'||k==='dir'){jogo=ORDEM[(ORDEM.indexOf(jogo)+(k==='dir'?1:ORDEM.length-1))%ORDEM.length];bip(587,.04);aviso('escolheu',jogo);avisar(textoModo());desenhar()}else if(k==='girar')acao('start');return}
  if(modo!=='jogo')return;
  efeito(JOGOS[s.jogo].acao(s,k));
  desenhar()}
 // ---- toque e clique: ação na hora; segurando, repete (LEFT, RIGHT, DOWN). Na Corrida, segurar DOWN acelera.
 const REP={esq:1,dir:1,baixo:1};let rep=null,repT=null;
 const solta=()=>{clearTimeout(repT);clearInterval(rep);rep=repT=null;turbo=false;raiz.querySelectorAll('.bg-bt.on,.bg-pill.on').forEach(b=>b.classList.remove('on'))};
 raiz.querySelectorAll('[data-k]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();solta();b.classList.add('on');try{b.setPointerCapture(e.pointerId)}catch(_){}
   const k=b.dataset.k;if(navigator.vibrate)try{navigator.vibrate(8)}catch(_){}
   if(k==='baixo'&&s&&JOGOS[s.jogo].turbo&&modo==='jogo'){turbo=true;return}
   acao(k);if(REP[k])repT=setTimeout(()=>{rep=setInterval(()=>acao(k),k==='baixo'?55:85)},190)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,solta));
  b.addEventListener('click',e=>{if(e.detail===0)acao(b.dataset.k)}); // teclado/leitor de tela: Enter ou espaço no botão
  b.addEventListener('contextmenu',e=>e.preventDefault())});
 // ---- teclado: setas, espaço/↑ gira, Enter/P inicia ou pausa, R reinicia, M som
 const TECLA={ArrowLeft:'esq',ArrowRight:'dir',ArrowDown:'baixo',ArrowUp:'girar',' ':'girar',Enter:'start',p:'start',P:'start',r:'reset',R:'reset',m:'som',M:'som'};
 const aqui=()=>raiz.isConnected&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'');
 const kd=e=>{const k=TECLA[e.key];if(!k||!aqui())return;if(document.activeElement?.closest?.('.bg-corpo')&&(e.key==='Enter'||e.key===' '))return;e.preventDefault();
  if(k==='baixo'&&s&&JOGOS[s.jogo].turbo&&modo==='jogo'){turbo=true;return}if(e.repeat&&!REP[k])return;acao(k)};
 const ku=e=>{if(e.key==='ArrowDown')turbo=false};
 addEventListener('keydown',kd);addEventListener('keyup',ku);
 // ao sair da aba, o jogo pausa sozinho
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&modo==='jogo'){modo='pausa';solta();avisar(textoModo());desenhar()}});
 addEventListener('resize',ajustar);
 avisar(textoModo());ajustar();requestAnimationFrame(quadro);
 const api={acao,ganchos,estado:()=>({modo,jogo,s,rec,som,geral}),menu:j=>{if(JOGOS[j]&&modo==='menu'){jogo=j;avisar(textoModo());desenhar()}},geral:o=>{geral={};for(const k of ORDEM)geral[k]=Math.max(0,Math.floor(+o?.[k]||0));desenhar()}};raiz.__bg=api;return api // estado consultado pelos testes automáticos
}
