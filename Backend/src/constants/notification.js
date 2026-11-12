/**
 * constants/notification.js — ค่าคงที่ของระบบแจ้งเตือน (ไม่พึ่ง Mongoose จึงใช้ร่วมกับเทสต์/ตัวตั้งเวลาได้)
 */

// การแจ้งเตือนล่วงหน้าก่อนวิดีโอคอล: ตั้งได้สูงสุด 3 ครั้ง ช่วง 0 นาที – 4 สัปดาห์
export const MAX_REMINDERS = 3;
export const MAX_OFFSET_MINUTES = 4 * 7 * 24 * 60; // 40320

// ค่าต้นแบบ: 1 วัน และ 1 ชั่วโมงก่อนวิดีโอคอล
export const DEFAULT_REMINDER_OFFSETS = [1440, 60];

export const NOTIFICATION_TYPES = [
  'APPOINTMENT_CREATED', // มีนัดหมายใหม่
  'APPOINTMENT_REMINDER', // เตือนล่วงหน้าก่อนวิดีโอคอล
  'APPOINTMENT_CANCELLED', // นัดหมายถูกยกเลิก (เพิ่มเติม)
  'CARE_PLAN_NEW', // มีแผนการดูแลใหม่
  'EDUCATION_NEW', // มีความรู้สุขภาพใหม่
  'HEALTH_ABNORMAL', // ค่าสุขภาพผิดปกติ (พยาบาล)
];

// สถานะนัดหมายที่ยังไม่สิ้นสุด — ใช้เลือกนัดที่ต้องเตือน
export const ACTIVE_APPOINTMENT_STATUSES = ['SCHEDULED', 'WAITING', 'PATIENT_JOINED', 'NURSE_JOINED', 'IN_CONSULTATION'];

// ตรวจรายการ offset (นาที) — คืนข้อความ error หรือ null ถ้าถูกต้อง
export function validateReminderOffsets(reminders) {
  if (!Array.isArray(reminders)) return 'reminders ต้องเป็นอาร์เรย์';
  if (reminders.length > MAX_REMINDERS) return `ตั้งการแจ้งเตือนล่วงหน้าได้สูงสุด ${MAX_REMINDERS} ครั้ง`;
  for (const m of reminders) {
    if (!Number.isInteger(m) || m < 0 || m > MAX_OFFSET_MINUTES) {
      return 'เวลาแจ้งเตือนล่วงหน้าต้องอยู่ระหว่าง 0 นาที ถึง 4 สัปดาห์';
    }
  }
  if (new Set(reminders).size !== reminders.length) return 'มีเวลาแจ้งเตือนล่วงหน้าซ้ำกัน';
  return null;
}