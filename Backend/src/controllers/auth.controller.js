import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import authService from '../services/auth.service.js';
import otpService from '../services/otp.service.js';
import { logAudit } from '../middleware/auditLogger.js';
import { User } from '../models/index.js';

/**
 * auth.controller.js
 * Map ตรงกับ Frontend src/services/authService.js:
 *   login, logout, restoreSession, requestOtp, verifyOtp, resetPassword, register
 */

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { email, password, role, profile, consent } = req.body;

  const result = await authService.registerUser({ email, password, role, profile, consent });

  await logAudit({
    userId: result.userId,
    userName: email,
    action: `User registered as ${role}`,
    targetType: 'user',
    targetId: result.userId.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'ลงทะเบียนสำเร็จ กรุณายืนยันอีเมลด้วย OTP',
    data: result,
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  let result;
  try {
    result = await authService.loginUser({ email, password });
  } catch (err) {
    await logAudit({
      userId: null,
      userName: email,
      action: 'Login Failed',
      result: 'Failure',
      ipAddress: req.ip,
    });
    throw err;
  }

  await logAudit({
    userId: result.user.userId,
    userName: email,
    action: 'Login Success',
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ',
    data: result,
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  // Prototype: JWT เป็น Stateless — Logout จริงทำที่ Client (ลบ Token ออกจาก storage)
  // TODO (Production): พิจารณาใช้ Token Blacklist ผ่าน Redis หากต้องการ revoke ทันที
  await logAudit({
    userId: req.user?.userId || null,
    userName: req.user?.userId || 'unknown',
    action: 'Logout',
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'ออกจากระบบสำเร็จ' });
});

// GET /api/auth/restore-session
export const restoreSessionHandler = asyncHandler(async (req, res) => {
  const data = await authService.restoreSession(req.user.userId);
  res.status(200).json({ success: true, data });
});

// POST /api/auth/otp/request
export const requestOtp = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;

  const existing = await User.findOne({ email });

  if (purpose === 'REGISTER') {
    // แก้ไข: Flow จริงคือ Register สร้าง User (emailVerified:false) ก่อน แล้วค่อยขอ OTP มายืนยัน
    // ดังนั้นต้องเช็คว่า "มี user แต่ยัง verified แล้ว" ต่างหาก ไม่ใช่ "มี user = ผิด"
    if (existing && existing.emailVerified) {
      throw new ApiError(409, 'อีเมลนี้ถูกใช้งานและยืนยันแล้ว กรุณาเข้าสู่ระบบ');
    }
    if (!existing) {
      throw new ApiError(404, 'ไม่พบบัญชีนี้ กรุณาลงทะเบียนก่อนขอ OTP');
    }
  }

  if (purpose === 'FORGOT_PASSWORD') {
    if (!existing) {
      throw new ApiError(404, 'ไม่พบผู้ใช้งานนี้ในระบบ');
    }
  }

  const result = await otpService.createOtp({ email, purpose });

  res.status(200).json({
    success: true,
    message: 'ส่ง OTP สำเร็จ',
    data: { otpId: result.otpId, expiresInSeconds: result.expiresInSeconds, devOnlyOtpCode: result.otpCode },
  });
});


// POST /api/auth/otp/verify
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, purpose, otp } = req.body;

  await otpService.verifyOtpCode({ email, purpose, otp });

  if (purpose === 'REGISTER') {
    await authService.markEmailVerified(email);
  }

  res.status(200).json({ success: true, message: 'ยืนยัน OTP สำเร็จ' });
});

// POST /api/auth/reset-password
export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Business Rule: ต้องยืนยัน OTP (purpose=FORGOT_PASSWORD) สำเร็จมาก่อนเท่านั้น
  // ตรวจจาก Otp collection ว่ามี record verified=true ล่าสุดหรือไม่
  const { Otp } = await import('../models/index.js');
  // ต้องยังไม่หมดอายุด้วย: เอกสาร OTP ถูกเก็บ 90 วัน ไม่ได้ถูกลบตอนหมดอายุแล้ว (เดิมพึ่ง TTL Index)
  const verifiedOtp = await Otp.findOne({
    email,
    purpose: 'FORGOT_PASSWORD',
    verified: true,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!verifiedOtp) {
    throw new ApiError(400, 'กรุณายืนยัน OTP ก่อนตั้งรหัสผ่านใหม่');
  }

  await authService.resetPassword({ email, newPassword: password });

  await logAudit({
    userId: null,
    userName: email,
    action: 'Password Reset via OTP',
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'ตั้งรหัสผ่านใหม่สำเร็จ' });
});

export default {
  register,
  login,
  logout,
  restoreSessionHandler,
  requestOtp,
  verifyOtp,
  resetPasswordHandler,
};