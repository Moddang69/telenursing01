import ApiError from '../utils/ApiError.js';
import { Nurse } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * verifyNurseSelf
 * พยาบาลเข้าถึง /nurses/:nurseId ได้เฉพาะของตนเอง (ป้องกัน Nurse A ดู Dashboard/รายชื่อผู้ป่วยของ Nurse B โดยเปลี่ยน id ใน URL)
 * Admin ผ่านได้
 */
export const verifyNurseSelf = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.user.roleRefId || req.user.roleRefId !== req.params.nurseId) {
    return next(new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลของพยาบาลท่านอื่น'));
  }
  return next();
};

/**
 * verifyNurseApproved
 * บล็อกพยาบาลที่ยังไม่ผ่านการอนุมัติ / ยังไม่ยอมรับนโยบายรักษาความลับ ไม่ให้ดึงข้อมูลผู้ป่วยแบบรวม (Phase 4.6)
 */
export const verifyNurseApproved = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') return next();
  const nurse = await Nurse.findById(req.user.roleRefId).select('approvalStatus confidentialityAccepted');
  if (!nurse || nurse.approvalStatus !== 'APPROVED') {
    throw new ApiError(403, 'บัญชีพยาบาลยังไม่ได้รับการอนุมัติ');
  }
  if (!nurse.confidentialityAccepted) {
    throw new ApiError(403, 'กรุณายอมรับนโยบายการรักษาความลับก่อนใช้งาน');
  }
  next();
});

export default verifyNurseSelf;
