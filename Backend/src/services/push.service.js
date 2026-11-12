import { env } from '../config/env.js';
import { PushSubscription } from '../models/index.js';

/**
 * push.service.js — ส่ง Web Push (แสดงแจ้งเตือนบนอุปกรณ์แม้ไม่ได้เปิดเว็บ)
 * - ต้องตั้ง VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ใน .env (สร้างด้วย src/scripts/generateVapidKeys.js)
 * - โหลดแพ็กเกจ web-push แบบ lazy: ถ้ายังไม่ได้ตั้งค่า/ยังไม่ได้ติดตั้ง ระบบอื่นไม่พัง (แค่ไม่ส่ง Push)
 */

export const isPushConfigured = () => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
export const getPublicKey = () => (isPushConfigured() ? env.VAPID_PUBLIC_KEY : null);

let webPushPromise = null;
function getWebPush() {
  if (!isPushConfigured()) return Promise.resolve(null);
  if (!webPushPromise) {
    webPushPromise = import('web-push')
      .then((mod) => {
        const wp = mod.default || mod;
        wp.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
        return wp;
      })
      .catch((err) => {
        console.warn('⚠️ Web Push ใช้งานไม่ได้ (ตรวจว่าติดตั้ง webpush และตั้งค่า VAPID ถูกต้อง): - push.service.js:24', err.message);
        return null;
      });
  }
  return webPushPromise;
}

/**
 * ส่ง Push ไปทุกอุปกรณ์ของผู้ใช้ — payload: { title, body, url, tag }
 * subscription ที่หมดอายุ/ถูกยกเลิก (404/410) จะถูกลบทิ้งอัตโนมัติ
 */
export async function sendPushToUser(userId, payload) {
  const webpush = await getWebPush();
  if (!webpush) return 0;

  const subs = await PushSubscription.find({ userId });
  if (!subs.length) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { TTL: 60 * 60 });
        sent += 1;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.warn('Web Push ส่งไม่สำเร็จ: - push.service.js:53', err?.statusCode || err?.message);
        }
      }
    })
  );
  return sent;
}

export default { isPushConfigured, getPublicKey, sendPushToUser };