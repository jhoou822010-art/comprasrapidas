// shopee-sync: robô de conferência da Shopee (preço, desconto, foto, comissão, link; saiu/voltou).
// Chamado pelo agendador do banco (cr_shopee_dispatch, cabeçalho x-cron-token) ou pelo botão "Rodar agora" do painel (login de administrador).
// Publicada com verify_jwt = false: a função faz a própria verificação acima.
// Chaves da Shopee: Supabase › Edge Functions › Secrets: SHOPEE_APP_ID e SHOPEE_APP_SECRET
// (se não existirem, usa SHOPEE_AFFILIATE_APP_ID e SHOPEE_AFFILIATE_SECRET, as mesmas da prévia do catálogo).
// Nunca apaga produto. Nunca mexe em nome, descrição, categoria nem destaque.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assinar, cabecalho, cfgSync, decidir, ErroApi, lerResposta, montarConsulta } from "./regras.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const API = "https://open-api.affiliate.shopee.com.br/graphql";
const TEMPO_MAX_MS = 110_000; // para de consultar antes do limite de tempo da função; o restante fica para a próxima vez

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function quemChamou(req: Request): Promise<"agendado" | "manual" | null> {
  const tk = req.headers.get("x-cron-token") ?? "";
  if (tk) {
    const { data } = await db.rpc("cr_shopee_config");
    return igual(tk, data?.token ?? "") ? "agendado" : null;
  }
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user) return null;
  const { data: adm } = await db.from("cr_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return adm ? "manual" : null;
}

