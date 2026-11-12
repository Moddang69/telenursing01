import { body } from 'express-validator';

export const giveConsentValidator = [
  body('type').isIn(['PATIENT_DATA_CONSENT', 'NURSE_CONFIDENTIALITY']).withMessage('type ไม่ถูกต้อง'),
  body('version').notEmpty().withMessage('กรุณาระบุ version'),
];

export const withdrawConsentValidator = [
  body('withdrawReason').optional().isString(),
];
