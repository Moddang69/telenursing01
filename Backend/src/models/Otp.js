import mongoose from 'mongoose';

/**
 * Otp.js (Phase 2 / 2.3 otps)
 * expiresAt = เวลาที่รหัส OTP หมดอายุใช้งาน (ตรวจที่ otp.service.js) — ไม่ได้เป็น TTL Index แล้ว
 * ตัวเอกสารเก็บไว้ 90 วันนับจาก createdAt แล้วลบโดย services/dataRetention.service.js (ดู constants/retention.js)
 * otpHash ไม่เก็บ plaintext OTP (Phase 4.2)
 */
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true, select: false },
    purpose: {
      type: String,
      enum: ['REGISTER', 'FORGOT_PASSWORD'],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    resendCount: { type: Number, default: 0 }, // max 3 validate ที่ service layer
    wrongAttempts: { type: Number, default: 0 }, // max 5 validate ที่ service layer
    verified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

otpSchema.index({ email: 1, purpose: 1 });
// ใช้ตอนลบข้อมูลหมดอายุตามนโยบาย Retention
otpSchema.index({ createdAt: 1 });

export default mongoose.model('Otp', otpSchema);