// O Supabase devolve no máximo 1.000 linhas por consulta: lê em partes.
// deno-lint-ignore no-explicit-any
async function todas(mk: () => any, max = 5000): Promise<any[]> {
  const out: unknown[] = [];
  for (let de = 0; de < max; de += 1000) {
    const { data, error } = await mk().range(de, de + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // deno-lint-ignore no-explicit-any
  return out as any[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  let runId: number | null = null;
  try {
    const origem = await quemChamou(req);
    if (!origem) return json({ error: "Não autorizado" }, 401);
    const { data: st } = await db.from("cr_site_settings").select("data").eq("id", 1).maybeSingle();
    const c = cfgSync(st?.data);
    if (origem === "agendado" && !c.on) return json({ skipped: "robô desligado" });
    // não começa outra rodada se uma ainda estiver rodando (menos de 10 min)
    const { data: rod } = await db.from("cr_shopee_sync_runs").select("id").eq("status", "rodando")
      .gte("inicio", new Date(Date.now() - 10 * 60e3).toISOString()).limit(1);
    if (rod?.length) return json({ skipped: "já existe uma rodada em andamento" });

    const { data: run, error: re } = await db.from("cr_shopee_sync_runs").insert({ origem, status: "rodando" }).select("id").single();
    if (re) throw re;
    runId = run.id;
    const fechar = (campos: Record<string, unknown>) => db.from("cr_shopee_sync_runs").update({ fim: new Date().toISOString(), ...campos }).eq("id", runId);

    const appId = Deno.env.get("SHOPEE_APP_ID") || Deno.env.get("SHOPEE_AFFILIATE_APP_ID");
    const secret = Deno.env.get("SHOPEE_APP_SECRET") || Deno.env.get("SHOPEE_AFFILIATE_SECRET");
    if (!appId || !secret) {
      await fechar({ status: "falhou", erro: "Chaves da Shopee não configuradas (SHOPEE_APP_ID e SHOPEE_APP_SECRET nos Secrets das Edge Functions)." });
      return json({ error: "Chaves da Shopee não configuradas" }, 500);
    }

    // produtos da Shopee com código, os conferidos há mais tempo primeiro
    const { data: lj } = await db.from("cr_merchants").select("id,name");
    const loja = (lj ?? []).find((m) => String(m.name).trim().toLowerCase() === "shopee")?.id;
    if (!loja) { await fechar({ status: "falhou", erro: "Loja parceira Shopee não encontrada em cr_merchants." }); return json({ error: "sem loja Shopee" }, 500); }
    const prods = await todas(() => db.from("cr_products")
      .select("id,name,status,price,old_price,price_max,affiliate_url,shopee_item_id,shopee_shop_id,shopee_status,shopee_miss_count,shopee_commission_rate,shopee_last_check,product_images:cr_product_images(id,url,is_cover,sort)")
      .eq("merchant_id", loja).not("shopee_item_id", "is", null).order("id"));
    const limite = Date.now() - c.horas * 3600e3;
    const fila = prods
      .filter((p) => origem === "manual" || !p.shopee_last_check || Date.parse(p.shopee_last_check) < limite)
      .sort((a, b) => (a.shopee_last_check ? Date.parse(a.shopee_last_check) : 0) - (b.shopee_last_check ? Date.parse(b.shopee_last_check) : 0))
      .slice(0, c.max_por_vez);

    // consulta em lotes; um erro geral da API para tudo (e nada é desativado)
    const t0 = Date.now(), achados = new Map<string, unknown>(), consultados: typeof fila = [];
    let erroApi: string | null = null;
    for (let i = 0; i < fila.length; i += c.lote) {
      if (Date.now() - t0 > TEMPO_MAX_MS) break;
      const lote = fila.slice(i, i + c.lote), itens = lote.map((p) => ({ item: p.shopee_item_id, loja: p.shopee_shop_id }));
      try {
        const corpo = JSON.stringify({ query: montarConsulta(itens) });
        const ts = Math.floor(Date.now() / 1000).toString();
        const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: cabecalho(appId, ts, await assinar(appId, ts, corpo, secret)) }, body: corpo });
        const j = await r.json().catch(() => null);
        lerResposta(r.status, j, itens).forEach((o, k) => { if (o) achados.set(lote[k].id, o); });
        consultados.push(...lote);
      } catch (e) {
        erroApi = e instanceof ErroApi ? e.message : `Falha ao falar com a Shopee: ${String((e as Error).message ?? e).slice(0, 200)}`;
        break;
      }
      if (i + c.lote < fila.length) await dormir(c.pausa_ms);
    }

    // aplica: com erro da API, só os que VOLTARAM dados são atualizados; ninguém é marcado como "sumiu" nem desativado
    const agora = new Date().toISOString();
    let verificados = 0, atualizados = 0, desativados = 0, reativados = 0, erros = 0;
    for (const p of consultados) {
      const oferta = achados.get(p.id) ?? null;
      if (!oferta && erroApi) continue;
      const imgs = [...(p.product_images ?? [])].sort((a, b) => (Number(b.is_cover) - Number(a.is_cover)) || (a.sort - b.sort));
      const capa = imgs[0] ?? null;
      const d = decidir({ ...p, capa: capa?.url ?? null }, oferta, agora);
      verificados++;
      const { error: ue } = await db.from("cr_products").update(d.patch).eq("id", p.id);
      if (ue) { erros++; continue; }
      if (d.foto) {
        const { error: fe } = capa
          ? await db.from("cr_product_images").update({ url: d.foto }).eq("id", capa.id)
          : await db.from("cr_product_images").insert({ product_id: p.id, url: d.foto, sort: 0, is_cover: true });
        if (fe) erros++;
      }
      if (d.logs.length) await db.from("cr_shopee_sync_log").insert(d.logs.map((l) => ({ run_id: runId, product_id: p.id, em: agora, ...l })));
      if (d.conta.atualizado) atualizados++;
      if (d.conta.desativado) desativados++;
      if (d.conta.reativado) reativados++;
    }
    const resumo = { verificados, atualizados, desativados, reativados, erros: erros + (erroApi ? 1 : 0) };
    await fechar({ status: erroApi ? "falhou" : "ok", erro: erroApi, ...resumo });
    return json({ mode: origem, fila: fila.length, faltam: Math.max(0, fila.length - consultados.length), ...resumo, erro: erroApi });
  } catch (e) {
    const msg = String((e as Error).message ?? e).slice(0, 500);
    if (runId) await db.from("cr_shopee_sync_runs").update({ fim: new Date().toISOString(), status: "falhou", erro: msg }).eq("id", runId);
    return json({ error: msg }, 500);
  }
});
