/**
 * User Roles — ใช้อ้างอิงร่วมกันทั้งระบบ
 * ห้ามเพิ่ม Role ใหม่โดยไม่ทบทวน Permission Matrix ทั้งหมด (ดู Master Prompt Section 8-11)
 */
export const ROLES = Object.freeze({
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  NURSE: 'nurse',
  ADMIN: 'admin',
});