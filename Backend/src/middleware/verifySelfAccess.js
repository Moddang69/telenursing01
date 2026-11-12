import ApiError from '../utils/ApiError.js';
import { Patient } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * verifySelfAccess.js (Phase 4.5.3)
 * ใช้กับ Route ที่มี :patientId ใน URL — ตรวจว่า Patient ที่ login เข้ามาตรงกับ patientId ที่ขอเข้าถึงหรือไม่
 * ป้องกัน Patient A เข้าถึงข้อมูลของ Patient B โดยเปลี่ยนเลขใน URL เอง
 *
 * หมายเหตุ: รองรับ role อื่น (nurse/caregiver) ให้ผ่านไปที่ middleware ถัดไปแทน (ตรวจใน verifyCareTeamAccess / verifyCaregiverLinkAccess)
 */
export const verifySelfAccess = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'patient') {
    return next(); // ให้ middleware อื่นจัดการ role อื่น
  }

  const { patientId } = req.params;

  // req.user.roleRefId คือ Patient._id ของผู้ login (มาจาก users.roleRefId)
  if (!req.user.roleRefId || req.user.roleRefId !== patientId) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลของผู้ป่วยรายอื่น');
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  req.patientContext = patient;
  next();
});

export default verifySelfAccess;
