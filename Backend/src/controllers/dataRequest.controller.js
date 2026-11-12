import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { DataRequest, Patient, User } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';

// POST /api/data-requests  (Patient only)
export const createDataRequest = asyncHandler(async (req, res) => {
  const { type, reason, requestedFields, requestedNurseId } = req.body;
  const patientId = req.user.roleRefId;

  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');

  const dataRequest = await DataRequest.create({
    type,
    patientId,
    requestedFields: requestedFields || [],
    currentNurseId: type === 'NURSE_CHANGE' ? patient.assignedNurseId : null,
    // 🔧 เพิ่มใหม่: บันทึกพยาบาลที่ผู้ป่วยต้องการเปลี่ยนไปหา (เดิมไม่มีการเก็บค่านี้เลย)
    requestedNurseId: type === 'NURSE_CHANGE' ? requestedNurseId : null,
    reason: reason || null,
    status: 'REQUESTED',
    requestedAt: new Date(),
  });

  await logAudit({
    userId: req.user.userId,
    userName: `${patient.firstName} ${patient.lastName}`,
    action: `Created Data Request: ${type}`,
    targetType: 'datarequest',
    targetId: dataRequest._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: 'ส่งคำขอสำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ', data: dataRequest });
});

// GET /api/data-requests/my  (Patient ดูคำขอของตนเอง)
export const getMyDataRequests = asyncHandler(async (req, res) => {
  const requests = await DataRequest.find({ patientId: req.user.roleRefId })
    .populate('requestedNurseId', 'firstName lastName')
    .populate('currentNurseId', 'firstName lastName')
    .sort({ requestedAt: -1 });
  res.status(200).json({ success: true, data: requests });
});

// GET /api/data-requests  (Admin — ดูทั้งหมด, filter by status/type)
export const getAllDataRequests = asyncHandler(async (req, res) => {
  const { status, type } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const requests = await DataRequest.find(filter)
    .populate('patientId', 'firstName lastName hn')
    .populate('currentNurseId', 'firstName lastName')
    .populate('requestedNurseId', 'firstName lastName') // 🔧 เพิ่มใหม่ ให้ Admin เห็นชื่อพยาบาลที่ผู้ป่วยต้องการเปลี่ยนไปหา
    .sort({ requestedAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

// PATCH /api/data-requests/:requestId/process  (Admin only)
export const processDataRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { decision, adminNote } = req.body; // decision: CONFIRMED | REJECTED

  const dataRequest = await DataRequest.findById(requestId);
  if (!dataRequest) throw new ApiError(404, 'ไม่พบคำขอนี้');

  dataRequest.status = decision === 'CONFIRMED' ? 'CONFIRMED' : 'REJECTED';
  dataRequest.processedBy = req.user.userId;
  dataRequest.processedAt = new Date();
  await dataRequest.save();

  // Execute side-effect ตาม type เมื่ออนุมัติ (CONFIRMED)
  if (decision === 'CONFIRMED') {
    if (dataRequest.type === 'CONSENT_WITHDRAWAL') {
      await Patient.findByIdAndUpdate(dataRequest.patientId, { $set: { consentStatus: 'CONSENT_WITHDRAWN' } });
    }
    if (dataRequest.type === 'DATA_DELETION') {
      // Prototype: mark เป็น COMPLETED — Production ต้องมี Data Retention Policy ก่อนลบจริง (CONFIGURABLE)
      dataRequest.status = 'COMPLETED';
      await dataRequest.save();
    }
    // NURSE_CHANGE: Admin จะเรียก assignment endpoint แยกเพื่อมอบหมายพยาบาลใหม่ต่อไป
  }

  await logAudit({
    userId: req.user.userId,
    userName: 'admin',
    action: `Processed Data Request ${requestId} (${decision})${adminNote ? ` - ${adminNote}` : ''}`,
    targetType: 'datarequest',
    targetId: requestId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'ดำเนินการคำขอสำเร็จ', data: dataRequest });
});

export default { createDataRequest, getMyDataRequests, getAllDataRequests, processDataRequest };
