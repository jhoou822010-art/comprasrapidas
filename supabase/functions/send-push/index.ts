// send-push: envia notificações Web Push do Compras Rápidas.
// Autenticação própria: token do agendador (x-cron-token) ou JWT de um admin (cr_admins).
// Publicada com verify_jwt = false (a função faz a própria verificação acima).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { odCfg, odDue, odEscolher, odHora, odLink, odConfiavel, odMsg, odPesos, odPick, odRow, odText, OD_INTERVALO_H, spDay, spDayStart } from "./oferta-dia.js";

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

// O Supabase devolve no máximo 1.000 linhas por consulta: lê em partes de 1.000 até `max`.
// mk() devolve a consulta já filtrada e ORDENADA (a ordem fixa evita pular ou repetir linhas entre as partes).
// deno-lint-ignore no-explicit-any
async function todas(mk: () => any, max = 5000): Promise<{ data: any[]; error: any }> {
  const out: any[] = [];
  for (let de = 0; de < max; de += 1000) {
    const { data, error } = await mk().range(de, Math.min(de + 999, max - 1));
    if (error) return { data: out, error };
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { data: out, error: null };
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

// Oferta do dia: no horário configurado, escolhe o produto e cria a notificação (enviada logo abaixo, pelo caminho normal).
// Uma notificação por horário por dia: o horário exato fica em scheduled_at e serve de marca para não repetir.
// Só cria se puder enviar agora (fora do silêncio e dentro do limite diário); depois de 2 h sem poder, o horário é pulado.
// deno-lint-ignore no-explicit-any
async function ofertaDoDia(settings: any, autoToday: number, quiet: boolean) {
  const { data: st } = await db.from("cr_site_settings").select("data").eq("id", 1).maybeSingle();
  const c = odCfg(st?.data);
  if (!c.on) return { off: true };
  // Modo personalizado: no máximo 1 por cliente por dia (regra garantida pelas entregas), então não usa o limite geral.
  // Com "horário de cada cliente", roda a cada passagem do agendador: quem tem horário conhecido recebe na própria hora,
  // os demais nos horários do painel.
  if (c.modo === "personalizado") {
    if (quiet) return { waiting: "horário de silêncio" };
    const dueP = odDue(c);
    let slotP: { i: number; t: string; at: string } | null = null;
    if (dueP.length) {
      const { data: madeP, error: meP } = await db.from("cr_notifications").select("scheduled_at")
        .eq("source", "auto_offer").in("scheduled_at", dueP.map((s) => s.at));
      if (meP) throw meP;
      const doneP = new Set((madeP ?? []).map((x) => new Date(x.scheduled_at).toISOString()));
      slotP = dueP.find((s) => !doneP.has(s.at)) ?? null;
    }
    if (!slotP && !c.hora_pessoal) return dueP.length ? { done: true } : { idle: true };
    return await personalizadas(settings, c, slotP);
  }
  const due = odDue(c);
  if (!due.length) return { idle: true };
  if (quiet) return { waiting: "horário de silêncio" };
  if (autoToday >= (settings?.daily_limit ?? 2)) return { waiting: "limite diário atingido" };
  const { data: made, error: me } = await db.from("cr_notifications").select("scheduled_at")
    .eq("source", "auto_offer").in("scheduled_at", due.map((s) => s.at));
  if (me) throw me;
  const done = new Set((made ?? []).map((x) => new Date(x.scheduled_at).toISOString()));
  const slot = due.find((s) => !done.has(s.at));
  if (!slot) return { done: true };
  // não repete produto: nem hoje, nem nos últimos X dias
  const since = new Date(Math.min(spDayStart(), Date.now() - c.norep * 864e5)).toISOString();
  const { data: rec, error: re } = await todas(() => db.from("cr_notifications").select("product_id")
    .not("product_id", "is", null).in("status", ["scheduled", "sending", "sent"]).gte("created_at", since).order("id"));
  if (re) throw re;
  const { data: prods, error: pe } = await todas(() => db.from("cr_products")
    .select("id,name,slug,price,old_price,offer,offer_start,offer_end,status,category_id,product_images:cr_product_images(url)")
    .eq("status", "active").eq("offer", true).gte("price", c.min).order("id"));
  if (pe) throw pe;
  const p = odPick(prods ?? [], c, { skip: new Set((rec ?? []).map((x) => x.product_id)), slot: slot.i });
  if (!p) return { slot: slot.t, nothing: "nenhuma oferta disponível" };
  const { error } = await db.from("cr_notifications").insert(odRow(p, c, slot, settings));
  if (error) throw error;
  return { slot: slot.t, product: p.id };
}

// Modo personalizado: cada cliente recebe um produto escolhido pelo interesse dele (no máximo 1 por dia, 20 h de intervalo).
// Uma linha em cr_notifications registra a rodada (histórico e cliques); cada envio fica em cr_push_entregas,
// cuja chave única (cliente, dia) impede duplicatas mesmo se o agendador rodar duas vezes ao mesmo tempo.
// deno-lint-ignore no-explicit-any
async function personalizadas(settings: any, c: any, slot: { i: number; t: string; at: string } | null) {
  const now = Date.now(), dia = new Date(spDay(now) * 864e5).toISOString().slice(0, 10);
  const hNow = new Date(now).getUTCHours();
  // hora preferida do cliente (UTC) que cai no horário de silêncio não vale: ele recebe nos horários do painel
  const silencioUTC = (h: number) => settings ? inQuiet((h + 21) % 24, settings.quiet_start, settings.quiet_end) : false;
  const naVez = (s: any) => { const hp = c.hora_pessoal ? odHora(s) : null; return hp != null && !silencioUTC(hp) ? hp === hNow : !!slot; };
  const rotulo = slot ? slot.t : `${String((hNow + 21) % 24).padStart(2, "0")}h (horário de cada cliente)`;
  const origin = siteOrigin(settings);
  const { data: subsAll, error: se } = await todas(() => {
    let qs = db.from("cr_push_subscriptions").select("id,endpoint,p256dh,auth,interesses,personalizar").order("created_at").order("id");
    if (origin) qs = qs.or(`origin.is.null,origin.eq."${origin}"`);
    return qs;
  }, 20000);
  if (se) throw se;
  // um aparelho = um cliente (endpoint repetido conta uma vez)
  const byEp = new Map<string, any>();
  for (const s of subsAll ?? []) byEp.set(s.endpoint, s);
  const subs = [...byEp.values()];
  const desde = new Date(now - Math.max(c.norep, 30) * 864e5).toISOString();
  const { data: ents, error: ee } = await todas(() => db.from("cr_push_entregas").select("subscription_id,product_id,enviada_em,tocou_em,dia")
    .gte("enviada_em", desde).order("enviada_em", { ascending: false }).order("id"), 50000);
  if (ee) throw ee;
  // entregas agrupadas por cliente uma vez só (antes cada cliente percorria a lista inteira: lento com muitos inscritos)
  const porSub = new Map<string, any[]>();
  for (const e of ents ?? []) { const l = porSub.get(e.subscription_id); if (l) l.push(e); else porSub.set(e.subscription_id, [e]); }
  const limite = now - OD_INTERVALO_H * 3600e3;
  const pend = subs.filter((s) => naVez(s) && !(porSub.get(s.id) ?? []).some((e) => e.dia === dia || Date.parse(e.enviada_em) > limite));
  if (!pend.length) return { slot: rotulo, personalizado: "ninguém na vez agora (ou todos já receberam hoje)" };
  const { data: prods, error: pe } = await todas(() => db.from("cr_products")
    .select("id,name,slug,price,old_price,offer,offer_start,offer_end,status,category_id,affiliate_url,created_at,product_images:cr_product_images(url,sort,is_cover)")
    .eq("status", "active").gte("price", c.min).order("id"));
  if (pe) throw pe;
  const P = prods ?? [], byId = new Map(P.map((p) => [p.id, p]));
  const { data: cats } = await db.from("cr_categories").select("id,name");
  const catName = new Map((cats ?? []).map((x) => [x.id, x.name]));
  const { data: cl } = await todas(() => db.from("cr_click_events").select("product_id").gte("created_at", new Date(now - 30 * 864e5).toISOString()).order("id"), 20000);
  const pop: Record<string, number> = {};
  for (const x of cl ?? []) if (x.product_id) pop[x.product_id] = (pop[x.product_id] || 0) + 1;
  // escolhe para cada cliente; sem perfil → oferta geral do dia (se o administrador permitir)
  const geral = c.sem_perfil === "geral" ? odPick(P.filter((p) => p.offer && odConfiavel(p, c, now)), c, { slot: slot?.i ?? 0 }) : null;
  const plano = [];
  for (const s of pend) {
    const hist = (porSub.get(s.id) ?? []).map((e) => ({ ...e, cat: byId.get(e.product_id)?.category_id, tocou: !!e.tocou_em }));
    // cliente COM perfil e sem produto adequado: não recebe nada hoje (não envia só para cumprir horário)
    const temPerfil = !!odPesos(s, hist, now), r = temPerfil ? odEscolher(s, P, c, { now, hist, pop }) : null;
    if (r) { const cn = catName.get(r.p.category_id) || ""; plano.push({ s, p: r.p, motivo: ("interesse: " + cn).slice(0, 80), msg: odMsg(r.p, s, now, cn) }); }
    else if (!temPerfil && geral && !hist.some((h) => h.product_id === geral.id)) plano.push({ s, p: geral, motivo: "geral (sem perfil)", msg: { titulo: odText(c.title, geral).slice(0, 80) || "🔥 Oferta do dia", corpo: odText(c.body, geral).slice(0, 200) || geral.name } });
  }
  if (!plano.length) return { slot: rotulo, personalizado: "nenhum produto adequado para os clientes pendentes" };
  const { data: camp, error: ce } = await db.from("cr_notifications").insert({
    title: `Ofertas personalizadas · ${rotulo}`, body: `${plano.length} cliente(s)`, url: settings?.site_url ?? "/",
    source: "auto_offer", status: "sending", scheduled_at: slot ? slot.at : null, error: null,
  }).select("id").single();
  if (ce) throw ce;
  let ok = 0, fail = 0;
  for (const it of plano) {
    // a chave única (cliente, dia) faz a segunda tentativa simplesmente não inserir
    const { data: ent } = await db.from("cr_push_entregas").insert({ subscription_id: it.s.id, notification_id: camp.id, product_id: it.p.id, dia, motivo: it.motivo })
      .select("id").maybeSingle();
    if (!ent) continue;
    const img = [...(it.p.product_images ?? [])].sort((a: any, b: any) => (b.is_cover - a.is_cover) || (a.sort - b.sort))[0]?.url ?? null;
    const payload = JSON.stringify({ id: camp.id, e: ent.id, title: it.msg.titulo, body: it.msg.corpo, image: img, icon: img ?? settings?.icon_url ?? null, url: odLink(it.p, settings) });
    const r = await deliver([it.s], payload);
    if (r.ok) ok++; else fail++;
    await db.from("cr_push_entregas").update({ ok: r.ok > 0, erro: r.ok ? null : (r.lastError ?? "falhou") }).eq("id", ent.id);
  }
  await db.from("cr_notifications").update({ status: ok || !fail ? "sent" : "failed", sent_at: new Date().toISOString(), sent_count: ok, failed_count: fail, body: `${ok} cliente(s), produtos escolhidos por interesse` }).eq("id", camp.id);
  return { slot: rotulo, personalizado: { enviados: ok, falhas: fail } };
}

// Desafio Brick Game: avisos "alguém passou seu recorde" (fila cr_brick_avisos, criada por supabase/09-brickgame-campeoes.sql).
// Cada aviso vai só para o aparelho do campeão anterior. Fora do horário de silêncio; sem a tabela, não faz nada.
// deno-lint-ignore no-explicit-any
async function avisosBrick(settings: any, quiet: boolean) {
  if (quiet) return { waiting: "horário de silêncio" };
  const desde = new Date(Date.now() - 86400e3).toISOString();
  const { data, error } = await db.from("cr_brick_avisos").select("id,endpoint,titulo,corpo,url")
    .is("enviado_em", null).gte("criado_em", desde).order("criado_em").limit(50);
  if (error) return { skipped: error.code === "42P01" || /does not exist|schema cache/.test(error.message) ? "Desafio parte 2 não instalado" : error.message };
  let ok = 0, fail = 0;
  for (const a of data ?? []) {
    let erro: string | null = null;
    try {
      const subs = await loadSubs({ endpoint: a.endpoint });
      if (!subs.length) erro = "aparelho sem inscrição";
      else {
        const r = await deliver(subs, JSON.stringify({ id: null, title: a.titulo, body: a.corpo, image: null, icon: settings?.icon_url ?? null, url: a.url || settings?.site_url || "/" }));
        if (r.ok) ok++; else erro = r.lastError ?? "falhou";
      }
    } catch (e) { erro = String((e as Error).message ?? e).slice(0, 300); }
    if (erro) fail++;
    await db.from("cr_brick_avisos").update({ enviado_em: new Date().toISOString(), erro }).eq("id", a.id);
  }
  return { ok, fail };
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
      const quiet = settings ? inQuiet(spHour(), settings.quiet_start, settings.quiet_end) : false;
      // envios automáticos de hoje; as rodadas personalizadas (cada cliente recebe no máximo 1) contam como 1 no total
      const { count } = await db.from("cr_notifications").select("id", { count: "exact", head: true })
        .neq("source", "manual").eq("status", "sent").gte("sent_at", spDayStartISO()).not("title", "like", "Ofertas personalizadas%");
      const { count: pers } = await db.from("cr_notifications").select("id", { count: "exact", head: true })
        .neq("source", "manual").eq("status", "sent").gte("sent_at", spDayStartISO()).like("title", "Ofertas personalizadas%");
      let autoToday = (count ?? 0) + ((pers ?? 0) > 0 ? 1 : 0);
      // falha na Oferta do dia nunca impede os outros envios
      let oferta: unknown = null;
      try { oferta = await ofertaDoDia(settings, autoToday, quiet); } catch (e) { oferta = { error: String((e as Error).message ?? e) }; }
      const { data: due } = await db.from("cr_notifications").select("id,source")
        .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(10);
      const results = [];
      for (const n of due ?? []) {
        if (n.source !== "manual") {
          if (quiet) { results.push({ id: n.id, waiting: "horário de silêncio" }); continue; }
          if (autoToday >= (settings?.daily_limit ?? 2)) { results.push({ id: n.id, waiting: "limite diário atingido" }); continue; }
          autoToday++;
        }
        results.push(await sendNotificationRow(n.id, settings));
      }
      // avisos do Desafio Brick Game: independentes do limite diário (são pessoais) e nunca impedem os outros envios
      let brick: unknown = null;
      try { brick = await avisosBrick(settings, quiet); } catch (e) { brick = { error: String((e as Error).message ?? e) }; }
      return json({ mode: "cron", oferta, results, brick });
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
