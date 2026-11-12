import ApiError from '../utils/ApiError.js';
import { CaregiverLink } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * verifyCaregiverLinkAccess.js (Phase 4.5.3)
 * ตรวจว่า Caregiver เชื่อมโยงกับ Patient นี้จริงและ status = ACTIVE
 * รองรับตรวจ permission ย่อยด้วย (เช่น assistHealthLog, viewCarePlan)
 *
 * Usage: verifyCaregiverLinkAccess()                       -> ตรวจ Link เฉยๆ
 *        verifyCaregiverLinkAccess('assistHealthLog')       -> ตรวจ Link + permission เฉพาะ
 */
export function verifyCaregiverLinkAccess(requiredPermission = null) {
  return asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'caregiver') {
      return next(); // ให้ middleware อื่นจัดการ role อื่น
    }

    const patientId = req.params.patientId || req.body.patientId;
    const caregiverId = req.user.roleRefId;

    if (!patientId) {
      throw new ApiError(400, 'ไม่พบ patientId สำหรับตรวจสอบสิทธิ์');
    }

    const link = await CaregiverLink.findOne({
      caregiverId,
      patientId,
      status: 'ACTIVE',
    });

    if (!link) {
      throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้ (ไม่ได้เชื่อมโยงเป็นผู้ดูแล)');
    }

    if (requiredPermission && !link.permissions[requiredPermission]) {
      throw new ApiError(403, `คุณไม่มีสิทธิ์ "${requiredPermission}" สำหรับผู้ป่วยรายนี้`);
    }

    req.caregiverLinkContext = link;
    next();
  });
}

export default verifyCaregiverLinkAccess;
