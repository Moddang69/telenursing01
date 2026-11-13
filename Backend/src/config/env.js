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
  // ห้ามฝังคีย์เป็นค่า default ในโค้ด — ถ้าไม่ตั้งค่า ระบบแค่ปิด Web Push
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@telenursing.local',
  // แชท: แสดงตัวอย่างข้อความ (ตัด 80 ตัวอักษร) ในการแจ้งเตือนบนหน้าจอล็อกหรือไม่ — ตั้ง CHAT_PUSH_PREVIEW=false เพื่อซ่อนเนื้อหา (แสดงแค่ "ส่งข้อความใหม่ถึงคุณ")
  // แนะนำให้ปิดถ้าอุปกรณ์อาจถูกใช้ร่วมกันหลายคน (ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว)
  CHAT_PUSH_PREVIEW: process.env.CHAT_PUSH_PREVIEW !== 'false',
  // อายุการเก็บข้อมูล (Data Retention) — ตัวตั้งเวลาลบข้อมูลที่หมดอายุอัตโนมัติ (ดู constants/retention.js)
  // ปิดได้ด้วย RETENTION_PURGE_ENABLED=false / ปรับความถี่ด้วย RETENTION_PURGE_INTERVAL_MINUTES (ค่าเริ่มต้น 60 นาที)
  // ปรับจำนวนวันรายประเภทได้ด้วย RETENTION_DAYS_<ชื่อโมเดลแบบ SNAKE_CASE> เช่น RETENTION_DAYS_HEALTH_RECORD=60
  // อีเมลส่ง OTP (SMTP) — บังคับตั้งค่าเมื่อ NODE_ENV=production (ดูด้านล่าง)
  MAIL_HOST: process.env.MAIL_HOST || '',
  MAIL_PORT: Number(process.env.MAIL_PORT) || 587,
  MAIL_SECURE: process.env.MAIL_SECURE === 'true', // true = SSL ตรง (พอร์ต 465), false = STARTTLS (พอร์ต 587)
  MAIL_USER: process.env.MAIL_USER || '',
  MAIL_PASS: process.env.MAIL_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || '', // เช่น "TeleNursing <no-reply@yourdomain.com>"
  RETENTION_PURGE_ENABLED: process.env.RETENTION_PURGE_ENABLED !== 'false',
  RETENTION_PURGE_INTERVAL_MINUTES: Number(process.env.RETENTION_PURGE_INTERVAL_MINUTES) || 60,
};

// ---------- ตรวจความพร้อมสำหรับ Production (Fail Fast) ----------
if (env.NODE_ENV === 'production') {
  const problems = [];
  if (env.JWT_SECRET.length < 32) problems.push('JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร (สุ่มด้วย crypto)');
  for (const key of ['MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM']) {
    if (!env[key]) problems.push(`${key} ยังไม่ได้ตั้งค่า (จำเป็นสำหรับส่ง OTP ทางอีเมล)`);
  }
  if (/localhost|127\.0\.0\.1/.test(env.FRONTEND_ORIGIN)) problems.push('FRONTEND_ORIGIN ยังชี้ไป localhost');
  if (problems.length) {
    throw new Error(`[ENV ERROR] ตั้งค่า Production ไม่ครบ:\n - ${problems.join('\n - ')}`);
  }
}