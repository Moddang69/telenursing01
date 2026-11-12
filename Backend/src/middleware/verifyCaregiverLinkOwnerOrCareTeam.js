import ApiError from '../utils/ApiError.js';
import { CaregiverLink, CareTeam } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * verifyCaregiverLinkOwnerOrCareTeam.js
 * ใช้กับ Route ที่มี :linkId (approve/revoke/permissions) — ตรวจว่า Nurse ที่ login
 * เป็นเจ้าของ Care Team ของ Patient ใน Link นี้จริง (ป้องกัน Nurse อื่นมาอนุมัติ/ยกเลิก Link ที่ไม่เกี่ยวกับตน)
 */
export const verifyCaregiverLinkOwnerOrCareTeam = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') return next();

  const { linkId } = req.params;
  const link = await CaregiverLink.findById(linkId);
  if (!link) throw new ApiError(404, 'ไม่พบการเชื่อมโยงนี้');

  if (req.user.role === 'nurse') {
    const careTeam = await CareTeam.findOne({
      patientId: link.patientId,
      nurseId: req.user.roleRefId,
      status: 'ACTIVE',
    });
    if (!careTeam) {
      throw new ApiError(403, 'คุณไม่มีสิทธิ์จัดการการเชื่อมโยงนี้ (ไม่อยู่ใน Care Team)');
    }
  } else {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์ดำเนินการนี้');
  }

  req.caregiverLinkTarget = link;
  next();
});

export default verifyCaregiverLinkOwnerOrCareTeam;
