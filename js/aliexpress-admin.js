// Painel > ALIEXPRESS. Busca produtos na API de Afiliados do AliExpress (pela função supabase/functions/aliexpress),
// escolhe a categoria do site para cada um e importa. Também atualiza os preços dos já importados.
// Carregado somente quando o administrador abre esta aba.
// Guarda só a chave "ali_cat_map" em cr_site_settings.data (categoria do AliExpress -> categoria do site).

// Palavras que ligam as categorias do AliExpress (inglês ou português) às categorias do site
const SUG=[
 [/maquiag|makeup|cosm|beauty|beleza|nail|unha|perfum/i,/beleza|maquiag/i],
 [/hair|cabel|wig|peruc|shav|barbe|depil|oral|dental|personal care|cuidado/i,/cuidados pessoais|beleza/i],
 [/women.*cloth|feminin|dress|vestid|lingerie|underwear|íntim|intim/i,/moda feminina/i],
 [/men.*cloth|masculin/i,/moda masculina/i],
 [/jewel|joia|joia|watch|relóg|relog|bag|bolsa|luggage|mala|apparel access|acessórios de moda|óculos|oculos|sunglass|shoe|calçad|calcad|sapat|tênis/i,/acessórios de moda|moda/i],
 [/phone|celular|telecom|computer|comput|office electr|tablet|smart|gadget|cabo|cable|charger|carregador/i,/tecnologia|eletrônicos/i],
 [/consumer electr|electronic|eletrôn|eletron|audio|áudio|fone|earphone|headphone|camera|câmera|video game|game|speaker/i,/eletrônicos|tecnologia/i],
 [/home appliance|eletrodom|kitchen appliance/i,/eletrodomésticos/i],
 [/kitchen|cozinha|dining|mesa|bar\b|cookware|panela/i,/cozinha/i],
 [/furniture|móve|move|decor|lighting|iluminaç|lâmpada|lamp/i,/móveis|decoraç/i],
 [/home.*garden|casa|storage|organiz|household|cleaning|limpeza|bathroom|banheiro/i,/casa|organizaç/i],
 [/tool|ferrament|home improvement|construç|hardware|security|segurança/i,/ferramentas|construç/i],
 [/automo|car\b|carro|moto|vehicle|veícul/i,/automotivo/i],
 [/sport|esporte|fitness|gym|academia|yoga|cycling|bike|outdoor|camping|health|saúde|massag/i,/fitness|bem-estar/i],
 [/pet|cachorr|dog|cat\b|gato|aquar/i,/pet/i],
 [/mother|kid|baby|bebê|bebe|infant|criança|toy|brinquedo|hobb/i,/bebês|crianças/i],
 [/office|school|escrit|papelar|stationer|escolar/i,/papelaria|escritório/i],
 [/wedding|event|festa|party|casamento|celebra/i,/festas|comemoraç/i],
 [/christmas|natal/i,/natal/i],
 [/music|músic|instrument/i,/música/i],
];
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

