// aliexpress: ponte segura entre o painel e a API de Afiliados do AliExpress.
// As chaves ficam SOMENTE nos Secrets do Supabase (Edge Functions > Secrets):
//   ALI_APP_KEY, ALI_APP_SECRET, ALI_TRACKING_ID
// Só administradores (cr_admins) podem chamar. Publicada com verify_jwt = false (a função faz a própria verificação).
// Ações (POST JSON):
//   {action:"status"}                                   -> diz se as chaves estão configuradas
//   {action:"search", q, page, sort, hot, min, max}     -> busca produtos (já com link de afiliado)
//   {action:"url", url}                                 -> produto(s) a partir de link(s) do AliExpress
//   {action:"refresh", archive_missing}                 -> atualiza preços dos produtos importados
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const KEY = Deno.env.get("ALI_APP_KEY") ?? "", SECRET = Deno.env.get("ALI_APP_SECRET") ?? "", TRACK = Deno.env.get("ALI_TRACKING_ID") ?? "";
const GW = "https://api-sg.aliexpress.com/sync";
const LOCALE = { target_currency: "BRL", target_language: "PT", ship_to_country: "BR" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function isAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return false;
  const { data: row } = await db.from("cr_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return !!row;
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
async function sign(p: Record<string, string>) {
  const base = Object.keys(p).sort().map((k) => k + p[k]).join("");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(base)));
}

// Chamada assinada (método "sha256" do AliExpress Open Platform)
// deno-lint-ignore no-explicit-any
async function ali(method: string, params: Record<string, unknown>): Promise<any> {
  const p: Record<string, string> = { app_key: KEY, method, timestamp: String(Date.now()), sign_method: "sha256", format: "json", v: "2.0" };
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p[k] = String(v);
  p.sign = await sign(p);
  const r = await fetch(GW, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(p) });
  const j = await r.json().catch(() => null);
  if (!j) throw new Error("AliExpress respondeu algo inesperado (HTTP " + r.status + ")");
  if (j.error_response) throw new Error("AliExpress: " + (j.error_response.msg || j.error_response.code));
  if (j.code && j.code !== "0") throw new Error("AliExpress: " + (j.message || j.code));
  const root = j[method.replace(/\./g, "_") + "_response"]?.resp_result;
  if (!root) throw new Error("AliExpress: resposta sem resultado");
  if (root.resp_code && root.resp_code !== 200) {
    // 405 = nenhum produto encontrado
    if (root.resp_code === 405) return { products: [], total: 0 };
    throw new Error("AliExpress: " + (root.resp_msg || root.resp_code));
  }
  const res = root.result || {};
  return { products: res.products?.product || [], total: res.total_record_count || 0 };
}

