// Painel > JOGOS (Raspadinha e Roleta). Carregado somente quando o administrador abre esta aba.
// Salva apenas a chave "jogos" dentro de cr_site_settings.data (as demais configurações da loja são preservadas).
// O resumo lê a tabela cr_jogos_eventos (criada por supabase/05-jogos.sql). Nada aqui altera produtos ou categorias.
import {cfg,ligado,TIPOS,MAXR,linkOk} from './jogos.js';

const BKN={A:'Corrida',B:'Blocos',C:'Cobrinha',D:'Tanque',E:'Muralha',F:'Quebra-tijolos',G:'Travessia',H:'Pingue-pongue',I:'Chuva',J:'Saltador'}; // jogos do Brick Game 10 em 1
export async function panel(el,{sb,$,esc,run}){
 const getSet=async()=>(await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle()).data?.data||{};
 const [cur,{data:cats0},{data:dest}]=await Promise.all([getSet(),
  sb.from('cr_categories').select('name,slug,active').order('sort'),
  sb.from('cr_products').select('id,name').eq('status','active').eq('featured',true).order('name').limit(200)]);
 const cats=cats0||[],C=cfg(cur),R=C.resultados.map(r=>({...r})),saved=!!cur.jogos;
 // produtos oferecidos na lista: os em destaque + os já escolhidos + os achados na busca
 const nomes=new Map((dest||[]).map(p=>[p.id,p.name]));
 {const falta=R.filter(r=>r.tipo==='produto'&&r.valor&&!nomes.has(r.valor)).map(r=>r.valor);
  if(falta.length){const {data}=await sb.from('cr_products').select('id,name').in('id',falta);(data||[]).forEach(p=>nomes.set(p.id,p.name))}}
 const chance=i=>{const t=R.reduce((a,r)=>a+(+r.peso>0?+r.peso:0),0),p=+R[i].peso>0?+R[i].peso:0;return t?Math.round(p/t*100)+'%':'0%'};
 const campo=(r,i)=>r.tipo==='categoria'?`<label>Categoria<select data-i=${i} data-f=valor><option value="">Escolha…</option>${cats.map(c=>`<option value="${esc(c.slug)}" ${c.slug===r.valor?'selected':''}>${esc(c.name)}${c.active?'':' (inativa)'}</option>`).join('')}</select></label>`
  :r.tipo==='produto'?`<label>Produto (lista: produtos em destaque)<select data-i=${i} data-f=valor><option value="">Escolha…</option>${r.valor&&!nomes.has(r.valor)?`<option value="${esc(r.valor)}" selected>(produto fora do ar)</option>`:''}${[...nomes].map(([id,n])=>`<option value="${esc(id)}" ${id===r.valor?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
   <label>Não achou? Busque pelo nome<span style="display:flex;gap:6px"><input data-b=${i} placeholder="ex.: fone bluetooth"><button class="btn alt sm" type=button data-bb=${i}>Buscar</button></span></label>`
  :r.tipo==='link'?`<label>Link interno (ex.: lista.html?tipo=destaques)<input data-i=${i} data-f=valor maxlength=200 value="${esc(r.valor)}"></label>`:'';
 const linhas=()=>{$('#jr').innerHTML=R.map((r,i)=>`<div class=box style="background:#f7f9fc"><div class=row>
   <label>Texto do resultado<input data-i=${i} data-f=txt maxlength=40 value="${esc(r.txt)}" placeholder="ex.: Ver todas as ofertas"></label>
   <label>Emoji (opcional)<input data-i=${i} data-f=emoji maxlength=8 value="${esc(r.emoji)}" placeholder="🛍️"></label>
   <label>Leva para<select data-i=${i} data-f=tipo>${Object.entries(TIPOS).map(([k,n])=>`<option value=${k} ${r.tipo===k?'selected':''}>${n}</option>`).join('')}</select></label>
   <label>Peso (quanto maior, mais chance) — hoje: <b data-ch=${i}>${chance(i)}</b><input data-i=${i} data-f=peso type=number min=0 max=100 step=1 value="${r.peso}"></label></div>
   ${campo(r,i)}<p style="margin:6px 0 0"><button class="btn sm dng" type=button data-rm=${i}>Remover</button></p></div>`).join('')||'<p class=note>Nenhum resultado cadastrado. Adicione pelo menos um.</p>'};
 // tudo fica dentro de um bloco próprio: os eventos somem junto quando a aba é redesenhada
 el.innerHTML='<div id=jgp></div>';const root=$('#jgp');
 root.innerHTML=`<h2>Jogos</h2>
 <p class=note>Raspadinha e Roleta só por diversão, <b>sem prêmios, descontos ou cupons</b>. O resultado da Raspadinha e da Roleta é sempre um lugar do próprio site (ofertas, achadinhos, uma categoria, um produto).</p>
 <div class=box><h3>Ligar os jogos</h3>
  <label><input type=checkbox id=jr1 ${C.raspadinha?'checked':''}> <b>Raspadinha</b> ligada</label>
  <label><input type=checkbox id=jr2 ${C.roleta?'checked':''}> <b>Roleta</b> ligada</label>
  <label><input type=checkbox id=jr3 ${C.cobrinha?'checked':''}> <b>Jogo da Cobrinha</b> ligado <small>(página própria, com pontos e recorde pessoal no aparelho)</small></label>
  <label><input type=checkbox id=jr4 ${C.brickgame?'checked':''}> <b>Brick Game 10 em 1</b> ligado <small>(página própria: Corrida, Blocos, Cobrinha, Tanque e mais 6 jogos no estilo anos 90; recorde no aparelho)</small></label>
  <label><input type=checkbox id=jbn ${C.banner?'checked':''}> Mostrar um banner pequeno na página inicial chamando para os jogos</label>
  <p class=note>${ligado(C)?'✅ O botão “Jogos 🎮” está no menu do site.':'⏸️ Jogos desligados: o botão “Jogos 🎮” não aparece no menu.'} ${saved?'':'Configuração ainda não salva (usando o padrão).'}</p>
  <p><a class="btn alt" target=_blank rel=noopener href="../jogos.html">Abrir a página dos jogos</a> <a class="btn alt" target=_blank rel=noopener href="../lista.html?tipo=achadinhos">Ver os achadinhos</a></p></div>
 <div class=box><h3>Regras</h3><div class=row>
  <label>Preço máximo dos achadinhos (R$)<input id=jmax inputmode=decimal value="${String(C.achadinhos_max).replace('.',',')}"></label>
  <label>Limite de jogadas por dia, por aparelho (0 = sem limite)<input id=jlim type=number min=0 max=99 step=1 value="${C.limite}"></label></div>
  <p class=note>O limite vale para a Raspadinha e a Roleta juntas (a Cobrinha não tem limite) e fica guardado só no aparelho do visitante. Ao atingir, aparece “Volte amanhã para jogar de novo” e o botão “Ver ofertas”.</p></div>
 <div class=box><h3>Resultados possíveis</h3><p class=note>O que pode cair nos jogos (até ${MAXR}). Depois do resultado aparece “Olha o que separamos pra você!” e um botão grande com o texto abaixo.</p>
  <div id=jr></div><button class="btn alt" type=button id=jadd>+ Adicionar resultado</button></div>
 <p><button class=btn type=button id=jsave>Salvar</button></p>
 <div class=box><h3>Resumo</h3><div id=jsum><p class=note>Carregando…</p></div>
  <p class=note>“Jogadas” = vezes que alguém raspou ou girou. “Cliques” = toques no botão do resultado. Cliques não são vendas.</p><div id=jsc></div></div>
 <div class=box><h3>Ranking da Cobrinha</h3><div id=jrk><p class=note>Carregando…</p></div>
  <p class=note>Os pontos são calculados pelo servidor, que refaz cada partida. Se um apelido for ofensivo, use “Remover”: some do ranking tudo o que foi jogado com esse apelido.</p></div>
 <div class=box><h3>Desafio Brick Game</h3><label>Jogo <select id=jbkj>${Object.entries(BKN).map(([k,v])=>`<option value=${k}>${k} · ${v}</option>`).join('')}</select></label>
  <div id=jbk><p class=note>Carregando…</p></div>
  <p class=note>Ranking geral de cada jogo do Brick Game. O servidor recusa pontos impossíveis para o tempo jogado, mas não refaz a partida:
   se um resultado parecer falso ou o apelido for ofensivo, use “Apagar” (some só deste jogo).</p></div>`;
 linhas();
 // os campos gravam direto na lista em memória; só é salvo no banco ao clicar em Salvar
 root.addEventListener('input',e=>{const t=e.target,i=t.dataset?.i,f=t.dataset?.f;if(i==null||!f||!R[i])return;R[i][f]=t.value;
  if(f==='peso')root.querySelectorAll('[data-ch]').forEach(b=>{b.textContent=chance(+b.dataset.ch)});
  if(f==='tipo'){R[i].valor='';linhas()}});
 root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset?.b!=null){e.preventDefault();root.querySelector(`[data-bb="${e.target.dataset.b}"]`)?.click()}});
 root.addEventListener('click',e=>{const t=e.target.closest?.('button');if(!t)return;
  if(t.id==='jadd'){if(R.length>=MAXR)return alert('Máximo de '+MAXR+' resultados.');R.push({txt:'',emoji:'',tipo:'todas',valor:'',peso:1});linhas();return}
  if(t.dataset.rm!=null){if(!confirm('Remover este resultado?'))return;R.splice(+t.dataset.rm,1);linhas();return}
  if(t.dataset.bb!=null)run(async()=>{const i=+t.dataset.bb,q=String(root.querySelector(`[data-b="${i}"]`)?.value||'').trim();if(q.length<2)return alert('Digite pelo menos 2 letras.');
   const {data,error}=await sb.from('cr_products').select('id,name').eq('status','active').ilike('name','%'+q.replace(/[%_,()]/g,' ')+'%').order('name').limit(30);if(error)throw error;
   if(!data?.length)return alert('Nenhum produto ativo encontrado com esse nome.');
   data.forEach(p=>nomes.set(p.id,p.name));R[i].valor=data[0].id;linhas();root.querySelector(`select[data-i="${i}"][data-f=valor]`)?.focus()})});
 const ler=()=>{const s=String($('#jmax').value).trim(),mx=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s); // aceita 30, 29.90 ou 29,90
  return {raspadinha:$('#jr1').checked,roleta:$('#jr2').checked,cobrinha:$('#jr3').checked,brickgame:$('#jr4').checked,banner:$('#jbn').checked,achadinhos_max:mx,limite:Math.round(+$('#jlim').value||0),
   resultados:R.map(r=>({txt:String(r.txt||'').trim(),emoji:String(r.emoji||'').trim(),tipo:r.tipo,valor:String(r.valor||'').trim(),peso:Number(r.peso)}))}};
 $('#jsave').onclick=()=>run(async()=>{const c=ler();
  if(!(c.achadinhos_max>=1))return alert('Informe o preço máximo dos achadinhos (ex.: 30).');
  if(c.limite<0||c.limite>99)return alert('O limite de jogadas por dia vai de 0 (sem limite) a 99.');
  for(const [i,r] of c.resultados.entries()){const n='Resultado '+(i+1)+': ';
   if(!r.txt)return alert(n+'escreva o texto.');
   if(!(r.peso>=0&&r.peso<=100))return alert(n+'o peso vai de 0 a 100.');
   if(r.tipo==='categoria'&&!r.valor)return alert(n+'escolha a categoria.');
   if(r.tipo==='produto'&&!r.valor)return alert(n+'escolha o produto.');
   if(r.tipo==='link'&&!linkOk(r.valor))return alert(n+'o link precisa ser uma página do próprio site, como lista.html?tipo=destaques (sem http e sem barra no começo).')}
  if((c.raspadinha||c.roleta)&&!c.resultados.some(r=>r.peso>0))return alert('Para ligar um jogo, cadastre pelo menos um resultado com peso maior que zero.');
  const now=await getSet();   // lê de novo para não apagar mudanças feitas em outras abas do painel
  const {error}=await sb.from('cr_site_settings').upsert({id:1,data:{...now,jogos:{...cfg({jogos:c}),saved_at:new Date().toISOString()}}});if(error)throw error;
  alert('Salvo. '+(ligado(c)?'Jogos ligados: '+[c.raspadinha&&'Raspadinha',c.roleta&&'Roleta',c.cobrinha&&'Cobrinha',c.brickgame&&'Brick Game'].filter(Boolean).join(', ')+'.':'Os jogos estão desligados.'));panel(el,{sb,$,esc,run})});
 // resumo: jogadas e cliques no resultado, últimos 7 e 30 dias
 const desde=d=>new Date(Date.now()-d*864e5).toISOString();
 const cnt=async(jogo,tipo,d)=>{const {count,error}=await sb.from('cr_jogos_eventos').select('id',{count:'exact',head:true}).eq('jogo',jogo).eq('tipo',tipo).gte('created_at',desde(d));if(error)throw error;return count||0};
 try{const JG=[['raspadinha','Raspadinha'],['roleta','Roleta']],v=await Promise.all(JG.flatMap(([j])=>[cnt(j,'jogou',7),cnt(j,'clicou',7),cnt(j,'jogou',30),cnt(j,'clicou',30)]));
  const box=$('#jsum');if(box)box.innerHTML=`<div class=tw><table><thead><tr><th>Jogo</th><th>Jogadas (7 dias)</th><th>Cliques (7 dias)</th><th>Jogadas (30 dias)</th><th>Cliques (30 dias)</th></tr></thead><tbody>${JG.map(([,n],k)=>`<tr><td><b>${n}</b></td>${v.slice(k*4,k*4+4).map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
 catch(e){console.warn('jogos: resumo',e);const box=$('#jsum');if(box)box.innerHTML='<p class=note>Ainda sem contagem. Para começar a contar as jogadas, rode uma vez o arquivo <b>supabase/05-jogos.sql</b> no Supabase (SQL Editor).</p>'}
 // cobrinha: partidas registradas (tabela cr_jogos_ranking, supabase/07-cobrinha-ranking.sql) e ranking com moderação
 const SEM07='<p class=note>Ranking ainda não instalado. Rode uma vez o arquivo <b>supabase/07-cobrinha-ranking.sql</b> no Supabase (SQL Editor).</p>';
 const pc=async d=>{const {count,error}=await sb.from('cr_jogos_ranking').select('id',{count:'exact',head:true}).gte('finalizada_em',desde(d));if(error)throw error;return count||0};
 try{const [a,b]=await Promise.all([pc(7),pc(30)]);const x=$('#jsc');if(x)x.innerHTML=`<p><b>Cobrinha:</b> ${a} ${a===1?'partida':'partidas'} nos últimos 7 dias e ${b} nos últimos 30 dias.</p>`}catch(e){const x=$('#jsc');if(x)x.innerHTML=SEM07}
 const rk=async()=>{const box=$('#jrk');if(!box)return;const {data,error}=await sb.rpc('cr_cobrinha_ranking',{p_aparelho:null,p_limite:20});
  if(error){box.innerHTML=SEM07;return}
  const top=data?.top||[];box.innerHTML=top.length?`<div class=tw><table><thead><tr><th>Posição</th><th>Apelido</th><th>Pontos</th><th></th></tr></thead><tbody>${top.map(x=>`<tr><td>${x.pos}º</td><td>${esc(x.apelido)}</td><td><b>${x.pontos}</b></td><td><button class="btn sm dng" type=button data-rk="${esc(x.apelido)}">Remover</button></td></tr>`).join('')}</tbody></table></div><p class=note>${data.total} ${data.total===1?'jogador':'jogadores'} no ranking.</p>`:'<p class=note>Ninguém no ranking ainda.</p>';
  box.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>run(async()=>{const ap=b.dataset.rk;
   if(!confirm(`Remover “${ap}” do ranking? Todas as partidas dos aparelhos que usaram esse apelido serão apagadas (não dá para desfazer).`))return;
   const {data:rows,error:e1}=await sb.from('cr_jogos_ranking').select('aparelho').eq('apelido',ap).limit(1000);if(e1)throw e1;
   const ids=[...new Set((rows||[]).map(r=>r.aparelho))];if(!ids.length)return alert('Nada encontrado com esse apelido.');
   const {error:e2}=await sb.from('cr_jogos_ranking').delete().in('aparelho',ids);if(e2)throw e2;alert('Removido do ranking.');rk()}))};
 try{await rk()}catch(e){const box=$('#jrk');if(box)box.innerHTML=SEM07}
 // Desafio Brick Game (tabela cr_brick_partidas, supabase/08-brickgame-desafio.sql): ranking geral com moderação
 const SEM08='<p class=note>Desafio ainda não instalado. Rode uma vez o arquivo <b>supabase/08-brickgame-desafio.sql</b> no Supabase (SQL Editor).</p>';
 const bk=async()=>{const box=$('#jbk'),j=$('#jbkj')?.value||'A';if(!box)return;const {data,error}=await sb.rpc('cr_brick_ranking',{p_jogo:j,p_aparelho:null,p_periodo:'geral',p_limite:20});
  if(error){box.innerHTML=SEM08;return}
  const top=data?.top||[];box.innerHTML=top.length?`<div class=tw><table><thead><tr><th>Posição</th><th>Apelido</th><th>Pontos</th><th></th></tr></thead><tbody>${top.map(x=>`<tr><td>${x.pos}º</td><td>${esc(x.apelido)}</td><td><b>${x.pontos}</b></td><td><button class="btn sm dng" type=button data-bk="${esc(x.apelido)}">Apagar</button></td></tr>`).join('')}</tbody></table></div><p class=note>${data.total} ${data.total===1?'jogador':'jogadores'} em ${BKN[j]}.</p>`:`<p class=note>Ninguém no ranking de ${BKN[j]} ainda.</p>`;
  box.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>run(async()=>{const ap=b.dataset.bk;
   if(!confirm(`Apagar “${ap}” do ranking de ${BKN[j]}? As partidas desse apelido neste jogo serão apagadas (não dá para desfazer).`))return;
   const {data:rows,error:e1}=await sb.from('cr_brick_partidas').select('aparelho').eq('jogo',j).eq('apelido',ap).limit(1000);if(e1)throw e1;
   const ids=[...new Set((rows||[]).map(r=>r.aparelho))];if(!ids.length)return alert('Nada encontrado com esse apelido.');
   const {error:e2}=await sb.from('cr_brick_partidas').delete().eq('jogo',j).in('aparelho',ids);if(e2)throw e2;alert('Apagado do ranking.');bk()}))};
 const sel=$('#jbkj');if(sel)sel.onchange=()=>bk().catch(()=>{const box=$('#jbk');if(box)box.innerHTML=SEM08});
 try{await bk()}catch(e){const box=$('#jbk');if(box)box.innerHTML=SEM08}}
