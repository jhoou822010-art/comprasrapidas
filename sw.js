// Service worker do Compras Rápidas: recebe as notificações push e trata o toque nelas.
// O endereço e a chave pública do Supabase chegam pela URL de registro (sw.js?u=...&k=...), vindos do config.js.
const P = new URL(self.location.href).searchParams;
const SB_URL = P.get('u') || '', SB_KEY = P.get('k') || '';
const BASE = new URL('./', self.location.href).href; // pasta do site (ex.: .../comprasrapidas/)

// Página mostrada quando o app/site abre sem internet (exigência de qualidade do app na Play Store).
// Ao mudar a lista abaixo, troque o número da versão: o cache antigo é apagado na ativação.
const OFFLINE_CACHE = 'cr-offline-v4';
const OFFLINE_URL = BASE + 'offline.html';
// Página dos jogos (/jogos/) e os arquivos de que ela precisa: ficam guardados para abrir mesmo sem internet.
const JOGOS = ['jogos.html', 'jogos/', 'cobrinha.html', 'js/cobrinha.js', 'brickgame.html', 'js/brickgame.js', 'js/jogos.js', 'js/app.js', 'js/db.js', 'js/marca.js', 'js/titulo.js', 'config.js', 'css/style.css'].map(u => BASE + u);
const semBusca = u => u.split('#')[0].split('?')[0];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(OFFLINE_CACHE).then(async c => {
    await c.addAll([OFFLINE_URL, BASE + 'icon-192.png']);
    await Promise.allSettled(JOGOS.map(u => c.add(u))); // se um arquivo falhar, os demais (e a página offline) continuam guardados
  }).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('cr-offline-') && k !== OFFLINE_CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// Abertura de páginas: tenta a rede normalmente e, se falhar, mostra a página offline (ou a dos jogos, se for ela).
// Arquivos dos jogos: sempre a rede primeiro (guardando a versão nova); a cópia guardada só é usada sem internet.
self.addEventListener('fetch', e => {
  const q = e.request, jogo = q.method === 'GET' && JOGOS.includes(semBusca(q.url));
  if (jogo) {
    e.respondWith(fetch(q).then(r => {
      if (r.ok) { const copia = r.clone(); e.waitUntil(caches.open(OFFLINE_CACHE).then(c => c.put(semBusca(q.url), copia)).catch(() => {})); }
      return r;
    }).catch(async () => (await caches.match(semBusca(q.url))) || (q.mode === 'navigate' && await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }
  if (q.mode !== 'navigate') return;
  e.respondWith(fetch(q).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Compras Rápidas';
  const opt = {
    body: d.body || '',
    icon: d.icon || d.image || BASE + 'icon-192.png', // foto do produto aparece mesmo com a notificação recolhida
    badge: BASE + 'badge-96.png', // carrinho branco com fundo transparente (o Android só usa o contorno)
    data: { id: d.id || null, e: d.e || null, url: d.url || BASE }, // e = entrega personalizada (toque por cliente)
    tag: d.e ? d.id + '-' + d.e : d.id || undefined,
  };
  if (d.image) opt.image = d.image;
  e.waitUntil(self.registration.showNotification(title, opt));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { id, e: ent, url } = e.notification.data || {};
  let target;
  try { target = new URL(url || BASE, BASE).href; } catch (_) { target = BASE; }
  e.waitUntil((async () => {
    if (id && SB_URL && SB_KEY) {
      try {
        await fetch(SB_URL + '/rest/v1/rpc/cr_push_click', {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(ent ? { p_notification_id: id, p_entrega: ent } : { p_notification_id: id }),
        });
      } catch (_) { /* clique não contado, mas abre o site mesmo assim */ }
    }
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // prefere uma aba do site já aberta (fora do painel): foca e leva para o link
    const tab = list.find(c => c.url.startsWith(BASE) && !c.url.includes('/admin/')) || list.find(c => c.url.startsWith(BASE));
    if (tab) {
      try { await tab.focus(); } catch (_) {}
      if (tab.url !== target && 'navigate' in tab) { try { await tab.navigate(target); return; } catch (_) {} }
      if (tab.url === target) return;
    }
    await self.clients.openWindow(target);
  })());
});
