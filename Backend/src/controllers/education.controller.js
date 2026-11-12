import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Education } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';
import notificationService from '../services/notification.service.js';

/**
 * education.controller.js
 * Map ตรงกับ NurseEducationAssignPage.jsx (assign by nurse) และ PatientEducationPage.jsx (update status)
 */

// POST /api/educations/:patientId  (Nurse only)
export const assignEducation = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { category, title, description, contentUrl } = req.body;
  const nurseId = req.user.roleRefId;

  const education = await Education.create({
    patientId,
    nurseId,
    category,
    title,
    description: description || null,
    contentUrl: contentUrl || null,
    status: 'ASSIGNED',
    assignedAt: new Date(),
  });

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Assigned Education "${title}" to Patient ${patientId}`,
    targetType: 'education',
    targetId: education._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  notificationService
    .notifyEducationAssigned({ patientId, education, actor: req.user })
    .catch((err) => console.error('notify education failed: - education.controller.js:41', err.message));

  res.status(201).json({ success: true, message: 'มอบหมายสื่อการศึกษาสำเร็จ', data: education });
});

// GET /api/educations/:patientId
export const getEducations = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { status } = req.query;

  const filter = { patientId };
  if (status) filter.status = status;

  const items = await Education.find(filter).sort({ assignedAt: -1 });
  res.status(200).json({ success: true, data: items });
});

// PATCH /api/educations/:patientId/:educationId/status  (Patient/Caregiver อัปเดตความคืบหน้าของตนเอง)
export const updateEducationStatus = asyncHandler(async (req, res) => {
  const { educationId } = req.params;
  const { status } = req.body;

  const updates = { status };
  if (status === 'COMPLETED') updates.completedAt = new Date();

  const education = await Education.findByIdAndUpdate(educationId, { $set: updates }, { new: true });
  if (!education) throw new ApiError(404, 'ไม่พบข้อมูลสื่อการศึกษานี้');

  res.status(200).json({ success: true, message: 'อัปเดตสถานะสำเร็จ', data: education });
});

export default { assignEducation, getEducations, updateEducationStatus };