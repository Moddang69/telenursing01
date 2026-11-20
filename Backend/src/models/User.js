import mongoose from 'mongoose';

/**
 * User.js — Base Identity สำหรับทุก Role (Phase 2 / 2.3 users)
 * roleRefId ชี้ไปยัง Patient / Nurse / Caregiver ตาม role
 * Admin ไม่มี Profile Collection แยก ใช้ users ตรงๆ (roleRefId = null สำหรับ admin)
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Invalid email format',
      ],
    },

    passwordHash: {
      type: String,
      required: true,
      select: false, // Phase 4.8 — ห้ามส่ง passwordHash กลับไปโดยไม่ตั้งใจ
    },
    role: {
      type: String,
      enum: ['patient', 'caregiver', 'nurse', 'admin'],
      required: true,
    },
    roleRefId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      // ref แบบ dynamic ตาม role — resolve ที่ application layer (refPath ไม่ใช้เพราะ field ต่างชื่อ)
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'CONSENT_WITHDRAWN'],
      default: 'ACTIVE',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } // createdAt, updatedAt อัตโนมัติ
);

userSchema.index({ role: 1 });

export default mongoose.model('User', userSchema);
