/**
 * constants/retention.js — นโยบายอายุการเก็บข้อมูลแต่ละประเภท (Data Retention Policy)
 *
 * PERMANENT_MODELS : เก็บถาวร ระบบไม่ลบอัตโนมัติ (ลบได้เฉพาะแอดมิน/ระบบแบบแมนนวล)
 * RETENTION_RULES  : กฎลบอัตโนมัติ — 1 โมเดลมีได้หลายกฎ (แยกด้วย filter)
 *   name   : ชื่อกฎ ใช้สร้างชื่อ env สำหรับปรับจำนวนวัน → RETENTION_DAYS_<name>
 *   model  : ชื่อโมเดลใน models/index.js
 *   days   : จำนวนวันที่เก็บ
 *   field  : ฟิลด์วันที่ที่ใช้นับอายุ (ค่าเริ่มต้น createdAt)
 *   filter : เงื่อนไขเพิ่มเติม (ไม่ใส่ = ทุกเอกสารของโมเดลนั้น)
 *
 * ไม่รวม Otp: ใช้ TTL Index บน expiresAt (ลบทันทีที่หมดอายุ 3 นาที) ใน models/Otp.js เหมือนเดิม
 */
import '../config/env.js'; // โหลด dotenv ก่อนอ่าน process.env ด้านล่าง

export const PERMANENT_MODELS = [
  'User', 'Patient', 'Nurse', 'Caregiver', 'CareTeam', 'CaregiverLink', 'CarePlan', 'Education', 'Consent',
];

// ผลตรวจแล็บที่วัดห่างกันเป็นเดือน — เก็บนานกว่าบันทึกสุขภาพรายวัน
const LAB_TYPES = ['HBA1C', 'LDL'];

// ลบเฉพาะคำขอที่ดำเนินการเสร็จแล้ว — คำขอที่ยังค้างอยู่ห้ามหายไปเฉยๆ
const FINISHED_DATA_REQUEST = { status: { $in: ['COMPLETED', 'REJECTED'] } };

export const RETENTION_RULES = [
  // ---------- 31 วัน ----------
  { name: 'HEALTH_RECORD', model: 'HealthRecord', days: 31, filter: { type: { $nin: LAB_TYPES } } }, // SMBG, BLOOD_PRESSURE
  { name: 'MEAL_LOG', model: 'MealLog', days: 31 },
  { name: 'EXERCISE_LOG', model: 'ExerciseLog', days: 31 },
  // Appointment นับจากวันเวลานัด ไม่ใช่วันที่สร้าง ไม่งั้นนัดล่วงหน้าเกิน 31 วันจะถูกลบก่อนถึงวันนัด
  { name: 'APPOINTMENT', model: 'Appointment', days: 31, field: 'dueDateTime' },
  { name: 'VIDEO_SESSION', model: 'VideoSession', days: 31 },

  // ---------- 200 วัน ----------
  { name: 'HEALTH_RECORD_LAB', model: 'HealthRecord', days: 200, filter: { type: { $in: LAB_TYPES } } }, // HbA1c, LDL

  // ---------- 90 วัน ----------
  { name: 'MESSAGE', model: 'Message', days: 90, field: 'sentAt' },
  { name: 'DATA_REQUEST', model: 'DataRequest', days: 90, filter: FINISHED_DATA_REQUEST },
  { name: 'AUDIT_LOG', model: 'AuditLog', days: 90 },
];

function readOverride(name) {
  const key = `RETENTION_DAYS_${name}`;
  const raw = process.env[key];
  if (raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    console.warn(`[RETENTION] ค่า ${key}="${raw}" ไม่ถูกต้อง (ต้องเป็นจำนวนเต็ม ≥ 1) — ใช้ค่าเริ่มต้นแทน`);
    return null;
  }
  return n;
}

/** กฎที่ใช้งานจริง (รวมค่า override จาก env แล้ว) */
export function getEffectiveRules() {
  return RETENTION_RULES.map((r) => ({
    ...r,
    days: readOverride(r.name) ?? r.days,
    field: r.field || 'createdAt',
    filter: r.filter || {},
  }));
}