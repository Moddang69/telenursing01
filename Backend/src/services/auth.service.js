import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Patient, Nurse, Caregiver, Consent } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { generateToken } from '../utils/generateToken.js';
import { env } from '../config/env.js';

/**
 * auth.service.js (Phase 5 services/auth.service.js)
 * Business Logic ของ Authentication — แยกจาก Controller เพื่อ Unit Test ได้ง่าย (Phase 5.2)
 */

/**
 * Register: สร้าง User + Role-specific Profile ใน Transaction เดียว
 * รองรับ role: patient, caregiver, nurse (admin สร้างผ่านระบบภายในเท่านั้น ตาม Assumption)
 */
export async function registerUser({ email, password, role, profile = {}, consent = null }) {
  // ไม่เชื่อค่า consent ที่ client ยัดมาใน profile — สถานะ consent ต้องมาจาก server เท่านั้น
  const {
    consentStatus: _ignoredConsentStatus,
    confidentialityAccepted: _ignoredConfAccepted,
    confidentialityVersion: _ignoredConfVersion,
    confidentialityAcceptedAt: _ignoredConfAt,
    ...safeProfile
  } = profile || {};
  const consentVersion = consent && consent.accepted === true && consent.version ? String(consent.version) : null;
  const now = new Date();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'อีเมลนี้ถูกใช้งานแล้ว');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const user = await User.create(
      [{ email, passwordHash, role, emailVerified: false }],
      { session }
    );
    const createdUser = user[0];

    let roleDoc;
    if (role === 'patient') {
    
      roleDoc = await Patient.create(
        [{ userId: createdUser._id, ...safeProfile, hasProfile: true, consentStatus: consentVersion ? 'GIVEN' : 'NOT_GIVEN' }],
        { session }
      );
      if (consentVersion) {
        await Consent.create(
          [{ userId: createdUser._id, role: 'patient', type: 'PATIENT_DATA_CONSENT', version: consentVersion, status: 'GIVEN', givenAt: now }],
          { session }
        );
      }
    } else if (role === 'nurse') {
      roleDoc = await Nurse.create(
        [{
          userId: createdUser._id,
          ...safeProfile,
          ...(consentVersion
            ? { confidentialityAccepted: true, confidentialityVersion: consentVersion, confidentialityAcceptedAt: now }
            : {}),
        }],
        { session }
      );
      if (consentVersion) {
        await Consent.create(
          [{ userId: createdUser._id, role: 'nurse', type: 'NURSE_CONFIDENTIALITY', version: consentVersion, status: 'GIVEN', givenAt: now }],
          { session }
        );
      }
    } else if (role === 'caregiver') {
      roleDoc = await Caregiver.create(
        [{ userId: createdUser._id, ...safeProfile }],
        { session }
      );
    } else {
      throw new ApiError(400, 'Role ไม่ถูกต้องสำหรับการลงทะเบียนสาธารณะ');
    }

    createdUser.roleRefId = roleDoc[0]._id;
    await createdUser.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { userId: createdUser._id, role, roleRefId: roleDoc[0]._id };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

/**
 * Login: ตรวจ email/password -> คืน JWT + ข้อมูล user พื้นฐาน
 */
export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }

  if (user.accountStatus === 'SUSPENDED') {
    throw new ApiError(403, 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken({
    userId: user._id.toString(),
    role: user.role,
    roleRefId: user.roleRefId ? user.roleRefId.toString() : null,
  });

  return {
    token,
    user: {
      userId: user._id,
      email: user.email,
      role: user.role,
      roleRefId: user.roleRefId,
      accountStatus: user.accountStatus,
    },
  };
}

/**
 * RestoreSession: ใช้ userId จาก Token (ผ่าน authenticate middleware แล้ว) เพื่อคืนข้อมูล user ปัจจุบัน
 */
export async function restoreSession(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'ไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
  }
  return {
    userId: user._id,
    email: user.email,
    role: user.role,
    roleRefId: user.roleRefId,
    accountStatus: user.accountStatus,
  };
}

/**
 * ResetPassword: ใช้หลังยืนยัน OTP สำเร็จแล้วเท่านั้น (Controller ต้องเรียก verifyOtpCode ก่อน)
 */
export async function resetPassword({ email, newPassword }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'ไม่พบผู้ใช้งานนี้ในระบบ');
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await user.save();

  return true;
}

/**
 * MarkEmailVerified: ใช้หลังยืนยัน OTP สำหรับ purpose=REGISTER สำเร็จ
 */
export async function markEmailVerified(email) {
  await User.updateOne({ email }, { $set: { emailVerified: true } });
}

export default {
  registerUser,
  loginUser,
  restoreSession,
  resetPassword,
  markEmailVerified,
};