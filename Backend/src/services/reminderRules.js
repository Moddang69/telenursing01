import { DEFAULT_REMINDER_OFFSETS } from '../constants/notification.js';

/**
 * reminderRules.js — กฎการเตือนล่วงหน้า (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล ทดสอบง่าย)
 */

const MIN = 60 * 1000;

// "1 วัน", "2 สัปดาห์", "30 นาที", "90 นาที"
export function formatDuration(minutes) {
  const units = [
    [10080, 'สัปดาห์'],
    [1440, 'วัน'],
    [60, 'ชั่วโมง'],
    [1, 'นาที'],
  ];
  for (const [size, label] of units) {
    if (minutes % size === 0) return `${minutes / size} ${label}`;
  }
  return `${minutes} นาที`;
}

export const whenText = (offsetMinutes) => (offsetMinutes === 0 ? 'ถึงเวลานัดแล้ว' : `อีก ${formatDuration(offsetMinutes)}`);

// "5 พ.ย. 14:30" เวลาประเทศไทย
export function formatDateTimeTh(date) {
  return new Date(date).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const defaultVideoCallSetting = () => ({ enabled: true, reminders: [...DEFAULT_REMINDER_OFFSETS], updatedAt: null });

/**
 * computeDueReminders — คำนวณว่า ณ เวลานี้ ผู้รับคนไหน "ถึงเวลาต้องเตือน" นัดหมายนี้ด้วย offset ไหนบ้าง
 *
 * เงื่อนไขที่ต้องผ่านทั้งหมด (ต่อผู้รับ ต่อ offset):
 *  1) เปิดการแจ้งเตือนอยู่ และ offset นี้อยู่ในรายการที่ผู้ใช้ตั้งไว้
 *  2) ถึงเวลาแล้ว: now >= due - offset
 *  3) ไม่เลยมานาน: now - sendAt <= grace (1/4 ของ offset แต่อย่างน้อย 5 นาที อย่างมาก 30 นาที — กันรอบตรวจที่พลาดไป
 *     แต่ไม่ให้ "เตือนล่วงหน้า 1 ชั่วโมง" ไปเด้งตอนใกล้ถึงเวลานัดแล้ว) และ offset > 0 ต้องยังไม่เลยเวลานัด (offset 0 เตือนได้ถึง 5 นาทีหลังเวลานัด)
 *  4) ไม่ย้อนหลัง: sendAt ต้องไม่ก่อนเวลาที่สร้างนัดหมาย และไม่ก่อนเวลาที่ผู้ใช้บันทึกการตั้งค่าล่าสุด
 *     (เช่น จองนัดก่อนถึงเวลา 30 นาที จะไม่ถูกเตือน "1 วันก่อน" ย้อนหลัง)
 *
 * @returns {{userId:string, role:string, offsetMinutes:number, dedupeKey:string}[]}
 */
export function computeDueReminders({ appointment, recipients, settingsByUser, now = new Date() }) {
  const due = new Date(appointment.dueDateTime).getTime();
  const nowMs = new Date(now).getTime();
  if (Number.isNaN(due) || nowMs > due + 5 * MIN) return [];

  const createdAtMs = appointment.createdAt ? new Date(appointment.createdAt).getTime() : 0;
  const result = [];

  for (const r of recipients) {
    const userId = String(r.userId);
    const setting = settingsByUser.get(userId) || defaultVideoCallSetting();
    if (!setting.enabled) continue;

    const settingsAtMs = setting.updatedAt ? new Date(setting.updatedAt).getTime() : 0;
    const lowerBound = Math.max(createdAtMs, settingsAtMs);

    for (const offset of new Set(setting.reminders || [])) {
      const sendAt = due - offset * MIN;
      if (nowMs < sendAt) continue;
      const grace = Math.max(5 * MIN, Math.min((offset * MIN) / 4, 30 * MIN));
      if (nowMs - sendAt > grace) continue;
      if (offset > 0 && nowMs > due) continue;
      if (sendAt < lowerBound) continue;

      result.push({
        userId,
        role: r.role,
        offsetMinutes: offset,
        dedupeKey: `reminder:${appointment._id}:${userId}:${offset}:${due}`,
      });
    }
  }
  return result;
}