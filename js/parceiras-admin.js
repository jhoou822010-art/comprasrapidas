// Painel > LOJAS PARCEIRAS. Carregado somente quando o administrador abre esta aba.
// Salva apenas a chave "lojas_parceiras" dentro de cr_site_settings.data (as demais configurações são preservadas:
// a configuração é relida do banco a cada gravação). Nada aqui altera produtos, categorias ou links de produtos.
import {lojas,validar,urlOk,secao,ligar,NOME_MAX,DESC_MAX} from './parceiras.js';

export async function panel(el,{sb,$,esc,run,up,dots,mi}){
 const getSet=async()=>(await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle()).data?.data||{};
 // grava a lista inteira (já validada) e devolve a lista salva
 const salvar=async itens=>{
  const now=await getSet();   // lê de novo para não apagar mudanças feitas em outras abas do painel
  const lista=itens.map((l,i)=>({id:l.id,nome:l.nome.trim(),url:l.url.trim(),desc:l.desc.trim(),img:l.img.trim(),ativo:l.ativo===true,ordem:i+1}));
  const {error}=await sb.from('cr_site_settings').upsert({id:1,data:{...now,lojas_parceiras:{itens:lista,saved_at:new Date().toISOString()}}});
  if(error)throw error;return lista};
 let L=lojas(await getSet());
 el.innerHTML='<div id=lpp></div>';const root=$('#lpp');
 const novoId=()=>'lp'+(crypto.randomUUID?crypto.randomUUID().slice(0,8):Math.random().toString(36).slice(2,10));
 const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}};

 const lista=()=>{const at=L.filter(l=>l.ativo&&urlOk(l.url)).length;
  root.innerHTML=`<div class=hrow><h2>Lojas Parceiras</h2><button class=btn id=lpn type=button>+ Nova loja parceira</button></div>
  <p class=note>Aparecem na página inicial, na seção <b>VEJA TAMBÉM — MAIS PRODUTOS</b>. O cliente toca no banner, escolhe uma loja e o seu link de afiliado abre em uma nova aba (a Compras Rápidas continua aberta). Só as lojas <b>ativas</b> aparecem. ${L.length?`<br>${at} de ${L.length} loja(s) visível(is) no site.`:''}</p>
  <div id=lpf></div>
  ${L.length?`<div class=lst>${L.map((l,i)=>`<div class="box li"><div class=lih>${urlOk(l.img)?`<img src="${esc(l.img)}" alt="" loading=lazy style="object-fit:contain;background:#fff;border:1px solid #e2e7ef">`:'<span class=ph0></span>'}
   <div class=tt><b>${i+1}. ${esc(l.nome||'(sem nome)')}</b><small>${l.ativo?'<span class="chip ok">Ativa</span>':'<span class=chip>Inativa</span>'} ${esc(host(l.url))}${urlOk(l.url)?'':' · ⚠️ link inválido (não aparece no site)'}</small></div>
   <button class="btn alt sm" type=button data-up=${i} ${i?'':'disabled'} aria-label="Subir ${esc(l.nome)}" title="Subir">↑</button><button class="btn alt sm" type=button data-dn=${i} ${i<L.length-1?'':'disabled'} aria-label="Descer ${esc(l.nome)}" title="Descer">↓</button>
   <button class="btn sm" type=button data-ed=${i}>Editar</button>
   ${dots([mi(`data-tg=${i}`,l.ativo?'⏸️ Desativar':'▶️ Ativar'),urlOk(l.url)?`<a class=dmi role=menuitem href="${esc(l.url)}" target=_blank rel="noopener noreferrer">↗ Abrir link</a>`:'',mi(`data-del=${i}`,'🗑️ Excluir',1)])}</div></div>`).join('')}</div>`
   :'<div class=box><p class=note style="margin:0">Nenhuma loja parceira cadastrada. Toque em “+ Nova loja parceira” para começar. Enquanto não houver loja ativa, a seção não aparece no site.</p></div>'}
  <div class="box bpv"><h3>Prévia no site</h3><div id=lpv>${secao({lojas_parceiras:{itens:L}},{aberta:true})||'<p class=note style="margin:0">Sem lojas ativas: a seção fica escondida no site.</p>'}</div></div>`;
  const pv=$('#lpv');ligar(pv);
  $('#lpn').onclick=()=>form(-1);
  const grava=async(nv,msg)=>{L=lojas({lojas_parceiras:{itens:await salvar(nv)}});lista();if(msg)alert(msg)};
  root.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>form(+b.dataset.ed));
  root.querySelectorAll('[data-up],[data-dn]').forEach(b=>b.onclick=()=>run(async()=>{const i=+(b.dataset.up??b.dataset.dn),j=b.dataset.up!=null?i-1:i+1;if(j<0||j>=L.length)return;const nv=[...L];[nv[i],nv[j]]=[nv[j],nv[i]];await grava(nv)}));
  root.querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>run(async()=>{const i=+b.dataset.tg,l=L[i];
   if(!l.ativo){const e=validar(l);if(e.length)return alert('Corrija antes de ativar:\n• '+e.join('\n• '))}
   if(!confirm(l.ativo?`Desativar “${l.nome}”? Ela deixa de aparecer no site (não é apagada).`:`Ativar “${l.nome}”? Ela passa a aparecer no site.`))return;
   await grava(L.map((x,k)=>k===i?{...x,ativo:!x.ativo}:x))}));
  root.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>run(async()=>{const i=+b.dataset.del;
   if(!confirm(`Excluir a loja parceira “${L[i].nome}” definitivamente?\n(Só a loja desta seção é apagada; nenhum produto é alterado.)`))return;
   await grava(L.filter((_,k)=>k!==i))}))};

 // formulário de cadastro/edição (i=-1: nova loja)
 const form=i=>{const l=i>=0?{...L[i]}:{id:novoId(),nome:'',url:'',desc:'',img:'',ativo:true,ordem:L.length+1};
  const f=$('#lpf');f.innerHTML=`<div class=box><h3>${i>=0?'Editar loja parceira':'Nova loja parceira'}</h3>
   <label>Nome da loja*<input id=lfn maxlength=${NOME_MAX} value="${esc(l.nome)}" placeholder="Ex.: Mercado Livre"></label>
   <label>Link de afiliado* (https://…)<input id=lfu type=url inputmode=url autocomplete=off spellcheck=false value="${esc(l.url)}" placeholder="https://..."><small class=note>Cole o link exatamente como o programa de afiliados forneceu. Ele é salvo sem nenhuma alteração.</small></label>
   <label>Descrição curta <small class=note>(<span id=lfc>${l.desc.length}</span>/${DESC_MAX})</small><textarea id=lfd maxlength=${DESC_MAX} style="min-height:64px" placeholder="Ex.: Milhões de produtos com entrega rápida">${esc(l.desc)}</textarea></label>
   <div class=row><label>Imagem ou logotipo (arquivo)<input id=lff type=file accept="image/png,image/jpeg,image/webp"></label>
   <label>…ou endereço da imagem (https://)<input id=lfi type=url inputmode=url value="${esc(l.img)}" placeholder="https://..."></label></div>
   <div id=lfim style="margin:4px 0 8px">${urlOk(l.img)?`<img class=thumb src="${esc(l.img)}" alt="Logotipo atual" style="object-fit:contain;background:#fff;border:1px solid #e2e7ef"> <button class="btn dng sm" type=button id=lfx>Remover imagem</button>`:''}</div>
   <div class=row><label>Posição na lista (1 = primeira)<input id=lfo type=number min=1 max=${L.length+(i>=0?0:1)} step=1 value="${i>=0?i+1:L.length+1}"></label>
   <label style="align-self:end"><input type=checkbox id=lfa ${l.ativo?'checked':''}> Loja ativa (aparece no site)</label></div>
   <p id=lfe class=note role=alert style="color:#c62f3f;white-space:pre-line"></p>
   <button class=btn type=button id=lfs>Salvar</button> <button class="btn alt" type=button id=lfk>Cancelar</button></div>`;
  f.scrollIntoView?.({block:'start',behavior:'smooth'});$('#lfn').focus({preventScroll:true});
  $('#lfd').oninput=e=>$('#lfc').textContent=e.target.value.length;
  if($('#lfx'))$('#lfx').onclick=()=>{if(confirm('Remover a imagem desta loja?')){$('#lfi').value='';$('#lfim').innerHTML=''}};
  $('#lfk').onclick=()=>{f.innerHTML=''};
  $('#lfs').onclick=()=>run(async()=>{const b=$('#lfs');
   const d={...l,nome:$('#lfn').value,url:$('#lfu').value,desc:$('#lfd').value,img:$('#lfi').value,ativo:$('#lfa').checked};
   const file=$('#lff').files[0];
   if(file&&!/^image\/(png|jpeg|webp)$/.test(file.type))return $('#lfe').textContent='Envie uma imagem PNG, JPG ou WebP.';
   const erros=validar({...d,img:file?'':d.img});$('#lfe').textContent=erros.join('\n');if(erros.length)return;
   b.disabled=true;b.textContent='Salvando…';
   try{if(file)d.img=await up(file);
    const nv=L.filter((_,k)=>k!==i),pos=Math.min(Math.max(1,Math.round(+$('#lfo').value)||nv.length+1),nv.length+1);
    nv.splice(pos-1,0,d);L=lojas({lojas_parceiras:{itens:await salvar(nv)}});lista();alert(i>=0?'Loja parceira atualizada.':'Loja parceira cadastrada.')}
   finally{b.disabled=false;b.textContent='Salvar'}})};
 lista()}
