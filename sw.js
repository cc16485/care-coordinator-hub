/* Phone notifications were taken out on 2026-10-12 (Samantha: no general notification; missed clock-ins and call-ins
   already reach her). Any phone that registered this worker unregisters it the next time it checks; it never shows
   anything and never handles a page load. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.registration.unregister()));
