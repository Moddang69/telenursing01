import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { User, Patient, Nurse, Caregiver, AuditLog, CareTeam, DataRequest } from '../models/index.js';
import careTeamService from '../services/careTeam.service.js';
import { logAudit } from '../middleware/auditLogger.js';

// GET /api/admin/users
export const listUsers = asyncHandler(async (req, res) => {
  const { role, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.accountStatus = status;

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: users });
});

// GET /api/admin/nurses/pending  (รายการพยาบาลที่รออนุมัติ)
export const listPendingNurses = asyncHandler(async (req, res) => {
  const nurses = await Nurse.find({ approvalStatus: 'PENDING_APPROVAL' });
  res.status(200).json({ success: true, data: nurses });
});

// GET /api/admin/nurses  (รายการพยาบาลทั้งหมด — ใช้โดย AdminNurseManagementPage.jsx และ dropdown เลือกพยาบาลใหม่)
// เพิ่มใหม่: เดิม Frontend เรียก endpoint นี้อยู่แล้วแต่ Backend ยังไม่มี route รองรับ
export const listAllNurses = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && status !== 'ALL') filter.approvalStatus = status;

  const nurses = await Nurse.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: nurses });
});

// GET /api/admin/dashboard-summary  (สรุปตัวเลขสำหรับ AdminDashboardPage.jsx)
// เพิ่มใหม่: เดิม Frontend เรียก endpoint นี้อยู่แล้วแต่ Backend ยังไม่มี route รองรับ
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [totalPatients, totalNurses, pendingApproval, activeAssignments, dataDeletionRequests] = await Promise.all([
    Patient.countDocuments(),
    Nurse.countDocuments(),
    Nurse.countDocuments({ approvalStatus: 'PENDING_APPROVAL' }),
    CareTeam.countDocuments({ status: 'ACTIVE' }),
    DataRequest.countDocuments({ type: 'DATA_DELETION', status: { $in: ['REQUESTED', 'UNDER_REVIEW'] } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPatients,
      totalNurses,
      pendingApproval,
      activeAssignments,
      dataDeletionRequests,
      systemAlerts: 0, // ยังไม่มีระบบ System Alert จริงใน Backend ปัจจุบัน — ใส่ 0 ไว้ก่อนกัน UI พัง
    },
  });
});

// PATCH /api/admin/nurses/:nurseId/approval
export const processNurseApproval = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;
  const { action, reason } = req.body; // action: APPROVED | REJECTED | SUSPENDED | REACTIVATED

  const nurse = await Nurse.findById(nurseId);
  if (!nurse) throw new ApiError(404, 'ไม่พบข้อมูลพยาบาล');

  nurse.approvalStatus = action === 'REACTIVATED' ? 'APPROVED' : action;
  nurse.approvedBy = req.user.userId;
  nurse.approvalHistory.push({ action, reason: reason || null, byAdminId: req.user.userId, at: new Date() });
  await nurse.save();

  // Sync สถานะที่ users ด้วย ถ้า SUSPENDED
  if (action === 'SUSPENDED') {
    await User.findByIdAndUpdate(nurse.userId, { $set: { accountStatus: 'SUSPENDED' } });
  } else if (action === 'REACTIVATED') {
    await User.findByIdAndUpdate(nurse.userId, { $set: { accountStatus: 'ACTIVE' } });
  }

  await logAudit({
    userId: req.user.userId,
    userName: 'admin',
    action: `${action} Nurse ${nurse.firstName} ${nurse.lastName}${reason ? ` - ${reason}` : ''}`,
    targetType: 'nurse',
    targetId: nurseId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: `ดำเนินการ ${action} สำเร็จ`, data: nurse });
});

// GET /api/admin/patients?q=<keyword>  (รายชื่อผู้ป่วยทั้งหมด พร้อมพยาบาลที่ดูแล — รองรับค้นหาด้วยชื่อ/HN)
export const listAllPatients = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = {};
  if (q) {
    const regex = new RegExp(q, 'i');
    filter.$or = [{ firstName: regex }, { lastName: regex }, { hn: regex }];
  }

  const patients = await Patient.find(filter).populate('assignedNurseId', 'firstName lastName').sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: patients });
});

// PATCH /api/admin/patients/:patientId/reassign  (Admin Reassign Nurse)
export const reassignPatientNurse = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { nurseId, reason } = req.body;

  const careTeam = await careTeamService.assignNurse({
    patientId,
    nurseId,
    assignedByUserId: req.user.userId,
    reason: reason || 'Reassigned by admin',
  });

  const nurse = await Nurse.findById(nurseId).select('firstName lastName');

  await logAudit({
    userId: req.user.userId,
    userName: 'admin',
    action: `Changed Patient Assignment for ${patientId} to ${nurse.firstName} ${nurse.lastName}`,
    targetType: 'patient',
    targetId: patientId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'เปลี่ยนพยาบาลผู้ดูแลสำเร็จ', data: careTeam });
});

// PATCH /api/admin/users/:userId/suspend
export const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findByIdAndUpdate(userId, { $set: { accountStatus: 'SUSPENDED' } }, { new: true });
  if (!user) throw new ApiError(404, 'ไม่พบผู้ใช้งาน');

  await logAudit({
    userId: req.user.userId,
    userName: 'admin',
    action: `Suspended User ${user.email}${reason ? ` - ${reason}` : ''}`,
    targetType: 'user',
    targetId: userId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'ระงับบัญชีสำเร็จ', data: user });
});

// GET /api/admin/audit-logs  (Immutable — อ่านอย่างเดียว, filter ตาม query)
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { userId, targetId, result, startDate, endDate, limit } = req.query;

  const filter = {};
  if (userId) filter.userId = userId;
  if (targetId) filter.targetId = targetId;
  if (result) filter.result = result;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit ? parseInt(limit, 10) : 200);

  res.status(200).json({ success: true, data: logs });
});

export default {
  listUsers,
  listPendingNurses,
  listAllNurses,
  getDashboardSummary,
  processNurseApproval,
  listAllPatients,
  reassignPatientNurse,
  suspendUser,
  getAuditLogs,
};
