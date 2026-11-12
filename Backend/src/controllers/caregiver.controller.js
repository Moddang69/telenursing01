import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Caregiver, Patient, CaregiverLink } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';

/**
 * caregiver.controller.js
 * Map ตรงกับ CaregiverLinkPatientPage.jsx (request link), NurseCaregiverApprovalPage.jsx (approve/revoke)
 */

// GET /api/caregivers/:caregiverId
export const getCaregiverProfile = asyncHandler(async (req, res) => {
  const caregiver = await Caregiver.findById(req.params.caregiverId);
  if (!caregiver) throw new ApiError(404, 'ไม่พบข้อมูลผู้ดูแล');
  res.status(200).json({ success: true, data: caregiver });
});

// PATCH /api/caregivers/:caregiverId
export const updateCaregiverProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['phone', 'address', 'secondaryContact'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const caregiver = await Caregiver.findByIdAndUpdate(req.params.caregiverId, { $set: updates }, { new: true });
  if (!caregiver) throw new ApiError(404, 'ไม่พบข้อมูลผู้ดูแล');

  res.status(200).json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: caregiver });
});

// POST /api/caregivers/:caregiverId/links
// ขอเชื่อมโยงกับ Patient โดยระบุ ชื่อ + นามสกุล + เบอร์โทรของผู้ป่วย (ไม่ต้องใช้ HN)
// ต้องตรงกับข้อมูลที่ผู้ป่วยลงทะเบียนไว้ครบทั้ง 3 ค่า และยังต้องรอพยาบาลอนุมัติเสมอ
export const requestCaregiverLink = asyncHandler(async (req, res) => {
  const { caregiverId } = req.params;
  const { patientFirstName, patientLastName, patientPhone, relationship } = req.body;

  // ผู้ดูแลเรียกได้เฉพาะ id ของตนเอง
  if (req.user.role === 'caregiver' && req.user.roleRefId !== caregiverId) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์ส่งคำขอในนามผู้ดูแลท่านอื่น');
  }

  const matches = await Patient.find({
    firstName: patientFirstName.trim(),
    lastName: patientLastName.trim(),
    phone: patientPhone.trim(),
  }).limit(2);

  // ข้อความเดียวกันทั้งกรณี "ไม่พบ" และ "พบมากกว่า 1" เพื่อไม่เปิดเผยข้อมูลผู้ป่วยแก่ผู้ที่เดาข้อมูล
  if (matches.length !== 1) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วยที่ตรงกัน กรุณาตรวจสอบชื่อ นามสกุล และเบอร์โทรศัพท์ของผู้ป่วยอีกครั้ง');
  }
  const patient = matches[0];

  const existing = await CaregiverLink.findOne({
    caregiverId,
    patientId: patient._id,
    status: { $in: ['ACTIVE', 'PENDING_VERIFICATION'] },
  });
  if (existing) throw new ApiError(409, 'มีคำขอเชื่อมโยงกับผู้ป่วยรายนี้อยู่แล้ว');

  const link = await CaregiverLink.create({
    caregiverId,
    patientId: patient._id,
    relationship,
    status: 'PENDING_VERIFICATION',
  });

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Caregiver requested link to Patient ${patient._id}`,
    targetType: 'caregiverlink',
    targetId: link._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: 'ส่งคำขอเชื่อมโยงสำเร็จ รอการอนุมัติจากพยาบาล', data: link });
});

// GET /api/caregivers/:caregiverId/links  (รายการผู้ป่วยที่เชื่อมโยงทั้งหมด)
export const getCaregiverLinks = asyncHandler(async (req, res) => {
  const links = await CaregiverLink.find({ caregiverId: req.params.caregiverId })
    .populate('patientId', 'firstName lastName hn');
  res.status(200).json({ success: true, data: links });
});

// GET /api/patients/:patientId/caregiver-links  (Nurse ดูรายการผู้ดูแลที่ขอเชื่อมโยงกับ patient ใน careteam ตน)
export const getPatientCaregiverLinks = asyncHandler(async (req, res) => {
  const links = await CaregiverLink.find({ patientId: req.params.patientId })
    .populate('caregiverId', 'firstName lastName phone');
  res.status(200).json({ success: true, data: links });
});

// GET /api/admin/caregiver-links/pending  (Admin ดูคำขอเชื่อมโยงผู้ดูแล-ผู้ป่วยทั้งหมดที่รออนุมัติ)
// เดิมมีแค่ Nurse ที่อนุมัติได้ผ่านหน้า Care Team ของตนเอง แต่ยังไม่มีใครกด Approve จริง
// จึงเพิ่มมุมมองระดับ Admin ที่เห็นคำขอ "ทุกคน" ทั่วทั้งระบบในหน้าเดียว (ไม่ต้องผ่าน Care Team ของพยาบาลคนใดคนหนึ่ง)
export const listPendingCaregiverLinks = asyncHandler(async (req, res) => {
  const links = await CaregiverLink.find({ status: 'PENDING_VERIFICATION' })
    .populate('caregiverId', 'firstName lastName phone')
    .populate('patientId', 'firstName lastName hn')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: links });
});

// PATCH /api/caregiver-links/:linkId/approve  (Nurse only)
export const approveCaregiverLink = asyncHandler(async (req, res) => {
  const { linkId } = req.params;
  const { permissions } = req.body;
  const nurseId = req.user.roleRefId;

  const updates = { status: 'ACTIVE', grantedBy: nurseId };
  if (permissions) updates.permissions = permissions;

  const link = await CaregiverLink.findByIdAndUpdate(linkId, { $set: updates }, { new: true });
  if (!link) throw new ApiError(404, 'ไม่พบคำขอเชื่อมโยงนี้');

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Approved Caregiver Link ${linkId}`,
    targetType: 'caregiverlink',
    targetId: linkId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'อนุมัติการเชื่อมโยงสำเร็จ', data: link });
});

// PATCH /api/caregiver-links/:linkId/revoke  (Nurse only)
export const revokeCaregiverLink = asyncHandler(async (req, res) => {
  const { linkId } = req.params;

  const link = await CaregiverLink.findByIdAndUpdate(linkId, { $set: { status: 'REVOKED' } }, { new: true });
  if (!link) throw new ApiError(404, 'ไม่พบการเชื่อมโยงนี้');

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Revoked Caregiver Link ${linkId}`,
    targetType: 'caregiverlink',
    targetId: linkId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'ยกเลิกการเชื่อมโยงสำเร็จ', data: link });
});

// PATCH /api/caregiver-links/:linkId/permissions  (Nurse only)
export const updateCaregiverPermissions = asyncHandler(async (req, res) => {
  const { linkId } = req.params;
  const { permissions } = req.body;

  const link = await CaregiverLink.findByIdAndUpdate(
    linkId,
    { $set: { permissions } },
    { new: true }
  );
  if (!link) throw new ApiError(404, 'ไม่พบการเชื่อมโยงนี้');

  res.status(200).json({ success: true, message: 'อัปเดตสิทธิ์สำเร็จ', data: link });
});

export default {
  getCaregiverProfile,
  updateCaregiverProfile,
  requestCaregiverLink,
  getCaregiverLinks,
  getPatientCaregiverLinks,
  listPendingCaregiverLinks,
  approveCaregiverLink,
  revokeCaregiverLink,
  updateCaregiverPermissions,
};
