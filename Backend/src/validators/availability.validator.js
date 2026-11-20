import { query } from 'express-validator';

/**
 * availability.validator.js — GET /api/auth/check-availability?email=&hn=&licenseNumber=
 * email ใช้ normalizeEmail() ชุดเดียวกับ registerValidator เพื่อให้เทียบกับข้อมูลที่บันทึกตอนลงทะเบียนได้ตรงกัน
 */
export const availabilityValidator = [
  query('email').optional().isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง').normalizeEmail(),
  query('hn').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('HN ไม่ถูกต้อง'),
  query('licenseNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('เลขที่ใบอนุญาตไม่ถูกต้อง'),
];
