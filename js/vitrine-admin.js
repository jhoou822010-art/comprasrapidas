// Painel > SISTEMA INTELIGENTE DA VITRINE. Carregado somente quando o administrador abre esta aba.
// Salva apenas a chave "vitrine" dentro de cr_site_settings.data (as demais configurações da loja são preservadas).
// Somente leitura em produtos: nada aqui altera produtos, preços, imagens ou links.
import {DEF,cfg,SEGS,PROFS,SEG_KEYS,classify,simulate} from './vitrine.js';

const HOURS=[2,4,6,8,10,12,24];
const PRIV='Personalização da vitrine: para mostrar produtos mais próximos do que você procura, o site guarda neste aparelho (armazenamento local do navegador) um resumo anônimo das suas buscas, categorias visitadas, produtos vistos e faixas de preço. Esse resumo não é enviado aos nossos servidores, não identifica você e perde força com o tempo. Você pode desativar a personalização nesta página ou apagar os dados do site nas configurações do navegador. Base legal: legítimo interesse (art. 7º, IX, da LGPD), com direito de oposição.';

export async function panel(el,{sb,$,esc,run}){
 const getSet=async()=>(await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle()).data?.data||{};
 const [cur,{data:rows0,error},{data:cats}]=await Promise.all([getSet(),
  sb.from('cr_products').select('id,name,price,old_price,offer,offer_start,offer_end,category_id,created_at,categories:cr_categories(name)').eq('status','active').order('created_at',{ascending:false}).limit(5000),
  sb.from('cr_categories').select('id,name,active').order('sort')]);
 if(error)throw error;
 const rows=(rows0||[]).map(r=>({id:r.id,n:r.name,p:r.price==null?null:+r.price,o:r.old_price==null?null:+r.old_price,of:!!r.offer,os:r.offer_start,oe:r.offer_end,c:r.category_id,cn:r.categories?.name||'',t:r.created_at}));
 let C=cfg(cur);const saved=!!cur.vitrine;
 const catName=id=>(cats||[]).find(c=>c.id===id)?.name||'?';
 // categorias efetivas de uma regra (automática pelo nome ou lista salva)
 const effCats=k=>{const r=C.rules[k];if(Array.isArray(r.cats))return new Set(r.cats);let re=null;try{re=r.cat_pat?new RegExp(r.cat_pat,'i'):null}catch(e){}
  const n=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();return new Set((cats||[]).filter(c=>re&&re.test(n(c.name))).map(c=>c.id))};
 const counts=()=>{const cl=classify(rows,C),o={};for(const k of SEG_KEYS)o[k]=cl.filter(x=>(x.s[k]||0)>=.45).length;return o};
 const sumOf=p=>Object.values(p).reduce((a,b)=>a+(+b||0),0);

 const draw=()=>{const cn=counts(),custom=!HOURS.includes(C.hours);
 el.innerHTML=`<h2>Sistema Inteligente da Vitrine</h2>
 <p class=note>Escolhe e ordena os produtos de cada visitante conforme os interesses dele. A aparência da loja não muda, e nenhum produto, preço, imagem ou link de afiliado é alterado.</p>
 <div class=box><h3>Funcionamento</h3>
  <label><input type=checkbox id=von ${C.on?'checked':''}> <b>Ligado</b> para todos os visitantes</label>
  <p class=note>${C.on?'✅ Ligado.':'⏸️ Desligado: a loja mostra a vitrine original.'} ${saved?'':'Configuração ainda não salva (usando o padrão).'}</p>
  <p><a class="btn alt" target=_blank rel=noopener href="../index.html?vitrine=teste">Testar só para mim (nesta aba)</a> <a class="btn alt" target=_blank rel=noopener href="../index.html?vitrine=0">Ver vitrine original</a></p>
  <p class=note>O teste vale só na aba aberta e não liga o sistema para ninguém. Para sair do teste, feche a aba.</p>
  <label>Intervalo de renovação da vitrine inteligente
   <select id=vh>${HOURS.map(h=>`<option value=${h} ${!custom&&C.hours===h?'selected':''}>${h} horas</option>`).join('')}<option value=x ${custom?'selected':''}>Personalizado…</option></select></label>
  <label id=vhcw style="${custom?'':'display:none'}">Horas (de 0,5 a 720)<input id=vhc type=number min=0.5 max=720 step=0.5 value="${C.hours}"></label>
  <p class=note>Ao fim de cada intervalo, cada visitante recebe uma nova seleção de produtos. Os interesses aprendidos são mantidos.</p></div>
 <div class=box><h3>Combinação</h3>
  <label>Perfil base (visitantes novos ou sem interesses claros)<select id=vb>${Object.entries(PROFS).map(([k,n])=>`<option value=${k} ${C.base===k?'selected':''}>${n}</option>`).join('')}</select></label>
  <label>Força da inteligência individual: <b id=viv>${C.intensity}%</b><input id=vi type=range min=0 max=100 step=5 value=${C.intensity}></label>
  <p class=note>0% = todos veem o perfil base. 100% = quem já mostrou interesses vê quase só os perfis desses interesses. A força cresce aos poucos com a quantidade de sinais do visitante, então uma única busca muda pouco.</p>
  <p><b>Onde personalizar</b></p>
  <label><input type=checkbox id=va1 ${C.areas.ofertas?'checked':''}> Início: Ofertas</label><label><input type=checkbox id=va2 ${C.areas.novidades?'checked':''}> Início: Novidades</label><label><input type=checkbox id=va3 ${C.areas.categorias?'checked':''}> Ordem dentro das categorias</label>
  <p class=note>Destaques, Carrossel, banners e busca continuam exatamente como você configurou.</p></div>
 <div class=box><h3>Perfis de composição</h3><p class=note>Porcentagem de cada tipo de produto na vitrine. “Livre” = os melhores para o visitante, de qualquer tipo. Cada perfil precisa somar 100%.</p>
  ${Object.entries(PROFS).map(([k,n])=>{const p=C.profiles[k],s=sumOf(p);return `<details><summary><b>${n}</b> — <span data-sum=${k} style="color:${s===100?'inherit':'#b91c1c'}">soma ${s}%</span></summary><div class=row>${[...SEG_KEYS,'livre'].map(x=>`<label>${x==='livre'?'Livre':SEGS[x]} (%)<input type=number min=0 max=100 data-pf=${k} data-sg=${x} value="${p[x]||0}"></label>`).join('')}</div></details>`}).join('')}</div>
 <div class=box><h3>Regras de cada tipo</h3><p class=note>Usam as categorias e os nomes já cadastrados. Palavras separadas por vírgula; “*” no fim = começo de palavra (ex.: masculin* acha masculino e masculina).</p>
  ${SEG_KEYS.map(k=>{const r=C.rules[k],ec=effCats(k);return `<details><summary><b>${SEGS[k]}</b> — ${cn[k]} produtos</summary>
   ${k==='economico'?`<label>Preço máximo (R$)<input type=number min=0 step=0.01 data-rx=${k} data-f=max_price value="${r.max_price??''}"></label>`:''}
   ${k==='achadinhos'?`<label>Desconto mínimo em oferta (%)<input type=number min=0 max=99 data-rx=${k} data-f=min_disc value="${r.min_disc??''}"></label>`:''}
   <p><b>Categorias</b> ${Array.isArray(r.cats)?'':'<small>(automático pelo nome; marcar/desmarcar fixa a escolha)</small>'}</p>
   <div class=row>${(cats||[]).map(c=>`<label><input type=checkbox data-rc=${k} value="${c.id}" ${ec.has(c.id)?'checked':''}> ${esc(c.name)}${c.active?'':' (inativa)'}</label>`).join('')}</div>
   <label>Palavras-chave no nome<textarea data-rx=${k} data-f=kw>${esc(r.kw)}</textarea></label>
   <label>Excluir se o nome tiver<textarea data-rx=${k} data-f=excl style="min-height:50px">${esc(r.excl)}</textarea></label></details>`}).join('')}</div>
 <div class=box><h3>Prévia (simulação)</h3><p class=note>Simule um visitante para ver quais ofertas ele receberia com as regras acima (antes de salvar). Nada é gravado.</p>
  <div class=row>${SEG_KEYS.map(k=>`<label><input type=checkbox data-si=${k}> Interesse: ${SEGS[k]}</label>`).join('')}</div>
  <label>Faixa de preço que ele costuma ver (R$, opcional)<input id=sp type=number min=1 step=1 placeholder="ex.: 40"></label>
  <label>Pesquisou (opcional)<input id=sq placeholder="ex.: tênis barato"></label>
  <button class="btn alt" id=sim>Simular</button><div id=sr></div></div>
 <div class=box><h3>Privacidade (LGPD)</h3>
  <label><input type=checkbox id=vpo ${C.privacy_optout?'checked':''}> Mostrar a opção “Desativar neste aparelho” na página de Política de privacidade</label>
  <p class=note>O perfil de interesses fica só no aparelho do visitante; nada de comportamento é enviado ao banco. Recomendamos incluir este parágrafo na sua política:</p>
  <div class=box style="white-space:pre-line;font-size:.9rem">${esc(PRIV)}</div>
  <button class="btn alt" id=vpriv ${String(cur.privacy||'').includes('Personalização da vitrine:')?'disabled':''}>${String(cur.privacy||'').includes('Personalização da vitrine:')?'Já incluído na política':'Adicionar à Política de privacidade'}</button></div>
 <p><button class="btn big" id=vsave>Salvar</button> <button class="btn alt" id=vdef>Restaurar padrão</button></p>`;
 bind()};

 // lê o formulário para C (sem salvar)
 const readForm=()=>{const c=JSON.parse(JSON.stringify(C));
  c.on=$('#von').checked;const hv=$('#vh').value;c.hours=hv==='x'?Math.min(720,Math.max(.5,+$('#vhc').value||6)):+hv;
  c.base=$('#vb').value;c.intensity=+$('#vi').value;c.areas={ofertas:$('#va1').checked,novidades:$('#va2').checked,categorias:$('#va3').checked};c.privacy_optout=$('#vpo').checked;
  el.querySelectorAll('[data-pf]').forEach(i=>{const p=c.profiles[i.dataset.pf];const v=Math.max(0,Math.round(+i.value||0));if(v)p[i.dataset.sg]=v;else delete p[i.dataset.sg]});
  el.querySelectorAll('[data-rx]').forEach(i=>{const r=c.rules[i.dataset.rx],f=i.dataset.f;r[f]=f==='kw'||f==='excl'?i.value.trim():(i.value===''?0:+i.value)});
  for(const k of SEG_KEYS){if(el.dataset['tc'+k]){c.rules[k].cats=[...el.querySelectorAll(`[data-rc=${k}]:checked`)].map(x=>x.value)}}
  return c};
 const bind=()=>{
  $('#vh').onchange=()=>{$('#vhcw').style.display=$('#vh').value==='x'?'':'none'};
  $('#vi').oninput=()=>{$('#viv').textContent=$('#vi').value+'%'};
  el.querySelectorAll('[data-pf]').forEach(i=>i.oninput=()=>{const k=i.dataset.pf,s=[...el.querySelectorAll(`[data-pf=${k}]`)].reduce((a,x)=>a+(Math.round(+x.value)||0),0),t=el.querySelector(`[data-sum=${k}]`);t.textContent='soma '+s+'%';t.style.color=s===100?'inherit':'#b91c1c'});
  el.querySelectorAll('[data-rc]').forEach(i=>i.onchange=()=>{el.dataset['tc'+i.dataset.rc]='1'});
  $('#sim').onclick=()=>run(()=>{const c=readForm(),seg={},sel=[...el.querySelectorAll('[data-si]:checked')].map(x=>x.dataset.si);sel.forEach(k=>seg[k]=6);
   const tok={};String($('#sq').value||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=3).forEach(t=>tok[t]=4);
   if(/barat|econom|promo/.test(Object.keys(tok).join(' ')))seg.economico=(seg.economico||0)+4;
   const r=simulate(rows,c,{seg,tok,price:+$('#sp').value||0,ev:sel.length?12+Object.keys(tok).length*3:Object.keys(tok).length*3},{qty:15,seed:'painel-'+Date.now()});
   const mix=Object.entries(r.mix.mix).sort((a,b)=>b[1]-a[1]);
   $('#sr').innerHTML=`<p><b>Mistura aplicada:</b> ${mix.map(([k,v])=>`${k==='livre'?'Livre':SEGS[k]} ${Math.round(v*100)}%`).join(' · ')}</p><ol>${r.list.map((p,i)=>`<li>${esc(p.n)} — <b>${p.p!=null?'R$ '+p.p.toFixed(2).replace('.',','):''}</b> <small>${esc(catName(p.c))}${Object.keys(r.segs[i]).length?' · '+Object.keys(r.segs[i]).map(k=>SEGS[k]).join(', '):''}</small></li>`).join('')}</ol><p class=note>Cada simulação usa um sorteio diferente, como acontece a cada renovação.</p>`});
  $('#vpriv').onclick=()=>run(async()=>{const now=await getSet();if(String(now.privacy||'').includes('Personalização da vitrine:'))return alert('O parágrafo já está na política.');
   if(!confirm('Adicionar o parágrafo ao final da Política de privacidade?'))return;
   const {error}=await sb.from('cr_site_settings').upsert({id:1,data:{...now,privacy:(now.privacy?now.privacy.trimEnd()+'\n\n':'')+PRIV}});if(error)throw error;cur.privacy=(now.privacy||'')+PRIV;alert('Parágrafo adicionado à Política de privacidade.');draw()});
  $('#vdef').onclick=()=>{if(!confirm('Voltar todos os campos ao padrão? (só é gravado ao clicar em Salvar)'))return;const on=C.on;C=JSON.parse(JSON.stringify(DEF));C.on=on;SEG_KEYS.forEach(k=>delete el.dataset['tc'+k]);draw()};
  $('#vsave').onclick=()=>run(async()=>{const c=readForm();
   const bad=Object.entries(c.profiles).filter(([,p])=>sumOf(p)!==100).map(([k])=>PROFS[k]);if(bad.length)return alert('Estes perfis não somam 100%: '+bad.join(', '));
   for(const k of SEG_KEYS)if(c.rules[k].cat_pat)try{new RegExp(c.rules[k].cat_pat,'i')}catch(e){return alert('Regra inválida em '+SEGS[k])}
   if(c.on&&!C.on&&!confirm('Ligar a vitrine inteligente para todos os visitantes?'))return;
   const now=await getSet();   // lê de novo para não apagar mudanças feitas em outras abas do painel
   const {error}=await sb.from('cr_site_settings').upsert({id:1,data:{...now,vitrine:{...c,ver:2,saved_at:new Date().toISOString()}}});if(error)throw error;
   C=cfg({vitrine:c});SEG_KEYS.forEach(k=>delete el.dataset['tc'+k]);Object.assign(cur,{vitrine:c});alert(c.on?'Salvo. A vitrine inteligente está LIGADA.':'Salvo. A vitrine inteligente está DESLIGADA (vitrine original).');draw()})};
 draw()}
