import { body, param } from 'express-validator';

/**
 * patient.validator.js
 * ตรงกับ PatientRegistrationPage.jsx field ทั้งหมด
 */
export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const updatePatientProfileValidator = [
  ...patientIdParamValidator,
  body('firstName').optional().notEmpty().withMessage('กรุณากรอกชื่อ'),
  body('lastName').optional().notEmpty().withMessage('กรุณากรอกนามสกุล'),
  body('phone').optional().notEmpty().withMessage('กรุณากรอกเบอร์โทรศัพท์'),
  body('address').optional().isString(),
  body('comorbidities').optional().isString(),
  body('drugAllergies').optional().isString(),
];

export const selectNurseValidator = [
  ...patientIdParamValidator,
  body('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง'),
];
