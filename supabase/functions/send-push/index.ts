// send-push: envia notificações Web Push do Compras Rápidas.
// Autenticação própria: token do agendador (x-cron-token) ou JWT de um admin (cr_admins).
// Publicada com verify_jwt = false (a função faz a própria verificação acima).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Cfg = Record<string, string>;
let cfg: Cfg | null = null;
async function loadConfig(): Promise<Cfg> {
  if (cfg) return cfg;
  const { data, error } = await db.rpc("cr_push_config");
  if (error || !data?.cr_vapid_private) throw new Error("Configuração VAPID ausente");
  webpush.setVapidDetails(data.cr_vapid_subject, data.cr_vapid_public, data.cr_vapid_private);
  cfg = data as Cfg;
  return cfg;
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function isAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return false;
  const { data: row } = await db.from("cr_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return !!row;
}

// Horário de Brasília (UTC-3, sem horário de verão)
const OFFSET = 3 * 3600e3;
const spHour = () => new Date(Date.now() - OFFSET).getUTCHours();
const spDayStartISO = () => new Date(Math.floor((Date.now() - OFFSET) / 86400e3) * 86400e3 + OFFSET).toISOString();
const inQuiet = (h: number, s: number, e: number) => (s === e ? false : s < e ? h >= s && h < e : h >= s || h < e);

// Origem do site atual (ex.: https://comprasrapidasandrade.com.br), tirada de cr_notification_settings.site_url
// deno-lint-ignore no-explicit-any
function siteOrigin(settings: any): string | null {
  try { return settings?.site_url ? new URL(settings.site_url).origin : null; } catch { return null; }
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
// Modo normal: só inscrições do domínio atual (ou sem origem registrada).
// Modo teste (endpoint informado): filtra só pelo endpoint.
async function loadSubs(opts: { endpoint?: string; origin?: string | null } = {}): Promise<Sub[]> {
  const all: Sub[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("cr_push_subscriptions").select("id,endpoint,p256dh,auth").order("created_at").range(from, from + 999);
    if (opts.endpoint) q = q.eq("endpoint", opts.endpoint);
    else if (opts.origin) q = q.or(`origin.is.null,origin.eq."${opts.origin}"`);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // Remove endpoints repetidos (fica a inscrição mais recente de cada aparelho)
  const byEndpoint = new Map<string, Sub>();
  for (const s of all) byEndpoint.set(s.endpoint, s);
  return [...byEndpoint.values()];
}

async function deliver(subs: Sub[], payload: string) {
  let ok = 0, fail = 0, lastError: string | null = null;
  const dead: string[] = [], good: string[] = [];
  for (let i = 0; i < subs.length; i += 25) {
    await Promise.all(subs.slice(i, i + 25).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 86400, urgency: "high", timeout: 10000 },
        );
        ok++; good.push(s.id);
      } catch (e) {
        fail++;
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        lastError = `${code ?? ""} ${(e as Error).message ?? e}`.trim().slice(0, 300);
      }
    }));
  }
  for (let i = 0; i < dead.length; i += 200) await db.from("cr_push_subscriptions").delete().in("id", dead.slice(i, i + 200));
  for (let i = 0; i < good.length; i += 200) await db.from("cr_push_subscriptions").update({ last_success_at: new Date().toISOString() }).in("id", good.slice(i, i + 200));
  return { ok, fail, removed: dead.length, lastError };
}

async function getSettings() {
  const { data } = await db.from("cr_notification_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

// deno-lint-ignore no-explicit-any
async function buildPayload(n: any, settings: any) {
  let image = n.image_url as string | null;
  if (!image && n.product_id) {
    const { data: img } = await db.from("cr_product_images").select("url")
      .eq("product_id", n.product_id).order("is_cover", { ascending: false }).order("sort", { ascending: true }).limit(1).maybeSingle();
    image = img?.url ?? null;
  }
  // icon = foto do produto, para aparecer mesmo com a notificação recolhida; image = foto grande ao expandir
  return {
    image,
    payload: JSON.stringify({
      id: n.id, title: n.title, body: n.body ?? "", image,
      icon: image ?? settings?.icon_url ?? null,
      url: n.url ?? settings?.site_url ?? "/",
    }),
  };
}

// deno-lint-ignore no-explicit-any
async function sendNotificationRow(id: string, settings: any) {
  const { data: n } = await db.from("cr_notifications").update({ status: "sending", error: null })
    .eq("id", id).in("status", ["draft", "scheduled", "failed"]).select().maybeSingle();
  if (!n) return { id, skipped: "já enviada, cancelada ou em envio" };
  try {
    const { image, payload } = await buildPayload(n, settings);
    const subs = await loadSubs({ origin: siteOrigin(settings) });
    const r = await deliver(subs, payload);
    const status = subs.length > 0 && r.ok === 0 ? "failed" : "sent";
    await db.from("cr_notifications").update({
      status, sent_at: new Date().toISOString(), sent_count: r.ok, failed_count: r.fail,
      error: status === "failed" ? r.lastError : null, image_url: image,
    }).eq("id", id);
    return { id, status, subscribers: subs.length, ...r };
  } catch (e) {
    await db.from("cr_notifications").update({ status: "failed", error: String((e as Error).message ?? e).slice(0, 300) }).eq("id", id);
    return { id, status: "failed", error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const config = await loadConfig();
    const body = await req.json().catch(() => ({}));
    const settings = await getSettings();

    // Agendador (pg_cron)
    if (safeEqual(req.headers.get("x-cron-token") ?? "", config.cr_push_cron_token)) {
      const { data: due } = await db.from("cr_notifications").select("id,source")
        .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(10);
      const quiet = settings ? inQuiet(spHour(), settings.quiet_start, settings.quiet_end) : false;
      const { count } = await db.from("cr_notifications").select("id", { count: "exact", head: true })
        .neq("source", "manual").eq("status", "sent").gte("sent_at", spDayStartISO());
      let autoToday = count ?? 0;
      const results = [];
      for (const n of due ?? []) {
        if (n.source !== "manual") {
          if (quiet) { results.push({ id: n.id, waiting: "horário de silêncio" }); continue; }
          if (autoToday >= (settings?.daily_limit ?? 2)) { results.push({ id: n.id, waiting: "limite diário atingido" }); continue; }
          autoToday++;
        }
        results.push(await sendNotificationRow(n.id, settings));
      }
      return json({ mode: "cron", results });
    }

    // Painel admin
    if (!(await isAdmin(req))) return json({ error: "Não autorizado" }, 401);

    if (body.mode === "test") {
      if (!body.endpoint) return json({ error: "Informe o endpoint deste aparelho" }, 400);
      const subs = await loadSubs({ endpoint: body.endpoint });
      if (!subs.length) return json({ error: "Este aparelho não está inscrito" }, 404);
      const image = body.image ?? null;
      const payload = JSON.stringify({
        id: null, title: body.title ?? "Teste do Compras Rápidas ✅", body: body.body ?? "As notificações estão funcionando!",
        image, icon: image ?? settings?.icon_url ?? null, url: body.url ?? settings?.site_url ?? "/",
      });
      return json({ mode: "test", ...(await deliver(subs, payload)) });
    }

    if (!body.notification_id) return json({ error: "Informe notification_id" }, 400);
    return json({ mode: "send", result: await sendNotificationRow(body.notification_id, settings) });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
