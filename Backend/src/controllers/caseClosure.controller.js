import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { CaseClosure, Patient, CareTeam } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';

/**
 * caseClosure.controller.js
 * จัดการการปิดเคสโดยพยาบาล
 */

// POST /api/case-closures - พยาบาลปิดเคสผู้ป่วย
export const createCaseClosure = asyncHandler(async (req, res) => {
  const { patientId, closureReason, otherReason } = req.body;
  const nurseId = req.user.userId;

  // ตรวจสอบว่าผู้ป่วยมีอยู่
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  // ตรวจสอบว่าพยาบาลมีสิทธิ์ปิดเคสผู้ป่วยนี้ (ต้องอยู่ใน CareTeam)
  const careTeam = await CareTeam.findOne({
    patientId,
    nurseId,
    status: 'ACTIVE',
  });

  if (!careTeam) {
    throw new ApiError(403, 'ไม่มีสิทธิ์ปิดเคสผู้ป่วยนี้');
  }

  // ตรวจสอบเหตุผล
  if (closureReason === 'other' && !otherReason) {
    throw new ApiError(400, 'กรุณาระบุเหตุผล');
  }

  // สร้างการปิดเคส
  const caseClosure = await CaseClosure.create({
    patientId,
    nurseId,
    closureReason,
    otherReason: closureReason === 'other' ? otherReason : null,
  });

  // อัปเดตสถานะ CareTeam เป็น CLOSED
  await CareTeam.updateOne(
    { patientId, nurseId, status: 'ACTIVE' },
    { status: 'CLOSED' }
  );

  await logAudit({
    userId: req.user.userId,
    userName: 'nurse',
    action: `Closed case for Patient ${patientId}`,
    targetType: 'caseclosure',
    targetId: caseClosure._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'ปิดเคสสำเร็จ',
    data: caseClosure,
  });
});

// GET /api/case-closures/nurse/:nurseId - ดึงประวัติการปิดเคสของพยาบาล
export const getNurseCaseClosures = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const closures = await CaseClosure.find({ nurseId })
    .populate('patientId', 'firstName lastName hn')
    .sort({ closedAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: closures,
  });
});

// GET /api/case-closures/count/nurse/:nurseId - นับจำนวนเคสที่ปิด
export const getNurseCaseClosureCount = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const count = await CaseClosure.countDocuments({ nurseId });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

export default {
  createCaseClosure,
  getNurseCaseClosures,
  getNurseCaseClosureCount,
};
