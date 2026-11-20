import { matchedData } from 'express-validator';
import asyncHandler from '../utils/asyncHandler.js';
import { User, Patient, Nurse } from '../models/index.js';

/**
 * availability.controller.js
 * GET /api/auth/check-availability?email=&hn=&licenseNumber=   (สาธารณะ + จำกัดอัตราที่ auth.routes.js)
 * ส่งได้ทีละฟิลด์หรือหลายฟิลด์ → { email?: {available, verified}, hn?: {available}, licenseNumber?: {available} }
 *  - email.verified: false = เคยลงทะเบียนไว้แต่ยังไม่ได้ยืนยัน OTP (หน้าบ้านเสนอให้ไปยืนยันต่อ)
 * ตอบเฉพาะ true/false ไม่คืนข้อมูลส่วนตัวใดๆ
 */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { email, hn, licenseNumber } = matchedData(req, { locations: ['query'] });
  const data = {};

  await Promise.all([
    email &&
      User.findOne({ email })
        .select('emailVerified')
        .lean()
        .then((u) => {
          data.email = { available: !u, verified: u ? !!u.emailVerified : null };
        }),
    hn &&
      Patient.exists({ hn }).then((found) => {
        data.hn = { available: !found };
      }),
    licenseNumber &&
      Nurse.exists({ licenseNumber }).then((found) => {
        data.licenseNumber = { available: !found };
      }),
  ].filter(Boolean));

  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data });
});

export default { checkAvailability };
