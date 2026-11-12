/**
 * reminderOffsets.js — แปลง/แสดงเวลา "แจ้งเตือนล่วงหน้า" (เก็บเป็นนาที) ให้ตรงกับตัวเลือกใน UI
 * ช่วงที่ตั้งได้: 0 นาที – 4 สัปดาห์  (ตรงกับ Backend: constants/notification.js)
 */

export const MAX_REMINDERS = 3;
export const MAX_OFFSET_MINUTES = 40320; // 4 สัปดาห์

export const PRESETS = [
  { minutes: 10, label: '10 นาทีก่อนกิจกรรม' },
  { minutes: 30, label: '30 นาทีก่อนกิจกรรม' },
  { minutes: 60, label: '1 ชั่วโมงก่อนกิจกรรม' },
  { minutes: 1440, label: '1 วันก่อนกิจกรรม' },
];

// ตัวเลือกหน่วยของ "กำหนดเอง" — max คือค่าสูงสุดของตัวเลขเมื่อเลือกหน่วยนั้น (ทุกหน่วยไม่เกิน 4 สัปดาห์)
export const UNITS = [
  { key: 'minute', label: 'นาที', size: 1, max: 60 },
  { key: 'hour', label: 'ชั่วโมง', size: 60, max: 24 },
  { key: 'day', label: 'วัน', size: 1440, max: 28 },
  { key: 'week', label: 'สัปดาห์', size: 10080, max: 4 },
];

export const DEFAULT_REMINDERS = [1440, 60]; // ค่าต้นแบบ: 1 วัน และ 1 ชั่วโมง

export const unitByKey = (key) => UNITS.find((u) => u.key === key) || UNITS[0];

export const fromParts = (value, unitKey) => value * unitByKey(unitKey).size;

// นาที → { value, unit } โดยเลือกหน่วยใหญ่ที่สุดที่หารลงตัวและอยู่ในช่วงของหน่วยนั้น
export function toParts(minutes) {
  if (!minutes) return { value: 0, unit: 'minute' };
  for (const unit of [...UNITS].reverse()) {
    if (minutes % unit.size === 0) {
      const value = minutes / unit.size;
      if (value >= 1 && value <= unit.max) return { value, unit: unit.key };
    }
  }
  return { value: Math.min(minutes, 60), unit: 'minute' }; // ค่านอกช่วงที่ UI เลือกได้ (ไม่น่าเกิดขึ้น)
}

export function describeOffset(minutes) {
  if (minutes === 0) return 'ตรงเวลาที่เริ่มกิจกรรม';
  const preset = PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  const { value, unit } = toParts(minutes);
  return `${value} ${unitByKey(unit).label}ก่อนกิจกรรม`;
}

// สั้นๆ สำหรับสรุป เช่น "1 วัน, 1 ชั่วโมง"
export function describeShort(minutes) {
  if (minutes === 0) return 'ตรงเวลานัด';
  const { value, unit } = toParts(minutes);
  return `${value} ${unitByKey(unit).label}`;
}

// ตัวเลือกสำเร็จรูปแรกที่ยังไม่ถูกใช้ — ใช้ตอนกด "เพิ่มการแจ้งเตือน"
export function nextFreeOffset(existing) {
  const free = PRESETS.find((p) => !existing.includes(p.minutes));
  if (free) return free.minutes;
  for (let m = 5; m <= 60; m += 5) if (!existing.includes(m)) return m;
  return 0;
}

export function summarize(settings) {
  if (!settings?.enabled) return 'ปิดอยู่';
  if (!settings.reminders?.length) return 'เปิดอยู่ · ยังไม่ได้ตั้งเวลาล่วงหน้า';
  return `เปิดอยู่ · ${[...settings.reminders].sort((a, b) => b - a).map(describeShort).join(', ')}`;
}