import { body } from 'express-validator';

/**
 * auth.validator.js (Phase 4.2 — Password Policy)
 * ตรงกับ Frontend src/utils/validators.js: >=8 ตัว, มีตัวพิมพ์ใหญ่ 1, มีตัวเลข 1
 */
const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
  .matches(/[A-Z]/)
  .withMessage('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .matches(/[0-9]/)
  .withMessage('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');

export const registerValidator = [
  body('email').isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง').normalizeEmail(),
  passwordRule,
  body('role')
    .isIn(['patient', 'caregiver', 'nurse'])
    .withMessage('role ต้องเป็น patient, caregiver หรือ nurse เท่านั้น (admin สร้างผ่านระบบภายในเท่านั้น)'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง').normalizeEmail(),
  body('password').notEmpty().withMessage('กรุณากรอกรหัสผ่าน'),
];

export const requestOtpValidator = [
  body('email').isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง').normalizeEmail(),
  body('purpose').isIn(['REGISTER', 'FORGOT_PASSWORD']).withMessage('purpose ไม่ถูกต้อง'),
];

export const verifyOtpValidator = [
  body('email').isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP ต้องมี 6 หลัก'),
  body('purpose').isIn(['REGISTER', 'FORGOT_PASSWORD']).withMessage('purpose ไม่ถูกต้อง'),
];

export const resetPasswordValidator = [
  body('email').isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง').normalizeEmail(),
  passwordRule,
];
