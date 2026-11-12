import dotenv from 'dotenv';

dotenv.config();

/**
 * env.js
 * รวมและ validate Environment Variables ที่จำเป็นทั้งหมดไว้ที่เดียว
 * หากขาด variable สำคัญ ให้ throw error ทันทีตอน start server
 * เพื่อไม่ให้แอปรันขึ้นมาแบบครึ่งๆกลางๆ (Fail Fast Principle)
 */

const requiredVars = ['MONGO_URI', 'JWT_SECRET'];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`[ENV ERROR] Missing required environment variable: ${key}`);
  }
}

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30m',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  // Agora RTC (วิดีโอคอล) — ไม่บังคับตอน start server เพื่อไม่ให้ระบบส่วนอื่น/เทสต์พัง
  // แต่ endpoint ออก token จะตอบ 503 ถ้ายังไม่ตั้งค่า
  // AGORA_APP_CERTIFICATE เป็นความลับ ห้ามใส่ใน Frontend หรือ commit ลง git
  AGORA_APP_ID: process.env.AGORA_APP_ID || '',
  AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE || '',
  AGORA_TOKEN_TTL_SECONDS: Number(process.env.AGORA_TOKEN_TTL_SECONDS) || 3600,
  // Web Push (แจ้งเตือนแม้ไม่ได้เปิดเว็บ) — ไม่บังคับ: ถ้าไม่ตั้งค่า ระบบยังแจ้งเตือนในแอปได้ตามปกติ แต่จะไม่ส่ง Push
  // สร้างคีย์ด้วย: node src/scripts/generateVapidKeys.js   (VAPID_PRIVATE_KEY เป็นความลับ ห้าม commit)
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BFgH4oL7343VDK7aznX0KX3-yWUebLxY4cEzRJtS0RQGlReU7BB0c5VrWLgKNzfCIj82StfTuu7i_KGxpg6doF8',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'g3o_VtVIi_W4OmoMLC3dosfd8B33uqY58NKyV_XCh_Q',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@telenursing.local',
  // อายุการเก็บข้อมูล (Data Retention) — ตัวตั้งเวลาลบข้อมูลที่หมดอายุอัตโนมัติ (ดู constants/retention.js)
  // ปิดได้ด้วย RETENTION_PURGE_ENABLED=false / ปรับความถี่ด้วย RETENTION_PURGE_INTERVAL_MINUTES (ค่าเริ่มต้น 60 นาที)
  // ปรับจำนวนวันรายประเภทได้ด้วย RETENTION_DAYS_<ชื่อโมเดลแบบ SNAKE_CASE> เช่น RETENTION_DAYS_HEALTH_RECORD=60
  RETENTION_PURGE_ENABLED: process.env.RETENTION_PURGE_ENABLED !== 'false',
  RETENTION_PURGE_INTERVAL_MINUTES: Number(process.env.RETENTION_PURGE_INTERVAL_MINUTES) || 60,
};