const n = (v: unknown) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : null; };
// deno-lint-ignore no-explicit-any
function norm(p: any) {
  const price = n(p.target_sale_price ?? p.sale_price), old = n(p.target_original_price ?? p.original_price);
  const imgs = [p.product_main_image_url, ...(p.product_small_image_urls?.string || [])].filter(Boolean).map((u: string) => u.replace(/^\/\//, "https://"));
  return {
    id: String(p.product_id),
    title: p.product_title || "",
    price, old_price: old && price && old > price ? old : null,
    discount: p.discount || "",
    images: [...new Set(imgs)].slice(0, 6),
    link: p.promotion_link || "",
    url: p.product_detail_url || "",
    cat1: p.first_level_category_name || "", cat1_id: String(p.first_level_category_id || ""),
    cat2: p.second_level_category_name || "", cat2_id: String(p.second_level_category_id || ""),
    sold: p.lastest_volume || 0, rating: p.evaluate_rate || "",
  };
}

async function detail(ids: string[]) {
  const out = [];
  for (let i = 0; i < ids.length; i += 20) {
    const r = await ali("aliexpress.affiliate.productdetail.get", { product_ids: ids.slice(i, i + 20).join(","), target_currency: "BRL", target_language: "PT", country: "BR", tracking_id: TRACK });
    out.push(...r.products.map(norm));
  }
  return out;
}

// extrai o id do produto de um link (resolve links curtos a.aliexpress.com / s.click)
async function idFromUrl(u: string): Promise<string | null> {
  const m = u.match(/\/item\/(?:[^/]*\/)?(\d{8,})\.html/) || u.match(/[?&](?:productId|itemId)=(\d{8,})/);
  if (m) return m[1];
  if (/^\d{8,}$/.test(u.trim())) return u.trim();
  try {
    const host = new URL(u).hostname;
    if (!/(^|\.)aliexpress\.(com|us|ru)$|(^|\.)aliexpress\.com\.br$/.test(host)) return null;
    let cur = u;
    for (let i = 0; i < 5; i++) {
      const r = await fetch(cur, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0" } });
      const loc = r.headers.get("location");
      await r.body?.cancel();
      if (!loc) break;
      cur = new URL(loc, cur).toString();
      const mm = cur.match(/\/item\/(?:[^/]*\/)?(\d{8,})\.html/) || cur.match(/[?&](?:productId|itemId)=(\d{8,})/);
      if (mm) return mm[1];
    }
  } catch (_) { /* link inválido */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!(await isAdmin(req))) return json({ error: "Sem permissão" }, 401);
  // deno-lint-ignore no-explicit-any
  let b: any = {};
  try { b = await req.json(); } catch (_) { /* vazio */ }
  const ok = !!(KEY && SECRET && TRACK);
  if (b.action === "status") return json({ configured: ok, missing: [!KEY && "ALI_APP_KEY", !SECRET && "ALI_APP_SECRET", !TRACK && "ALI_TRACKING_ID"].filter(Boolean) });
  if (!ok) return json({ error: "Chaves do AliExpress não configuradas nos Secrets do Supabase (ALI_APP_KEY, ALI_APP_SECRET, ALI_TRACKING_ID)." }, 400);
  try {
    if (b.action === "search") {
      const SORTS: Record<string, string> = { vendas: "LAST_VOLUME_DESC", menor: "SALE_PRICE_ASC", maior: "SALE_PRICE_DESC", desconto: "DISCOUNT_DESC" };
      const params = {
        ...LOCALE, tracking_id: TRACK, keywords: String(b.q || "").slice(0, 100), page_no: Math.max(1, +b.page || 1), page_size: 40,
        sort: SORTS[b.sort] || "", min_sale_price: n(b.min) ?? "", max_sale_price: n(b.max) ?? "",
      };
      const r = await ali(b.hot ? "aliexpress.affiliate.hotproduct.query" : "aliexpress.affiliate.product.query", params);
      return json({ total: r.total, products: r.products.map(norm) });
    }
    if (b.action === "url") {
      const urls = (Array.isArray(b.urls) ? b.urls : String(b.url || "").split(/\s+/)).filter(Boolean).slice(0, 40);
      const ids: string[] = [], bad: string[] = [];
      for (const u of urls) { const id = await idFromUrl(u); if (id) ids.push(id); else bad.push(u); }
      const products = ids.length ? await detail([...new Set(ids)]) : [];
      return json({ products, bad, missing: ids.filter((id) => !products.some((p) => p.id === id)) });
    }
    if (b.action === "refresh") {
      const { data: rows, error } = await db.from("cr_products").select("id,ext_id,price,old_price,status,name").eq("ext_source", "aliexpress").neq("status", "archived");
      if (error) throw error;
      const ids = (rows || []).map((r) => r.ext_id).filter(Boolean);
      const found = new Map((await detail(ids)).map((p) => [p.id, p]));
      let changed = 0;
      const missing: { id: string; name: string }[] = [];
      for (const r of rows || []) {
        const p = found.get(r.ext_id);
        if (!p) { missing.push({ id: r.id, name: r.name }); continue; }
        if (p.price == null) continue;
        const upd: Record<string, unknown> = { price: p.price, old_price: p.old_price, offer: !!p.old_price, price_max: null };
        if (p.link) upd.affiliate_url = p.link;
        if (Number(r.price) !== p.price || Number(r.old_price || 0) !== Number(p.old_price || 0)) changed++;
        await db.from("cr_products").update(upd).eq("id", r.id);
      }
      if (b.archive_missing && missing.length) await db.from("cr_products").update({ status: "archived" }).in("id", missing.map((m) => m.id));
      return json({ total: rows?.length || 0, checked: found.size, changed, missing, archived: b.archive_missing ? missing.length : 0 });
    }
    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 502);
  }
});
