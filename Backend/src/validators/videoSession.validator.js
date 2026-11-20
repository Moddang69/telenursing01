import { body, param } from 'express-validator';

export const appointmentIdParamValidator = [
  param('appointmentId').isMongoId().withMessage('appointmentId ไม่ถูกต้อง'),
];

export const endVideoSessionValidator = [
  ...appointmentIdParamValidator,
  body('consultationNote').optional().isString().isLength({ max: 5000 }),
  body('wasConnected').optional().isBoolean(),
];
