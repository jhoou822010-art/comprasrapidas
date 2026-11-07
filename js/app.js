// Funções compartilhadas do site público
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import {SUPABASE_URL as U, SUPABASE_KEY as K} from '../config.js';
export const CONFIGURED=/^https?:\/\//.test(U)&&K&&!K.includes('COLE_AQUI');
export const sb=createClient(CONFIGURED?U:'https://sem-config.supabase.co',CONFIGURED?K:'sem-config',{auth:{storageKey:'sb-compras-rapidas-auth'}});
export const $=(s,r=document)=>r.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=v=>v==null?'':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const qs=k=>new URLSearchParams(location.search).get(k);
export const safeUrl=u=>/^https?:\/\//i.test(u||'')?u:'#';
const PH='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e8f1ff"/><text x="200" y="210" font-size="22" text-anchor="middle" fill="#1e6bff">Sem foto</text></svg>');
export const DISCLAIMER='A Compras Rápidas é uma plataforma de divulgação e recomendação de produtos. Alguns links são links de afiliados e podem gerar uma comissão para a plataforma, sem custo adicional para o comprador. A compra, o pagamento, a entrega e as condições comerciais são de responsabilidade da loja parceira.';
const DEF={name:'Compras Rápidas',slogan:'Encontre boas escolhas.',c1:'#0b2a5b',c2:'#1e6bff',btn:'#1e6bff',per_page:12,
 about:'A Compras Rápidas reúne produtos selecionados de lojas parceiras para você encontrar boas escolhas com facilidade.',
 privacy:'Edite este texto no painel (Aparência da loja). Explique quais dados coleta (ex.: cliques anônimos em links de compra), como usa e como o visitante pode falar com você.',contact_text:'Fale com a gente pelos canais abaixo.'};
export let S=DEF;
export async function boot(){
 if(!CONFIGURED){document.body.insertAdjacentHTML('afterbegin','<p style="background:#fde2e2;color:#7a1010;padding:12px;margin:0;text-align:center">Site ainda não configurado: preencha o arquivo config.js (veja o Guia, Parte 3).</p>')}
 const {data}=await sb.from('cr_site_settings').select('data').eq('id',1).maybeSingle();
 S={...DEF,...(data?.data||{})};const r=document.documentElement.style;
 r.setProperty('--c1',S.c1);r.setProperty('--c2',S.c2);r.setProperty('--btn',S.btn);
 document.title=(document.title&&document.title!=='x'?document.title+' | ':'')+(S.seo_title||S.name);
 if(S.seo_desc){let m=document.querySelector('meta[name=description]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'description'}));m.content=S.seo_desc}
 if(S.favicon){let l=document.querySelector('link[rel=icon]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'icon'}));l.href=S.favicon}
 $('#hdr').innerHTML=`<header><div class=w><div class=top><a class=logo href=index.html>${S.logo?`<img src="${esc(S.logo)}" alt="">`:''}<span>${esc(S.name)}<small>${esc(S.slogan)}</small></span></a>
 <form action=lista.html><input type=hidden name=tipo value=busca><input name=q placeholder="O que você está procurando?" aria-label="Pesquisar"><button aria-label="Buscar">🔍</button></form></div>
 <nav><a href=index.html>Início</a><a href="lista.html?tipo=categorias">Categorias</a><a href="lista.html?tipo=ofertas">Ofertas</a><a href="lista.html?tipo=destaques">Destaques</a></nav></div></header>`;
 $('#ftr').innerHTML=`<footer><div class=w><p><b>${esc(S.name)}</b> — ${esc(S.slogan)}</p><p>${DISCLAIMER}</p><p>${S.footer_text?esc(S.footer_text)+'<br>':''}
 <a href="pagina.html?p=sobre">Sobre</a><a href="pagina.html?p=contato">Contato</a><a href="pagina.html?p=privacidade">Privacidade</a>${S.instagram?`<a href="${esc(safeUrl(S.instagram))}" rel=noopener>Instagram</a>`:''}${S.facebook?`<a href="${esc(safeUrl(S.facebook))}" rel=noopener>Facebook</a>`:''}</p></div></footer>
 <div id=lb></div>`;
 return S}
const SEL='id,name,price,old_price,offer,offer_start,offer_end,category_id,created_at,merchants:cr_merchants(name),product_images:cr_product_images(url,sort)';
export const isOffer=p=>p.offer&&(!p.offer_end||new Date(p.offer_end)>new Date())&&(!p.offer_start||new Date(p.offer_start)<=new Date());
export const showOld=p=>p.old_price>p.price&&(!p.offer||isOffer(p));
export const cover=p=>[...(p.product_images||[])].sort((a,b)=>a.sort-b.sort)[0]?.url||PH;
export async function list({offer,featured,q,cat,page=1,per=12}={}){
 let r=sb.from('cr_products').select(SEL,{count:'exact'}).eq('status','active');const now=new Date().toISOString();
 if(offer)r=r.eq('offer',true).or('offer_end.is.null,offer_end.gt.'+now).or('offer_start.is.null,offer_start.lte.'+now);
 if(featured)r=r.eq('featured',true);if(cat)r=r.eq('category_id',cat);
 if(q){q=q.replace(/[,()%*]/g,' ').trim();r=r.or(`name.ilike.%${q}%,description.ilike.%${q}%`)}
 const {data,count,error}=await r.order('created_at',{ascending:false}).range((page-1)*per,page*per-1);
 return {data:data||[],count:count||0,error}}
export async function byIds(ids){if(!ids?.length)return [];const {data}=await sb.from('cr_products').select(SEL).eq('status','active').in('id',ids);const m=Object.fromEntries((data||[]).map(p=>[p.id,p]));return ids.map(i=>m[i]).filter(Boolean)}
export function card(p){const o=isOffer(p);
 return `<a class=card href="produto.html?id=${p.id}"><div class=im>${o?'<span class=tag>Oferta</span>':''}<img loading=lazy src="${esc(cover(p))}" alt="${esc(p.name)}"></div>
 <div class=cb><h3>${esc(p.name)}</h3><div class=pr>${p.price!=null?`<b>${money(p.price)}</b>`:''}${showOld(p)?`<s>${money(p.old_price)}</s>`:''}</div><small>${esc(p.merchants?.name||'')}</small><span class=btn>Ver produto</span></div></a>`}
