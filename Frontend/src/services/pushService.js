import apiClient from '../config/apiClient.js';

/**
 * pushService.js — Web Push (แจ้งเตือนแม้ไม่ได้เปิดเว็บ)
 * ต้องใช้ HTTPS (หรือ localhost) และเบราว์เซอร์ที่รองรับ — บน iPhone/iPad ต้องเพิ่มเว็บไว้ที่หน้าจอโฮม (PWA) ก่อน
 */

const SW_URL = '/sw.js';

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function registerWorker() {
  await navigator.serviceWorker.register(SW_URL);
  return navigator.serviceWorker.ready;
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getPushState() {
  if (!isPushSupported()) return { supported: false, permission: 'denied', subscribed: false };
  const permission = Notification.permission;
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    subscribed = !!(reg && (await reg.pushManager.getSubscription()));
  } catch (_) {
    subscribed = false;
  }
  return { supported: true, permission, subscribed };
}

// เปิดการแจ้งเตือนบนอุปกรณ์นี้ (ต้องเรียกจากการกดของผู้ใช้ เพื่อขอสิทธิ์จากเบราว์เซอร์)
export async function enablePush() {
  if (!isPushSupported()) throw new Error('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('ไม่ได้รับอนุญาตให้แสดงการแจ้งเตือน — เปิดสิทธิ์ได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์');
  }

  const res = await apiClient.get('/notifications/push/public-key');
  const publicKey = res.data?.publicKey;
  if (!publicKey) throw new Error('เซิร์ฟเวอร์ยังไม่ได้เปิดใช้งานการแจ้งเตือนแบบ Push — กรุณาติดต่อผู้ดูแลระบบ');

  const reg = await registerWorker();
  const subscription =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));

  await apiClient.post('/notifications/push/subscribe', { subscription: subscription.toJSON() });
}

// ผู้ใช้ที่ล็อกอินอยู่ตอนนี้ลงทะเบียนอุปกรณ์ที่เคยอนุญาตไว้ (เงียบๆ) — อุปกรณ์ที่เคยเป็นของผู้ใช้อื่นจะย้ายมาเป็นของผู้ใช้นี้
export async function syncPush() {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const reg = await registerWorker();
  const subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    await apiClient.post('/notifications/push/subscribe', { subscription: subscription.toJSON() });
  }
}

// ปิดการแจ้งเตือนบนอุปกรณ์นี้
export async function disablePush() {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = reg && (await reg.pushManager.getSubscription());
  if (!subscription) return;
  try {
    await apiClient.post('/notifications/push/unsubscribe', { endpoint: subscription.endpoint });
  } catch (_) {
    /* ลบฝั่งเซิร์ฟเวอร์ไม่สำเร็จก็ยังยกเลิกฝั่งอุปกรณ์ได้ */
  }
  await subscription.unsubscribe();
}

// เรียกตอน "ออกจากระบบ/หมดเวลาล็อกอิน": เลิกรับ Push ของบัญชีเดิมบนเครื่องนี้ (กันเครื่องที่ใช้ร่วมกันได้แจ้งเตือนของคนก่อนหน้า) — ไม่โยน error
export async function unsubscribeThisDevice() {
  try {
    await disablePush();
  } catch (_) {
    /* ignore */
  }
}

export default { isPushSupported, getPushState, enablePush, syncPush, disablePush, unsubscribeThisDevice };