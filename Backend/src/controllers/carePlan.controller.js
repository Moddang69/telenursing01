import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { CarePlan, Nurse } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';
import notificationService from '../services/notification.service.js';

/**
 * carePlan.controller.js
 * Map ตรงกับ NurseCarePlanFormPage.jsx (create/update by nurse) และ CaregiverCarePlanView.jsx (read)
 * createdBy เก็บชื่อ denormalized ตาม Phase 3.6
 */

// POST /api/care-plans/:patientId  (Nurse only — ต้องผ่าน verifyCareTeamAccess)
export const createCarePlan = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { goal, action, frequency, target, startDate, dueDate } = req.body;
  const nurseId = req.user.roleRefId;

  const nurse = await Nurse.findById(nurseId).select('firstName lastName');
  if (!nurse) throw new ApiError(404, 'ไม่พบข้อมูลพยาบาล');

  const carePlan = await CarePlan.create({
    patientId,
    nurseId,
    goal,
    action,
    frequency,
    target,
    startDate,
    dueDate,
    status: 'ACTIVE',
    createdBy: `${nurse.firstName} ${nurse.lastName}`,
  });

  await logAudit({
    userId: req.user.userId,
    userName: `${nurse.firstName} ${nurse.lastName}`,
    action: `Created Care Plan for Patient ${patientId}`,
    targetType: 'careplan',
    targetId: carePlan._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  notificationService
    .notifyCarePlanCreated({ patientId, carePlan, actor: req.user })
    .catch((err) => console.error('notify care plan failed: - carePlan.controller.js:47', err.message));

  res.status(201).json({ success: true, message: 'สร้างแผนการดูแลสำเร็จ', data: carePlan });
});

// GET /api/care-plans/:patientId  (list — Patient/Caregiver/Nurse/Admin)
export const getCarePlans = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { status } = req.query;

  const filter = { patientId };
  if (status) filter.status = status;

  const plans = await CarePlan.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: plans });
});

// GET /api/care-plans/:patientId/:carePlanId
export const getCarePlanById = asyncHandler(async (req, res) => {
  const plan = await CarePlan.findById(req.params.carePlanId);
  if (!plan) throw new ApiError(404, 'ไม่พบแผนการดูแลนี้');
  res.status(200).json({ success: true, data: plan });
});

// PATCH /api/care-plans/:patientId/:carePlanId  (Nurse only — เจ้าของ Care Team เท่านั้น)
// นโยบาย Retention: แก้ไขแล้ว "เขียนทับ" เอกสารเดิม (ไม่เก็บฉบับเก่า) — CarePlan ที่แก้แล้วจึงไม่มีฉบับเดิมค้างอยู่ และไม่ถูกลบอัตโนมัติ (เก็บถาวร)
export const updateCarePlan = asyncHandler(async (req, res) => {
  const { carePlanId } = req.params;
  const nurseId = req.user.roleRefId;
  const allowedFields = ['goal', 'action', 'frequency', 'target', 'dueDate', 'status'];

  const nurse = await Nurse.findById(nurseId).select('firstName lastName');

  const updates = { updatedBy: `${nurse.firstName} ${nurse.lastName}` };
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const plan = await CarePlan.findByIdAndUpdate(carePlanId, { $set: updates }, { new: true });
  if (!plan) throw new ApiError(404, 'ไม่พบแผนการดูแลนี้');

  await logAudit({
    userId: req.user.userId,
    userName: `${nurse.firstName} ${nurse.lastName}`,
    action: `Updated Care Plan ${carePlanId}`,
    targetType: 'careplan',
    targetId: carePlanId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'อัปเดตแผนการดูแลสำเร็จ', data: plan });
});

export default { createCarePlan, getCarePlans, getCarePlanById, updateCarePlan };