export async function panel(el,{sb,$,esc,run,slug}){
 el.innerHTML='<div id=alip><p class=note>Carregando…</p></div>';const root=$('#alip');
 const call=async body=>{const {data,error}=await sb.functions.invoke('aliexpress',{body});
  if(error){let m=error.message;try{const j=await error.context.json();if(j?.error)m=j.error}catch(_){}
   if(/not found|404/i.test(m))m='A função "aliexpress" ainda não foi publicada no Supabase.';throw new Error(m)}return data};
 let st;try{st=await call({action:'status'})}catch(e){st={configured:false,err:e.message}}
 if(!st.configured){root.innerHTML=`<h2>AliExpress</h2><div class=box><h3>Falta configurar as chaves</h3>
  ${st.err?`<p>⚠️ ${esc(st.err)}</p>`:`<p>Ainda faltam: <b>${esc((st.missing||[]).join(', '))}</b></p>`}
  <ol><li>Abra o <b>Supabase</b> › seu projeto › <b>Edge Functions</b> › <b>Secrets</b> (ou Project Settings › Edge Functions).</li>
  <li>Adicione três secrets (nome exatamente assim):<br><code>ALI_APP_KEY</code> = App Key<br><code>ALI_APP_SECRET</code> = App Secret<br><code>ALI_TRACKING_ID</code> = seu Tracking ID de afiliado</li>
  <li>Volte aqui e abra esta aba de novo.</li></ol>
  <p class=note>As chaves ficam só no servidor. Nunca coloque o App Secret no site, no config.js ou em mensagens.</p></div>`;return}

 const getSet=async()=>(await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle()).data?.data||{};
 const [set0,{data:cats0},{data:mer}]=await Promise.all([getSet(),sb.from('cr_categories').select('id,name').order('name'),sb.from('cr_merchants').select('id,name')]);
 let cats=cats0||[],cmap={...(set0.ali_cat_map||{})};
 const merchant=async()=>{let m=(mer||[]).find(x=>/^ali\s*express$/i.test(x.name.trim()));if(m)return m.id;
  m=(await sb.from('cr_merchants').insert({name:'AliExpress'}).select('id').single()).data;return m.id};
 const suggest=p=>{const k=cmap[p.cat2_id]||cmap[p.cat1_id];if(k&&cats.some(c=>c.id===k))return k;
  const txt=[p.cat2,p.cat1,p.title].join(' ');
  for(const [re,cr] of SUG)if(re.test(txt)){const c=cats.find(c=>cr.test(c.name));if(c)return c.id}
  const f=fold(p.cat1);return cats.find(c=>f&&fold(c.name).includes(f))?.id||''};
 let R=[],page=1,last={};
 const opts=sel=>`<option value="">— escolha a categoria —</option>${cats.map(c=>`<option value="${c.id}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ Criar categoria nova…</option>`;
 const brl=v=>v==null?'—':'R$ '+Number(v).toFixed(2).replace('.',',');

 root.innerHTML=`<h2>AliExpress</h2>
 <div class=box><h3>1. Buscar produtos</h3>
  <div class=row><label>O que procurar<input id=aq placeholder="ex.: fone bluetooth, organizador, luminária"></label>
  <label>Ordenar<select id=as><option value="">Mais relevantes</option><option value=vendas>Mais vendidos</option><option value=desconto>Maior desconto</option><option value=menor>Menor preço</option><option value=maior>Maior preço</option></select></label></div>
  <div class=row><label>Preço mínimo (R$)<input id=amin inputmode=decimal></label><label>Preço máximo (R$)<input id=amax inputmode=decimal></label></div>
  <label style="display:flex;gap:8px;align-items:center"><input type=checkbox id=ah style="width:auto"> Só produtos em alta (mais comissão/procura)</label>
  <p><button class=btn id=ab>Buscar</button></p>
  <details><summary>Ou cole links de produtos do AliExpress</summary><label>Um link por linha<textarea id=au rows=4 placeholder="https://pt.aliexpress.com/item/1005….html"></textarea></label><button class="btn alt" id=aub>Carregar links</button></details></div>
 <div id=ares></div>
 <div class=box><h3>2. Atualizar preços dos já importados</h3>
  <p class=note>Confere no AliExpress todos os produtos que vieram por esta aba e atualiza preço, preço anterior, oferta e link de afiliado.</p>
  <label style="display:flex;gap:8px;align-items:center"><input type=checkbox id=aarc style="width:auto"> Arquivar os que não estão mais disponíveis no AliExpress</label>
  <p><button class="btn alt" id=arf>Atualizar preços agora</button></p><div id=arfo></div></div>`;

 const draw=async(info='')=>{
  const ids=R.map(p=>p.id);let have=new Set();
  if(ids.length){const {data}=await sb.from('cr_products').select('ext_id').eq('ext_source','aliexpress').in('ext_id',ids);have=new Set((data||[]).map(x=>x.ext_id))}
  R.forEach(p=>{p.have=have.has(p.id);if(p.cat===undefined)p.cat=suggest(p);if(p.sel===undefined)p.sel=false});
  $('#ares').innerHTML=!R.length?`<div class=box><p>${info||'Nenhum produto encontrado.'}</p></div>`:`<div class=box>
   <p class=note>${esc(info)} Marque os que quer na vitrine, confira o nome e a categoria e clique em Importar. Os que já estão no site aparecem como “Já importado”.</p>
   <p><button class="btn alt sm" id=aall>Marcar todos</button> <button class="btn alt sm" id=anone>Desmarcar</button>
   <label style="display:inline-flex;gap:6px;align-items:center;margin-left:8px">Categoria para os marcados <select id=abulk style="width:auto">${opts('')}</select></label></p>
   <div id=agrid style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">${R.map((p,i)=>`
    <div class=box style="margin:0;padding:10px;${p.have?'opacity:.55':''}">
     <label style="display:flex;gap:8px;align-items:center;margin:0 0 6px"><input type=checkbox data-s=${i} ${p.sel?'checked':''} ${p.have?'disabled':''} style="width:auto"> ${p.have?'<b>✅ Já importado</b>':'Importar'}</label>
     <img src="${esc(p.images[0]||'')}" alt="" loading=lazy style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#eef1f6">
     <label>Nome<textarea data-t=${i} rows=3 maxlength=200>${esc(p.title)}</textarea></label>
     <p style="margin:4px 0"><b>${brl(p.price)}</b> ${p.old_price?`<s style="color:#6b7891">${brl(p.old_price)}</s> <small>${esc(p.discount)}</small>`:''}<br><small class=note>${esc([p.cat1,p.cat2].filter(Boolean).join(' › '))}${p.sold?' · '+p.sold+' vendidos':''}</small></p>
     <label>Categoria do site<select data-c=${i}>${opts(p.cat)}</select></label>
     ${p.url?`<a href="${esc(p.url)}" target=_blank rel=noopener><small>Ver no AliExpress ↗</small></a>`:''}
    </div>`).join('')}</div>
   <p style="margin-top:12px"><label style="display:inline-flex;gap:6px;align-items:center"><input type=checkbox id=afe style="width:auto"> Marcar como destaque</label></p>
   <p><button class=btn id=ago>Importar selecionados</button> ${last.q!==undefined?`<button class="btn alt" id=amore>Próxima página ›</button>`:''}</p></div>`;
  if(!R.length)return;
  const cnt=()=>{const k=R.filter(p=>p.sel&&!p.have).length;$('#ago').textContent=`Importar ${k} selecionado(s)`};cnt();
  const newCat=async sel=>{const nm=prompt('Nome da nova categoria:');if(!nm?.trim()){sel.value='';return ''}
   const {data,error}=await sb.from('cr_categories').insert({name:nm.trim(),slug:slug(nm.trim())}).select('id,name').single();if(error)throw error;
   cats=[...cats,data].sort((a,b)=>a.name.localeCompare(b.name));return data.id};
  root.querySelectorAll('[data-s]').forEach(x=>x.onchange=()=>{R[x.dataset.s].sel=x.checked;cnt()});
  root.querySelectorAll('[data-t]').forEach(x=>x.oninput=()=>R[x.dataset.t].title=x.value);
  root.querySelectorAll('[data-c]').forEach(x=>x.onchange=()=>run(async()=>{let v=x.value;if(v==='__new'){v=await newCat(x);if(v){R[x.dataset.c].cat=v;return draw(info)}}R[x.dataset.c].cat=v}));
  $('#abulk').onchange=e=>run(async()=>{let v=e.target.value;if(!v)return;if(v==='__new')v=await newCat(e.target);if(!v)return;R.forEach(p=>{if(p.sel&&!p.have)p.cat=v});draw(info)});
  $('#aall').onclick=()=>{R.forEach(p=>{if(!p.have)p.sel=true});draw(info)};
  $('#anone').onclick=()=>{R.forEach(p=>p.sel=false);draw(info)};
  if($('#amore'))$('#amore').onclick=()=>run(()=>search(page+1));
  $('#ago').onclick=()=>run(async()=>{const L=R.filter(p=>p.sel&&!p.have);if(!L.length)return alert('Marque pelo menos um produto.');
   const semCat=L.filter(p=>!p.cat);if(semCat.length)return alert(semCat.length+' produto(s) marcado(s) sem categoria. Escolha a categoria de cada um.');
   const semLink=L.filter(p=>!p.link||p.price==null);
   const mid=await merchant(),fe=$('#afe').checked;let n=0,err=[];$('#ago').disabled=true;$('#ago').textContent='Importando…';
   for(const p of L){if(!p.link||p.price==null){err.push(p.title.slice(0,40)+' (sem link de afiliado/preço)');continue}
    const nm=p.title.trim().slice(0,200)||'Produto AliExpress';
    const {data:pr,error}=await sb.from('cr_products').insert({name:nm,slug:slug(nm.slice(0,60)),description:nm,price:p.price,old_price:p.old_price,offer:!!p.old_price,featured:fe,
     category_id:p.cat,merchant_id:mid,affiliate_url:p.link,status:'active',ext_source:'aliexpress',ext_id:p.id}).select('id').single();
    if(error){err.push(nm.slice(0,40)+': '+error.message);continue}
    if(p.images.length)await sb.from('cr_product_images').insert(p.images.map((u,k)=>({product_id:pr.id,url:u,sort:k,is_cover:k===0})));
    if(p.cat2_id)cmap[p.cat2_id]=p.cat;if(p.cat1_id&&!cmap[p.cat1_id])cmap[p.cat1_id]=p.cat;n++}
   // lembra as categorias escolhidas para as próximas importações (só a chave ali_cat_map é trocada)
   const cur=await getSet();await sb.from('cr_site_settings').update({data:{...cur,ali_cat_map:cmap}}).eq('id',1);
   alert(`${n} produto(s) importado(s) para a vitrine.${err.length?'\n\nNão importados:\n'+err.join('\n'):''}${semLink.length&&!err.length?'':''}`);
   R.forEach(p=>p.sel=false);draw(info)});
 };
 const search=async pg=>{const q=$('#aq').value.trim(),hot=$('#ah').checked;if(!q&&!hot)return alert('Digite o que procurar (ou marque “Só produtos em alta”).');
  page=pg;last={q};$('#ares').innerHTML='<div class=box><p>Buscando no AliExpress…</p></div>';
  const r=await call({action:'search',q,page:pg,hot,sort:$('#as').value,min:$('#amin').value,max:$('#amax').value});
  R=r.products;await draw(`Página ${pg} · ${r.total||R.length} resultado(s).`)};
 $('#ab').onclick=()=>run(()=>search(1));$('#aq').onkeydown=e=>{if(e.key==='Enter')run(()=>search(1))};
 $('#aub').onclick=()=>run(async()=>{const urls=$('#au').value.split(/\s+/).filter(u=>u.trim());if(!urls.length)return alert('Cole pelo menos um link.');
  last={};$('#ares').innerHTML='<div class=box><p>Carregando…</p></div>';const r=await call({action:'url',urls});R=r.products;
  await draw([r.bad?.length?r.bad.length+' link(s) não reconhecido(s).':'',r.missing?.length?r.missing.length+' produto(s) não estão no programa de afiliados.':''].filter(Boolean).join(' '))});
 $('#arf').onclick=()=>run(async()=>{const arc=$('#aarc').checked;if(arc&&!confirm('Arquivar os produtos que não forem encontrados no AliExpress?'))return;
  $('#arf').disabled=true;$('#arfo').innerHTML='<p>Conferindo preços…</p>';
  try{const r=await call({action:'refresh',archive_missing:arc});
   $('#arfo').innerHTML=`<p>✅ ${r.total} produto(s) do AliExpress conferido(s) · <b>${r.changed}</b> com preço alterado.</p>${r.missing?.length?`<p>⚠️ ${r.missing.length} não encontrado(s) no AliExpress${r.archived?' — arquivado(s)':' (marque a opção acima para arquivar)'}:<br><small>${r.missing.slice(0,30).map(m=>esc(m.name)).join('<br>')}</small></p>`:''}`}
  finally{$('#arf').disabled=false}});
}
