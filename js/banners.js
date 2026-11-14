// Banners de produto (painel › Banners). Usado pela página inicial e pela prévia do painel.
// O banner guarda só a ligação com o produto (id) e as próprias configurações, em cr_site_settings.data.banners_v2.
// Foto, nome, preço, descrição e link são lidos do cadastro do produto na hora de exibir:
// o produto nunca é copiado nem alterado. Produto arquivado, inativo, excluído ou que saiu da oferta some sozinho.
import {esc,money,priceTxt,isOffer,showOld,cover,cleanTitle} from './app.js';

export const BSRC={offer:'Em oferta',featured:'Em destaque',top7:'Mais acessados (7 dias)',new:'Recém-cadastrados'};
export const BTN_PADRAO='Confira agora';

// lê a configuração salva, sempre com valores válidos (nada quebra se a chave não existir)
export function b2cfg(S){const b=S?.banners_v2&&typeof S.banners_v2==='object'?S.banners_v2:{},a=b.auto&&typeof b.auto==='object'?b.auto:{};
 const ids=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&x))]:[];
 return {items:(Array.isArray(b.items)?b.items:[]).filter(x=>x&&typeof x.pid==='string'&&x.pid),
  auto:{on:a.on===true,src:BSRC[a.src]?a.src:'offer',qty:Math.min(10,Math.max(1,Math.round(+a.qty)||3)),pinned:ids(a.pinned),hidden:ids(a.hidden),top_ids:ids(a.top_ids),top_at:a.top_at||null},
  secs:Math.min(30,Math.max(3,Math.round(+b.secs)||6))}}

const BSEL='id,name,description,price,price_max,old_price,offer,offer_start,offer_end,featured,status,created_at,affiliate_url,merchants:cr_merchants(name),product_images:cr_product_images(url,sort)';
// funciona com o cliente leve do site (js/db.js) e com a biblioteca oficial do painel
async function q(sb,f){let r=await f(BSEL);if(r.error&&/price_max/.test(r.error.message||''))r=await f(BSEL.replace('price_max,',''));if(r.error)throw r.error;return r.data||[]}
export const bProducts=(sb,ids)=>ids?.length?q(sb,S=>sb.from('cr_products').select(S).eq('status','active').in('id',ids)):Promise.resolve([]);
export const bSearch=(sb,build)=>q(sb,S=>build(sb.from('cr_products').select(S).eq('status','active')));

// escolhe os banners de produto que aparecem agora.
// extra>0 (painel): calcula a fila automática mesmo desligada e traz alguns itens a mais, para fixar/ocultar.
export async function pickBanners(sb,S,{extra=0}={}){const B=b2cfg(S),A=B.auto,hid=new Set(A.hidden),pin=A.pinned.filter(i=>!hid.has(i)),man=B.items.filter(x=>x.on!==false||extra);
 const wantAuto=A.on||extra>0,top=A.src==='top7'?A.top_ids:[],n=A.qty+extra;
 const need=[...new Set([...man.map(x=>x.pid),...(wantAuto?[...pin,...top]:[])])];
 const cand=wantAuto&&A.src!=='top7'?bSearch(sb,r=>{if(A.src==='offer')r=r.eq('offer',true);if(A.src==='featured')r=r.eq('featured',true);return r.order('created_at',{ascending:false}).limit(n+hid.size+pin.length+6)}):[];
 const [P,C]=await Promise.all([bProducts(sb,need),cand]);const m=Object.fromEntries(P.map(p=>[p.id,p]));
 const manual=man.filter(x=>x.on!==false).map(it=>({it,p:m[it.pid]})).filter(o=>o.p&&!(o.it.offer_only&&!isOffer(o.p))).sort((a,b)=>(+a.it.pos||0)-(+b.it.pos||0));
 let queue=[];if(wantAuto){const ok=p=>A.src==='offer'?isOffer(p):A.src==='featured'?!!p.featured:true,used=new Set(manual.map(o=>o.p.id));
  const base=A.src==='top7'?top.map(i=>m[i]).filter(Boolean):C;
  queue=[...pin.map(i=>m[i]).filter(p=>p&&ok(p)).map(p=>({p,pin:true})),...base.filter(ok).map(p=>({p}))]
   .filter(o=>{if(used.has(o.p.id)||hid.has(o.p.id))return false;used.add(o.p.id);return true}).slice(0,n)}
 return {manual,auto:A.on?queue.slice(0,A.qty):[],queue,products:m,cfg:B}}

// texto do banner: o texto curto do banner ou, se vazio, o começo da descrição do produto
export const bannerTxt=(p,it)=>{const t=String(it?.text||'').trim();if(t)return t;const d=String(p.description||'').replace(/\s+/g,' ').trim();return d.length>110?d.slice(0,107).replace(/\s+\S*$/,'')+'…':d};
const bg=u=>encodeURI(u).replace(/[()']/g,c=>'%'+c.charCodeAt(0).toString(16));
export function productSlide(p,it={},href){const im=p.product_images?.length?cover(p):'',tx=bannerTxt(p,it);
 return `<div class="sl ps" role=group aria-roledescription=slide${im?` style="background-image:url('${esc(bg(im))}')"`:''}><div>${isOffer(p)?'<span class=tag style="position:static;display:inline-block;margin-bottom:6px">Oferta</span>':''}<p class=slt>${esc(cleanTitle(p.name))}</p>${tx?`<p>${esc(tx)}</p>`:''}<p class=ppr>${p.price!=null?`<b>${priceTxt(p)}</b>`:''}${showOld(p)?`<s>${money(p.old_price)}</s>`:''}</p><a class=hb href="${esc(href||'produto.html?id='+encodeURIComponent(p.id))}">${esc(String(it.btn||'').trim()||BTN_PADRAO)} →</a></div></div>`}
