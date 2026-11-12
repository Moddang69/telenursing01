/**
 * testMail.js — ทดสอบการตั้งค่า SMTP (MAIL_*) โดยไม่ต้องผ่านหน้าเว็บ
 * วิธีใช้ (ในโฟลเดอร์ Backend):  node src/scripts/testMail.js you@example.com
 * จะแสดงสาเหตุที่ชัดเจนถ้าส่งไม่สำเร็จ (รหัสผ่านผิด / From ยังไม่ได้ยืนยัน / ไม่ได้ติดตั้ง nodemailer ฯลฯ)
 */
import { env } from '../config/env.js';
import { isMailConfigured, sendOtpEmail } from '../services/mail.service.js';

const to = process.argv[2];
if (!to) {
  console.error('วิธีใช้: node src/scripts/ <อีเมลผู้รับ> - testMail.js:11');
  process.exit(1);
}

console.log(`MAIL_HOST=${env.MAIL_HOST || '(ว่าง)'}  MAIL_PORT=${env.MAIL_PORT}  MAIL_SECURE=${env.MAIL_SECURE} - testMail.js:15`);
console.log(`MAIL_USER=${env.MAIL_USER || '(ว่าง)'}  MAIL_PASS=${env.MAIL_PASS ? '(ตั้งแล้ว)' : '(ว่าง)'}  MAIL_FROM=${env.MAIL_FROM || '(ว่าง)'} - testMail.js:16`);
if (!isMailConfigured()) {
  console.error('❌ ยังตั้งค่า MAIL_HOST / MAIL_USER / MAIL_PASS / MAIL_FROM ไม่ครบใน Backend/.env - testMail.js:18');
  process.exit(1);
}

try {
  await sendOtpEmail({ to, otpCode: '123456', purpose: 'REGISTER', expiresInSeconds: 180 });
  console.log(`✅ ส่งอีเมลทดสอบไปที่ ${to} แล้ว (ตรวจกล่องจดหมายและโฟลเดอร์สแปม) - testMail.js:24`);
} catch (err) {
  console.error('❌ ส่งไม่สำเร็จ: - testMail.js:26', err.code ? `[${err.code}] ` : '', err.message);
  if (err.code === 'ERR_MODULE_NOT_FOUND - testMail.js:27') console.error('   → ยังไม่ได้ติดตั้ง nodemailer: รัน npm install nodemailer');
  if (err.code === 'EAUTH - testMail.js:28') console.error('   → ชื่อผู้ใช้/รหัสผ่าน SMTP ไม่ถูกต้อง (Brevo ต้องใช้ SMTP Key ไม่ใช่รหัสผ่านล็อกอิน)');
  process.exit(1);
}
process.exit(0);