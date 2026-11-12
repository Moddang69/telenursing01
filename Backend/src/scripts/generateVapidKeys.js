/**
 * generateVapidKeys.js — สร้างคู่คีย์ VAPID สำหรับ Web Push (ใช้ crypto ของ Node ไม่ต้องติดตั้งอะไรเพิ่ม)
 * วิธีใช้ (จากโฟลเดอร์ Backend/):  node src/scripts/generateVapidKeys.js
 * แล้วนำค่าไปใส่ใน Backend/.env  (VAPID_PRIVATE_KEY เป็นความลับ ห้าม commit / ห้ามส่งให้ Frontend)
 */
import crypto from 'crypto';

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();

console.log('# เพิ่มบรรทัดเหล่านี้ใน Backend/.env แล้ว restart backend - generateVapidKeys.js:13');
console.log(`VAPID_PUBLIC_KEY=${b64url(ecdh.getPublicKey())} - generateVapidKeys.js:14`);
console.log(`VAPID_PRIVATE_KEY=${b64url(ecdh.getPrivateKey())} - generateVapidKeys.js:15`);
console.log('VAPID_SUBJECT=mailto:youremail@example.com - generateVapidKeys.js:16');