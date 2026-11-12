import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * generateToken.js
 * สร้าง JWT ตาม Phase 4.3 — Payload มีเฉพาะ userId, role, roleRefId
 * ห้ามใส่ข้อมูลสุขภาพหรือข้อมูลอ่อนไหวใน Token เด็ดขาด
 */
export function generateToken({ userId, role, roleRefId }) {
  return jwt.sign(
    { userId, role, roleRefId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export default generateToken;
