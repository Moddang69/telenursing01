import { body, param } from 'express-validator';

export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const sendMessageValidator = [
  ...patientIdParamValidator,
  body('text').trim().notEmpty().withMessage('กรุณากรอกข้อความ').isLength({ max: 2000 }),
];