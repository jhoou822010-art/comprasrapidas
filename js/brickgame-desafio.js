// Desafio Brick Game (só diversão, SEM prêmios): ranking da semana e geral de cada um dos 10 jogos, visto por todos.
// Usado só em brickgame.html. Precisa do arquivo supabase/08-brickgame-desafio.sql rodado uma vez no Supabase;
// sem ele (ou sem internet), a seção fica escondida e o jogo funciona normalmente com o recorde do aparelho.
import {JOGOS,ORDEM} from './brickgame.js';

const IK='cr_brick_id',AK='cr_brick_apelido';
const ler=(k,d)=>{try{return localStorage.getItem(k)??d}catch(e){return d}};
const gravar=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const escH=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
export const apelidoOk=a=>{a=String(a||'').trim().replace(/\s+/g,' ');return /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ._-]{2,12}$/.test(a)?a:''};
// código anônimo do aparelho (só separa um jogador do outro no ranking; nunca aparece para ninguém)
function idAparelho(){let v=ler(IK,'');if(/^[0-9a-f-]{36}$/.test(v))return v;
 try{v=crypto.randomUUID()}catch(e){v='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})}
 gravar(IK,v);return v}
const MED=['',' 🥇',' 🥈',' 🥉'];
// recados do campeão: frases prontas (o banco guarda só o número, 0 a 11; ninguém digita texto)
export const FRASES=['Toma! Cadê o próximo? 😎','Vem me pegar! 🏃','Sou o rei deste jogo 👑','Treinei muito! 💪','Duvido você passar 😏','Fácil demais 😴',
 'Quem é o próximo? 🎯','Esse recorde é meu! 🏆','Tenta aí, se puder 😜','Boa sorte, galera! 🍀','GG! Bom jogo 🤝','Esse foi suado 😅'];
const quando=t=>{const m=Math.max(0,(Date.now()-new Date(t))/6e4);return m<1?'agora':m<60?`há ${Math.round(m)} min`:m<1440?`há ${Math.round(m/60)} h`:`há ${Math.round(m/1440)} d`};
const erroTxt=e=>{const m=String(e?.message||e||'');return /Apelido|impossível|desligado|Muitas partidas|expirada|já foi enviada/.test(m)?m.replace(/^.*?(Apelido|Pontuação|O Brick|Muitas|Partida|Esta)/,'$1'):'sem conexão no momento.'};

// push (opcional, só no site): {pushOk,pushSubscribe,currentSub} de js/app.js, para o convite "Ativar avisos"
export function desafio(el,api,sb,push=null){
 if(!sb||!api)return;
 const aparelho=idAparelho();
 el.innerHTML=`<section class="box bgd" aria-labelledby=bgdt hidden>
  <h2 id=bgdt>🏆 Desafio Brick Game</h2>
  <p class=bgdc><b>Vamos ver quem faz mais pontos?</b> Jogue, coloque seu apelido e tente tirar o 1º lugar de cada jogo.
   O ranking da semana recomeça toda segunda-feira. Só pela diversão, sem prêmios.</p>
  <p class=bgdl aria-live=polite></p><p class=bgdq hidden></p>
  <div class=bgdf><label>Jogo <select id=bgdj>${ORDEM.map(k=>`<option value=${k}>${k} · ${escH(JOGOS[k].nome)}</option>`).join('')}</select></label>
   <span class=bgdp role=group aria-label="Período do ranking"><button type=button class="btn alt" data-p=semana aria-pressed=true>Esta semana</button><button type=button class="btn alt" data-p=geral aria-pressed=false>Geral</button></span></div>
  <div class=cbrs id=bgdr aria-live=polite></div>
  <ol class=cbrl id=bgdo></ol><p class=cbrv id=bgdv></p>
  <div class=bgdn id=bgdn hidden></div>
  <div class=bgdm hidden><h3>🔥 Últimos recordes</h3><ul id=bgdm></ul></div>
  <form class=cbap id=bgdap><label for=bgdai>Seu apelido no Desafio</label><span><input id=bgdai maxlength=12 autocomplete=nickname enterkeyhint=done placeholder="ex.: Ana_22"><button class="btn alt" type=submit>Salvar</button></span><small class=cbae id=bgdae role=alert></small></form>
  <p class="note cbpv">O Desafio guarda só o apelido e os pontos, ligados a um código anônimo deste aparelho. Pontos impossíveis para o tempo jogado são recusados e resultados suspeitos podem ser retirados.</p></section>`;
 const q=s=>el.querySelector(s),box=q('.bgd');
 let ver='A',per='semana',on=false,lideres={},atual=null,pend=null,mural=null;
 q('#bgdai').value=apelidoOk(ler(AK,''))||apelidoOk(ler('cr_cobrinha_apelido',''));
 const apelido=()=>apelidoOk(ler(AK,''))||apelidoOk(ler('cr_cobrinha_apelido',''));
 const msg=h=>{q('#bgdr').innerHTML=h};
 // chamada do topo: o líder do jogo escolhido
 const chamada=()=>{const l=lideres[ver],c=mural?.campeoes?.[ver],fr=c&&c.frase!=null&&FRASES[c.frase];
  q('.bgdl').innerHTML=l?`Líder de <b>${escH(JOGOS[ver].nome)}</b>: <b>${escH(l.apelido)}</b> com <b>${fmt(l.pontos)}</b> pontos.${fr?`<span class=bgdfr>“${escH(fr)}”</span>`:' Consegue passar? 🔥'}`
  :`Ninguém marcou pontos em <b>${escH(JOGOS[ver].nome)}</b> ainda. Seja o primeiro! 🚀`;
  // o próprio campeão pode escolher ou trocar o recado
  const bq=q('.bgdq');bq.hidden=!c?.voce;if(c?.voce){bq.innerHTML=`<button type=button class="btn alt" id=bgdqb>${c.frase==null?'👑 Deixar meu recado de campeão':'✏️ Trocar meu recado'}</button>`;q('#bgdqb').onclick=()=>recado(ver)}};
 // mural (parte 2, supabase/09-brickgame-campeoes.sql): campeões com recado e "quem passou quem". Sem ele, nada disso aparece.
 const verMural=d=>{mural=d;const f=d?.feitos||[],bm=q('.bgdm');bm.hidden=!f.length;
  q('#bgdm').innerHTML=f.map(x=>`<li><b>${escH(x.quem)}</b> passou <b>${escH(x.de)}</b> em ${escH(JOGOS[x.jogo]?.nome||x.jogo)}: ${fmt(x.pontos)} × ${fmt(x.antes)} <small>${quando(x.em)}</small></li>`).join('');chamada()};
 const lerMural=async()=>{try{const {data,error}=await sb.rpc('cr_brick_mural',{p_aparelho:aparelho});if(!error&&data)verMural(data)}catch(e){}};
 const recado=j=>{const c=mural?.campeoes?.[j];if(!c?.voce)return;
  msg(`<div class=bgdre><p><b>👑 Você é o 1º lugar em ${escH(JOGOS[j].nome)}!</b> Escolha o recado que todos vão ver:</p><div class=bgdrl>${FRASES.map((t,i)=>`<button type=button class="btn alt${c.frase===i?' on':''}" data-fr=${i}>${escH(t)}</button>`).join('')}</div></div>`);
  el.querySelectorAll('[data-fr]').forEach(b=>b.onclick=async()=>{b.disabled=true;
   const {data,error}=await sb.rpc('cr_brick_frase',{p_aparelho:aparelho,p_jogo:j,p_frase:+b.dataset.fr});
   if(error){b.disabled=false;msg(`Não deu para salvar o recado: ${escH(/1º lugar/.test(error.message)?'alguém passou você agora há pouco!':'sem conexão no momento.')}`);lerMural();return}
   verMural(data);msg(`Recado salvo: “${escH(FRASES[+b.dataset.fr])}” 😎`)})};
 // convite para ativar os avisos (opcional): só para quem já está no ranking e ainda não ativou
 const ligarAvisos=async(silencioso)=>{const sub=await push.currentSub();if(!sub)throw new Error('Notificações não ativadas.');
  const {error}=await sb.rpc('cr_brick_vincular',{p_aparelho:aparelho,p_endpoint:sub.endpoint});if(error)throw error;if(mural)mural.avisos=true;if(!silencioso)q('#bgdn').hidden=true};
 const convite=async()=>{const bn=q('#bgdn');if(!push||!mural||mural.avisos)return;
  try{if(push.pushOk()&&Notification.permission==='granted'&&await push.currentSub()){await ligarAvisos(true);return}}catch(e){}
  if(push.pushOk()&&Notification.permission==='denied')return;
  bn.hidden=false;bn.innerHTML=`<p><b>🔔 Quer saber quando alguém passar o seu recorde?</b> Ative as notificações: você recebe o aviso do Desafio e também as ofertas da loja. Dá para desligar quando quiser.</p>
   <p><button type=button class=btn id=bgdnb>Ativar avisos</button> <button type=button class="btn alt" id=bgdnx>Agora não</button></p><small class=cbae role=alert></small>`;
  q('#bgdnx').onclick=()=>{bn.hidden=true};
  q('#bgdnb').onclick=async()=>{const b=q('#bgdnb');b.disabled=true;
   try{await push.pushSubscribe();try{localStorage.setItem('cr_push_ok','1')}catch(_){}await ligarAvisos();msg('✅ Pronto! Você vai ser avisado quando alguém passar o seu recorde.')}
   catch(e){b.disabled=false;bn.querySelector('.cbae').textContent=String(e?.message||e)}}};
 const lista=r=>{const top=r?.top||[];
  q('#bgdo').innerHTML=top.length?top.map(x=>`<li class="${x.voce?'eu':''}"><b>${x.pos}º${MED[x.pos]||''}</b><span>${escH(x.apelido)}${x.voce?' <small>(você)</small>':''}</span><i>${fmt(x.pontos)}</i></li>`).join('')
   :`<li class=vz>${per==='semana'?'Ninguém jogou esta semana ainda.':'Ninguém no ranking ainda.'}</li>`;
  const v=r?.voce;q('#bgdv').innerHTML=v?`Sua posição ${per==='semana'?'nesta semana':'geral'}: <b>${v.pos}º</b> de ${r.total}, com ${fmt(v.pontos)} pontos.`:'Faça pontos e escolha um apelido para entrar no ranking.'};
 const recordes=async()=>{const {data,error}=await sb.rpc('cr_brick_recordes',{});if(error)throw error;lideres=data||{};
  const m={};for(const k of ORDEM)m[k]=lideres[k]?.pontos||0;api.geral(m);on=true;box.hidden=false;chamada();lerMural()};
 const carregar=async()=>{try{if(!on)await recordes();const {data,error}=await sb.rpc('cr_brick_ranking',{p_jogo:ver,p_aparelho:aparelho,p_periodo:per,p_limite:10});if(error)throw error;lista(data)}
  catch(e){if(on){q('#bgdo').innerHTML='<li class=vz>Ranking indisponível sem conexão.</li>';q('#bgdv').textContent=''}}};
 const escolher=j=>{if(!JOGOS[j])return;ver=j;q('#bgdj').value=j;chamada();carregar()};
 const pedido=new URLSearchParams(location.search).get('jogo');                 // link do aviso: brickgame.html?jogo=A
 q('#bgdj').onchange=e=>escolher(e.target.value);
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{per=b.dataset.p;el.querySelectorAll('[data-p]').forEach(x=>x.setAttribute('aria-pressed',x===b));carregar()});
 // ---- envio da partida
 const enviar=async(p,ap)=>{p.enviando=true;try{const r=await p.req;if(!r?.id)return;
   const lider=lideres[p.jogo]?.pontos||0;
   const {data,error}=await sb.rpc('cr_brick_enviar',{p_id:r.id,p_aparelho:aparelho,p_pontos:p.pontos,p_apelido:ap||null});if(error)throw error;
   if(pend===p)pend=null;if(!ap)return;
   lideres=data.recordes||lideres;const m={};for(const k of ORDEM)m[k]=lideres[k]?.pontos||0;api.geral(m);
   const s=data.semana?.voce,g=data.geral?.voce,nome=escH(JOGOS[p.jogo].nome);
   msg(g?.pos===1&&p.pontos>lider?`🎉 <b>NOVO RECORDE DO DESAFIO</b> em ${nome}: ${fmt(p.pontos)} pontos!`
    :s?`Você está em <b>${s.pos}º lugar</b> nesta semana em ${nome}${s.pos===1?' 🥇':''}. ${s.pos>1?'Jogue de novo e suba no ranking!':''}`:'');
   if(ver!==p.jogo)escolher(p.jogo);else{chamada();lista(per==='semana'?data.semana:data.geral)}
   // virou campeão: já abre a escolha do recado; depois, o convite dos avisos
   await lerMural();if(mural?.campeoes?.[p.jogo]?.voce&&g?.pos===1&&p.pontos>lider)recado(p.jogo);convite()}
  catch(e){p.enviando=false;const t=erroTxt(e);
   // apelido recusado pelo servidor: esquece o apelido e pede outro (a partida continua guardada para enviar)
   if(ap&&/Apelido/.test(t)){gravar(AK,'');q('#bgdai').value='';pedirApelido(p,t);return}
   if(ap)msg(`Não foi possível entrar no ranking: ${escH(t)}`)}};
 // partida que terminou sem apelido: vai sem apelido (conta, mas só aparece depois que o aparelho escolher um)
 const soltar=()=>{if(pend&&!pend.enviando){const p=pend;pend=null;enviar(p,'')}};
 const pedirApelido=(p,erro='')=>{pend=p;msg(`<form class=cbaf id=bgdaf><label for=bgdafi>Você fez ${fmt(p.pontos)} pontos! Coloque um apelido para entrar no Desafio</label><span><input id=bgdafi maxlength=12 autocomplete=nickname enterkeyhint=send placeholder="ex.: Ana_22"><button class=btn type=submit>Entrar</button></span><small class=cbae role=alert>${escH(erro)}</small></form>`);
  const f=q('#bgdaf');f.onsubmit=e=>{e.preventDefault();const a=apelidoOk(f.querySelector('input').value);if(!a){f.querySelector('.cbae').textContent='Use de 2 a 12 letras ou números.';return}
   gravar(AK,a);q('#bgdai').value=a;msg('Enviando…');enviar(p,a)}};
 q('#bgdap').onsubmit=e=>{e.preventDefault();const a=apelidoOk(q('#bgdai').value),er=q('#bgdae');
  if(!a){er.classList.remove('ok');er.textContent='Use de 2 a 12 letras ou números.';return}
  gravar(AK,a);q('#bgdai').value=a;er.classList.add('ok');er.textContent='Apelido salvo. Ele aparece no ranking a partir da sua próxima partida.';if(pend&&!pend.enviando){msg('Enviando…');enviar(pend,a)}};
 api.ganchos.escolheu=j=>escolher(j);
 api.ganchos.inicio=j=>{soltar();if(!on){atual=null;return}
  atual={jogo:j,req:sb.rpc('cr_brick_iniciar',{p_aparelho:aparelho,p_jogo:j}).then(({data,error})=>error?null:data,()=>null)}};
 api.ganchos.fim=(j,pts)=>{const p=atual;atual=null;if(!p||p.jogo!==j||!(pts>0))return;p.pontos=pts;msg('');
  const ap=apelido();if(ap)enviar(p,ap);else pedirApelido(p)};
 addEventListener('pagehide',soltar);
 if(JOGOS[pedido]){api.menu?.(pedido);escolher(pedido)}else escolher('A');
}
