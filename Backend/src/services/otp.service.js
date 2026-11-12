import bcrypt from 'bcryptjs';
import { Otp } from '../models/index.js';
import { generateOtpCode } from '../utils/generateOtpCode.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

/**
 * otp.service.js (Phase 5 services/otp.service.js)
 * Logic ตรงกับ Frontend useOtpTimer.js:
 * - อายุ 3 นาที (180 วินาที)
 * - resend cooldown 30 วิ (บังคับที่ Frontend timer, Backend เช็คแค่ resendCount)
 * - max 3 resend, max 5 wrong attempts
 */
const OTP_TTL_SECONDS = 180;
const MAX_RESEND = 3;
const MAX_WRONG_ATTEMPTS = 5;

export async function createOtp({ email, purpose }) {
  // เฉพาะ OTP ที่ยังไม่หมดอายุเท่านั้นที่นับ resend ต่อ — OTP เก่าที่หมดอายุยังถูกเก็บไว้ตามนโยบาย Retention (90 วัน)
  // จึงต้องกรองเอง ไม่งั้นจะติดลิมิต 3 ครั้งไปอีก 90 วัน (เดิม TTL Index ลบทิ้งให้อัตโนมัติ)
  const existing = await Otp.findOne({ email, purpose, verified: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });

  if (existing && existing.resendCount >= MAX_RESEND) {
    throw new ApiError(429, 'ขอ OTP ซ้ำได้ไม่เกิน 3 ครั้ง กรุณารอสักครู่หรือเริ่มขั้นตอนใหม่');
  }

  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, env.BCRYPT_SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  let otpDoc;
  if (existing) {
    existing.otpHash = otpHash;
    existing.expiresAt = expiresAt;
    existing.resendCount += 1;
    existing.wrongAttempts = 0;
    otpDoc = await existing.save();
  } else {
    otpDoc = await Otp.create({ email, purpose, otpHash, expiresAt });
  }

  // Prototype: ไม่ได้ต่อ SMS/Email Gateway จริง — ส่งค่ากลับใน Response เพื่อทดสอบ (TODO: Production ต้องส่งผ่าน Email/SMS จริง ไม่ใช่ Response Body)
  return { otpId: otpDoc._id, otpCode, expiresInSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtpCode({ email, purpose, otp }) {
  const otpDoc = await Otp.findOne({ email, purpose, verified: false })
    .sort({ createdAt: -1 })
    .select('+otpHash');

  if (!otpDoc) {
    throw new ApiError(400, 'ไม่พบคำขอ OTP กรุณาขอรหัสใหม่');
  }

  if (otpDoc.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP หมดอายุแล้ว กรุณาขอรหัสใหม่');
  }

  if (otpDoc.wrongAttempts >= MAX_WRONG_ATTEMPTS) {
    throw new ApiError(429, 'กรอก OTP ผิดครบจำนวนครั้งที่กำหนดแล้ว กรุณาขอรหัสใหม่');
  }

  const isMatch = await bcrypt.compare(otp, otpDoc.otpHash);
  if (!isMatch) {
    otpDoc.wrongAttempts += 1;
    await otpDoc.save();
    throw new ApiError(400, `OTP ไม่ถูกต้อง (พยายามผิด ${otpDoc.wrongAttempts}/${MAX_WRONG_ATTEMPTS} ครั้ง)`);
  }

  otpDoc.verified = true;
  await otpDoc.save();

  return true;
}

export default { createOtp, verifyOtpCode };
