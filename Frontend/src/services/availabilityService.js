import apiClient from '../config/apiClient.js';

/**
 * availabilityService — ตรวจว่าอีเมล / HN / เลขที่ใบอนุญาต ถูกใช้ลงทะเบียนแล้วหรือยัง (GET /api/auth/check-availability)
 * ใช้แสดงผลทันทีหลังผู้ใช้กรอกช่องนั้นเสร็จ โดยไม่ต้องรอกดลงทะเบียน
 * params: { email?, hn?, licenseNumber? } → { email?: {available, verified}, hn?: {available}, licenseNumber?: {available} }
 */
export const availabilityService = {
  async check(params) {
    const res = await apiClient.get('/auth/check-availability', { params });
    return res.data;
  },
};

export default availabilityService;
