/* CC Office phone notifications (2026-10-12, Samantha "build 6-8", item 7). The push carries nothing: no names, no
   details. It only says something needs you; the app shows what, after you open it and sign in. No fetch handler, so
   this never caches or changes how any page loads. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('CC Office', {
    body: 'Something needs you. Open CC Office to see it.',
    icon: 'cc-office-icon-180.png', badge: 'cc-office-icon-180.png', tag: 'cc-office', renotify: true }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws.find((x) => /[?&]m=1/.test(x.url)) || ws[0];
    return w ? w.focus() : self.clients.openWindow('index.html?m=1');
  }));
});
