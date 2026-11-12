import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/index.js';

/**
 * authenticate.js (Phase 4.3 / Phase 5 middleware/authenticate.js)
 * ตรวจสอบ JWT จาก Authorization Header -> attach req.user
 * ปฏิเสธถ้า Token ไม่ถูกต้อง, หมดอายุ, หรือ User ถูก SUSPENDED
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'ไม่พบ Token การยืนยันตัวตน กรุณาเข้าสู่ระบบใหม่');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    throw new ApiError(401, 'Token ไม่ถูกต้อง');
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(401, 'ไม่พบผู้ใช้งานนี้ในระบบ');
  }

  if (user.accountStatus === 'SUSPENDED') {
    throw new ApiError(403, 'บัญชีนี้ถูกระงับการใช้งาน');
  }

  // attach ข้อมูลที่ Middleware/Controller ถัดไปต้องใช้ (Phase 4.5)
  req.user = {
    userId: user._id.toString(),
    role: user.role,
    roleRefId: user.roleRefId ? user.roleRefId.toString() : null,
    accountStatus: user.accountStatus,
  };

  next();
});

export default authenticate;
