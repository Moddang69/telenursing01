import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * validateRequest.js (Phase 5 middleware/validateRequest.js)
 * รวบรวม error จาก express-validator (ที่ผูกไว้ใน validators/*.js) แล้วโยน ApiError 422
 * ต้อง Enforce ฝั่ง Backend เสมอ — ห้ามเชื่อ Frontend validation อย่างเดียว (Phase 4.2)
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ApiError(422, 'ข้อมูลที่ส่งมาไม่ถูกต้อง', details));
  }
  next();
}

export default validateRequest;
