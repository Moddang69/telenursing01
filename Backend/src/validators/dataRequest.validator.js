import { body, param } from 'express-validator';

export const requestIdParamValidator = [
  param('requestId').isMongoId().withMessage('requestId ไม่ถูกต้อง'),
];

export const createDataRequestValidator = [
  body('type').isIn(['DATA_DELETION', 'CONSENT_WITHDRAWAL', 'NURSE_CHANGE']).withMessage('type ไม่ถูกต้อง'),
  body('reason').optional().isString(),
  body('requestedFields').optional().isArray(),
  body('requestedNurseId')
    .if(body('type').equals('NURSE_CHANGE'))
    .isMongoId()
    .withMessage('requestedNurseId ไม่ถูกต้อง'),
];

export const processDataRequestValidator = [
  ...requestIdParamValidator,
  body('decision').isIn(['CONFIRMED', 'REJECTED']).withMessage('decision ไม่ถูกต้อง'),
  body('adminNote').optional().isString(),
];
