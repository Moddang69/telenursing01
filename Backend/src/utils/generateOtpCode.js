/**
 * generateOtpCode.js
 * สุ่มเลข OTP 6 หลัก (Prototype) — ไม่ใช่ Cryptographically Secure ระดับ Production
 * TODO (Production): ควรใช้ crypto.randomInt เพื่อความปลอดภัยสูงขึ้น
 */
import crypto from 'crypto';

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999)); // 6 หลักเสมอ
}

export default generateOtpCode;
