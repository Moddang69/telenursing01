import { body, param } from 'express-validator';

/**
 * carePlan.validator.js — ตรงกับ NurseCarePlanFormPage.jsx / CaregiverCarePlanView.jsx
 */
export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const carePlanIdParamValidator = [
  param('carePlanId').isMongoId().withMessage('carePlanId ไม่ถูกต้อง'),
];

export const createCarePlanValidator = [
  ...patientIdParamValidator,
  body('goal').notEmpty().withMessage('กรุณาระบุเป้าหมาย'),
  body('action').notEmpty().withMessage('กรุณาระบุแนวทางปฏิบัติ'),
  body('frequency').notEmpty().withMessage('กรุณาระบุความถี่'),
  body('target').notEmpty().withMessage('กรุณาระบุเป้าหมายที่วัดผลได้'),
  body('startDate').isISO8601().withMessage('startDate ไม่ถูกต้อง'),
  body('dueDate').isISO8601().withMessage('dueDate ไม่ถูกต้อง'),
];

export const updateCarePlanValidator = [
  ...carePlanIdParamValidator,
  body('goal').optional().notEmpty(),
  body('action').optional().notEmpty(),
  body('frequency').optional().notEmpty(),
  body('target').optional().notEmpty(),
  body('dueDate').optional().isISO8601(),
  body('status').optional().isIn(['ACTIVE', 'COMPLETED', 'PAUSED', 'EXPIRED']),
];
