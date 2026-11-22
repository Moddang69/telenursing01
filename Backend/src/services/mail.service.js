import { env } from '../config/env.js';

/**
- mail.service.js — ส่งอีเมล OTP ผ่าน SMTP (ใช้ได้กับผู้ให้บริการทั่วไป เช่น Brevo, Resend SMTP, Mailgun, SES, Gmail App Password)
- โหลด nodemailer แบบ lazy (เหมือน push.service.js) เพื่อไม่ให้เทสต์/โหมดพัฒนาพังถ้ายังไม่ได้ติดตั้งหรือยังไม่ตั้งค่า
- ติดตั้ง: npm install nodemailer   (ในโฟลเดอร์ Backend เพื่ออัปเดต package-lock.json ด้วย)
 */
export const isMailConfigured = () => !!(env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASS && env.MAIL_FROM);

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

const SUBJECTS = {
  REGISTER: 'รหัส OTP ยืนยันอีเมล — TeleNursing',
  FORGOT_PASSWORD: 'รหัส OTP ตั้งรหัสผ่านใหม่ — TeleNursing',
};

export async function sendOtpEmail({ to, otpCode, purpose, expiresInSeconds }) {
  if (!isMailConfigured()) throw new Error('ยังไม่ได้ตั้งค่าอีเมล (MAIL_HOST / MAIL_USER / MAIL_PASS / MAIL_FROM)');
  const minutes = Math.round(expiresInSeconds / 60);
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: SUBJECTS[purpose] || 'รหัส OTP — TeleNursing',
    text: `รหัส OTP ของท่านคือ ${otpCode}\nรหัสนี้ใช้ได้ภายใน ${minutes} นาที\nห้ามแจ้งรหัสนี้แก่ผู้อื่น หากท่านไม่ได้เป็นผู้ขอ โปรดเพิกเฉยต่ออีเมลนี้`,
    html: `<p>รหัส OTP ของท่านคือ</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${otpCode}</p><p>รหัสนี้ใช้ได้ภายใน ${minutes} นาที ห้ามแจ้งรหัสนี้แก่ผู้อื่น<br>หากท่านไม่ได้เป็นผู้ขอ โปรดเพิกเฉยต่ออีเมลนี้</p>`,
  });
}

export default { isMailConfigured, sendOtpEmail };