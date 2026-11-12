import asyncHandler from '../utils/asyncHandler.js';
import careTeamService from '../services/careTeam.service.js';
import { logAudit } from '../middleware/auditLogger.js';
import { Nurse } from '../models/index.js';

/**
 * careTeam.controller.js
 * Map ตรงกับ SelectNursePage.jsx -> assignmentService (Assumption A9)
 * และ AdminPatientManagementPage.jsx -> reassign
 */

// GET /api/nurses/available
export const getAvailableNurses = asyncHandler(async (req, res) => {
  const nurses = await careTeamService.getAvailableNurses();
  res.status(200).json({ success: true, data: nurses });
});

// POST /api/assignments  (body: { patientId, nurseId })
// ใช้ทั้ง Patient เลือก Nurse ครั้งแรก และ Admin Reassign (Role check ทำใน route)
export const createAssignment = asyncHandler(async (req, res) => {
  const { patientId, nurseId, reason } = req.body;

  const careTeam = await careTeamService.assignNurse({
    patientId,
    nurseId,
    assignedByUserId: req.user.userId,
    reason: reason || (req.user.role === 'admin' ? 'Reassigned by admin' : 'Initial assignment'),
  });

  const nurse = await Nurse.findById(nurseId).select('firstName lastName');

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Assigned Nurse ${nurse.firstName} ${nurse.lastName} to Patient ${patientId}`,
    targetType: 'patient',
    targetId: patientId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: 'มอบหมายพยาบาลสำเร็จ', data: careTeam });
});

export default { getAvailableNurses, createAssignment };
