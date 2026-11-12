/* Telenursing Service Worker — แสดงการแจ้งเตือน (Web Push) แม้ไม่ได้เปิดเว็บ */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    (async () => {
      // ถ้าผู้ใช้กำลังเปิดหน้าเว็บอยู่ (มองเห็นอยู่) แอปจะแสดงแจ้งเตือนในหน้าเองแบบ Realtime — ไม่ต้องเด้งซ้ำที่ระบบปฏิบัติการ
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((c) => c.visibilityState === 'visible')) return;

      await self.registration.showNotification(data.title || 'Telenursing', {
        body: data.body || '',
        tag: data.tag || undefined,
        lang: 'th',
        data: { url: data.url || '/' },
      });
    })()
  );
});

// กดการแจ้งเตือน → เปิด/โฟกัสแท็บของแอป แล้วพาไปหน้าที่เกี่ยวข้อง
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        existing.postMessage({ type: 'notification-click', url: target.pathname + target.search + target.hash });
        return;
      }
      await self.clients.openWindow(target.href);
    })()
  );
});