// Service worker do Compras Rápidas: recebe as notificações push e trata o toque nelas.
// O endereço e a chave pública do Supabase chegam pela URL de registro (sw.js?u=...&k=...), vindos do config.js.
const P = new URL(self.location.href).searchParams;
const SB_URL = P.get('u') || '', SB_KEY = P.get('k') || '';
const BASE = new URL('./', self.location.href).href; // pasta do site (ex.: .../comprasrapidas/)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Compras Rápidas';
  const opt = {
    body: d.body || '',
    icon: d.icon || BASE + 'icon-192.png',
    badge: BASE + 'icon-192.png',
    data: { id: d.id || null, url: d.url || BASE },
    tag: d.id || undefined,
  };
  if (d.image) opt.image = d.image;
  e.waitUntil(self.registration.showNotification(title, opt));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { id, url } = e.notification.data || {};
  let target;
  try { target = new URL(url || BASE, BASE).href; } catch (_) { target = BASE; }
  e.waitUntil((async () => {
    if (id && SB_URL && SB_KEY) {
      try {
        await fetch(SB_URL + '/rest/v1/rpc/cr_push_click', {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_notification_id: id }),
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
