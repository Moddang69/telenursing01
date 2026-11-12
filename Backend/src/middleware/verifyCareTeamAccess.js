import ApiError from '../utils/ApiError.js';
import { CareTeam, Nurse } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAudit } from './auditLogger.js';

/**
 * verifyCareTeamAccess.js (Phase 4.5.2 — หัวใจของ Security ทั้งระบบ)
 * ป้องกัน Nurse A เข้าถึง Patient ที่ดูแลโดย Nurse B โดยเด็ดขาด
 *
 * Logic ตรงตาม Pseudocode ใน Phase 4.5.2:
 * 1. ถ้า role ไม่ใช่ nurse -> ข้ามไปให้ middleware อื่นจัดการ
 * 2. หา ActiveCareTeam = careteams.findOne({ patientId, nurseId, status: "ACTIVE" })
 * 3. ถ้าไม่พบ -> บันทึก Audit Log (Failure) + 403 Forbidden
 * 4. ถ้าพบ -> attach req.careTeamContext -> next()
 *
 * Admin ให้ผ่านตลอด (Full Access ตาม RBAC Matrix Phase 4.4) แต่ยังต้อง Audit Log ทุกครั้งที่ Controller เรียก logAudit เอง
 */
export const verifyCareTeamAccess = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') {
    return next(); // Admin มี Full Access ตาม RBAC Matrix (Phase 4.4)
  }

  if (req.user.role !== 'nurse') {
    return next(); // ให้ middleware อื่น (verifySelfAccess/verifyCaregiverLinkAccess) จัดการ role อื่น
  }

  const patientId = req.params.patientId || req.body.patientId;
  const nurseId = req.user.roleRefId;

  if (!patientId) {
    throw new ApiError(400, 'ไม่พบ patientId สำหรับตรวจสอบสิทธิ์');
  }

  // ตรวจสอบว่า Nurse ผ่านการอนุมัติแล้วและยอมรับ Confidentiality Policy หรือยัง (Phase 4.6)
  const nurse = await Nurse.findById(nurseId);
  if (!nurse || nurse.approvalStatus !== 'APPROVED') {
    throw new ApiError(403, 'บัญชีพยาบาลยังไม่ได้รับการอนุมัติ ไม่สามารถเข้าถึงข้อมูลผู้ป่วยได้');
  }
  if (!nurse.confidentialityAccepted) {
    throw new ApiError(403, 'กรุณายอมรับนโยบายการรักษาความลับก่อนเข้าถึงข้อมูลผู้ป่วย');
  }

  const activeCareTeam = await CareTeam.findOne({
    patientId,
    nurseId,
    status: 'ACTIVE',
  });

  if (!activeCareTeam) {
    // 🔒 บันทึก Unauthorized Access Attempt เสมอ (Phase 4.7 — Mandatory Audit Event)
    await logAudit({
      userId: req.user.userId,
      userName: `${nurse.firstName} ${nurse.lastName}`,
      action: `Unauthorized access attempt to Patient ${patientId}`,
      targetType: 'patient',
      targetId: patientId,
      result: 'Failure',
      ipAddress: req.ip,
    });

    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยรายนี้ (ไม่อยู่ใน Care Team ของคุณ)');
  }

  req.careTeamContext = activeCareTeam;
  next();
});

export default verifyCareTeamAccess;
