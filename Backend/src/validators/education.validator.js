import { body, param } from 'express-validator';

export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const educationIdParamValidator = [
  param('educationId').isMongoId().withMessage('educationId ไม่ถูกต้อง'),
];

export const assignEducationValidator = [
  ...patientIdParamValidator,
  body('category').notEmpty().withMessage('กรุณาระบุหมวดหมู่'),
  body('title').notEmpty().withMessage('กรุณาระบุชื่อเรื่อง'),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('contentUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('ลิงก์สื่อการสอนไม่ถูกต้อง'),
];

export const updateEducationStatusValidator = [
  ...educationIdParamValidator,
  body('status').isIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).withMessage('status ไม่ถูกต้อง'),
];
