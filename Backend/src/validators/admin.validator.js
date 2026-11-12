import { body, param, query } from 'express-validator';

export const nurseIdParamValidator = [
  param('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง'),
];

export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const listUsersQueryValidator = [
  query('role').optional().isIn(['patient', 'caregiver', 'nurse', 'admin']),
  query('status').optional().isString(),
];

export const nurseApprovalValidator = [
  ...nurseIdParamValidator,
  body('action').isIn(['APPROVED', 'REJECTED', 'SUSPENDED', 'REACTIVATED']).withMessage('action ไม่ถูกต้อง'),
  body('reason').optional().isString(),
];

export const reassignNurseValidator = [
  ...patientIdParamValidator,
  body('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง'),
  body('reason').optional().isString(),
];
