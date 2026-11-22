import { env } from '../config/env.js';

/**
 * mail.service.js — ส่งอีเมล OTP ผ่าน Brevo API หรือ SMTP (Brevo, Resend SMTP, Mailgun, SES, Gmail App Password)
 * โหลด nodemailer แบบ lazy เพื่อไม่ให้เทสต์/โหมดพัฒนาพังถ้ายังไม่ได้ติดตั้งหรือยังไม่ตั้งค่า
 * ติดตั้ง: npm install nodemailer (ในโฟลเดอร์ Backend เพื่ออัปเดต package-lock.json ด้วย)
 */
export const isMailConfigured = () =>
  !!(env.BREVO_API_KEY && env.MAIL_FROM_EMAIL) ||
  !!(env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASS && env.MAIL_FROM);

let transporterPromise = null;
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = import('nodemailer').then((mod) => {
      const nodemailer = mod.default || mod;
      return nodemailer.createTransport({
        host: env.MAIL_HOST,
        port: env.MAIL_PORT,
        secure: env.MAIL_SECURE,
        auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
    });
    transporterPromise.catch(() => { transporterPromise = null; }); // ลองใหม่ได้ในครั้งถัดไป
  }
  return transporterPromise;
}

async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'TeleNursing', email: env.MAIL_FROM_EMAIL }, // ต้องเป็นอีเมลที่ยืนยันใน Brevo
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

const SUBJECTS = {
  REGISTER: 'รหัส OTP ยืนยันอีเมล — TeleNursing',
  FORGOT_PASSWORD: 'รหัส OTP ตั้งรหัสผ่านใหม่ — TeleNursing',
};

export async function sendOtpEmail({ to, otpCode, purpose, expiresInSeconds }) {
  if (!isMailConfigured()) {
    throw new Error('ยังไม่ได้ตั้งค่าอีเมล (BREVO_API_KEY / MAIL_FROM_EMAIL หรือ MAIL_HOST / MAIL_USER / MAIL_PASS / MAIL_FROM)');
  }

  const minutes = Math.round(expiresInSeconds / 60);
  const subject = SUBJECTS[purpose] || 'รหัส OTP — TeleNursing';
  const text = `รหัส OTP ของท่านคือ ${otpCode}\nรหัสนี้ใช้ได้ภายใน ${minutes} นาที\nห้ามแจ้งรหัสนี้แก่ผู้อื่น หากท่านไม่ได้เป็นผู้ขอ โปรดเพิกเฉยต่ออีเมลนี้`;
  const html = `<p>รหัส OTP ของท่านคือ</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${otpCode}</p><p>รหัสนี้ใช้ได้ภายใน ${minutes} นาที ห้ามแจ้งรหัสนี้แก่ผู้อื่น<br>หากท่านไม่ได้เป็นผู้ขอ โปรดเพิกเฉยต่ออีเมลนี้</p>`;

  // ถ้าตั้งค่า Brevo API ไว้ ให้ส่งผ่าน Brevo API ก่อน
  if (env.BREVO_API_KEY && env.MAIL_FROM_EMAIL) {
    await sendViaBrevo({ to, subject, text, html });
    return;
  }

  // ถ้าไม่ได้ตั้งค่า Brevo API ให้ส่งผ่าน SMTP (nodemailer) ตามปกติ
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

export default { isMailConfigured, sendOtpEmail };