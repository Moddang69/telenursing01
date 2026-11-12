import { computeDueReminders, formatDuration, whenText } from '../../src/services/reminderRules.js';
import { validateReminderOffsets, DEFAULT_REMINDER_OFFSETS, MAX_REMINDERS } from '../../src/constants/notification.js';

const MIN = 60 * 1000;
const H = 60 * MIN;
const D = 24 * H;
const due = new Date('2026-11-10T07:30:00Z').getTime();
const appt = { _id: 'A1', dueDateTime: new Date(due), createdAt: new Date(due - 10 * D) };
const recipients = [{ userId: 'u1', role: 'patient' }];
const run = (nowMs, settings = new Map(), a = appt, r = recipients) =>
  computeDueReminders({ appointment: a, recipients: r, settingsByUser: settings, now: new Date(nowMs) });
const offsets = (list) => list.map((x) => x.offsetMinutes).join();

describe('notification constants / validation', () => {
  test('ค่าต้นแบบคือ 1 วัน และ 1 ชั่วโมง', () => {
    expect(DEFAULT_REMINDER_OFFSETS).toEqual([1440, 60]);
    expect(MAX_REMINDERS).toBe(3);
  });

  test('รับค่าที่ถูกต้อง (0 นาที ถึง 4 สัปดาห์, ไม่เกิน 3 ค่า)', () => {
    expect(validateReminderOffsets([1440, 60])).toBeNull();
    expect(validateReminderOffsets([])).toBeNull();
    expect(validateReminderOffsets([0, 40320])).toBeNull();
  });

  test('ปฏิเสธค่าที่ไม่ถูกต้อง', () => {
    expect(validateReminderOffsets([1, 2, 3, 4])).not.toBeNull();
    expect(validateReminderOffsets([40321])).not.toBeNull();
    expect(validateReminderOffsets([-1])).not.toBeNull();
    expect(validateReminderOffsets([1.5])).not.toBeNull();
    expect(validateReminderOffsets([60, 60])).not.toBeNull();
    expect(validateReminderOffsets('60')).not.toBeNull();
  });
});

describe('reminderRules — formatDuration / whenText', () => {
  test('แปลงนาทีเป็นข้อความไทย', () => {
    expect(formatDuration(1440)).toBe('1 วัน');
    expect(formatDuration(60)).toBe('1 ชั่วโมง');
    expect(formatDuration(30)).toBe('30 นาที');
    expect(formatDuration(20160)).toBe('2 สัปดาห์');
    expect(formatDuration(90)).toBe('90 นาที');
    expect(whenText(0)).toBe('ถึงเวลานัดแล้ว');
    expect(whenText(60)).toBe('อีก 1 ชั่วโมง');
  });
});

describe('reminderRules — computeDueReminders', () => {
  test('ค่าต้นแบบ: เตือน 1 วัน และ 1 ชั่วโมงก่อนนัด ตามเวลา', () => {
    expect(offsets(run(due - D))).toBe('1440');
    expect(offsets(run(due - H))).toBe('60');
    expect(run(due - 2 * D)).toHaveLength(0);
  });

  test('ไม่เตือนช้าเกินไป (ไม่ให้เด้งตอนใกล้/ถึงเวลานัด)', () => {
    expect(run(due - D + 3 * MIN)).toHaveLength(1); // พลาดไป 3 นาทียังเตือน
    expect(run(due - H + 20 * MIN)).toHaveLength(0);
    expect(run(due)).toHaveLength(0);
    expect(run(due - D + 2 * H)).toHaveLength(0);
    expect(run(due + 10 * MIN)).toHaveLength(0);
  });

  test('ตั้ง 0 นาที = เตือนตอนถึงเวลานัด (และอีกไม่เกิน 5 นาที)', () => {
    const s = new Map([['u1', { enabled: true, reminders: [0], updatedAt: new Date(due - D) }]]);
    expect(run(due, s)).toHaveLength(1);
    expect(run(due + 4 * MIN, s)).toHaveLength(1);
    expect(run(due + 6 * MIN, s)).toHaveLength(0);
  });

  test('ตั้งได้ 3 ครั้ง แต่ละครั้งเตือนตามเวลาของตัวเองเท่านั้น', () => {
    const s = new Map([['u1', { enabled: true, reminders: [10080, 30, 10], updatedAt: null }]]);
    expect(offsets(run(due - 10080 * MIN, s))).toBe('10080');
    expect(offsets(run(due - 30 * MIN, s))).toBe('30');
    expect(offsets(run(due - 10 * MIN, s))).toBe('10');
  });

  test('ปิดการแจ้งเตือน = ไม่เตือน', () => {
    const s = new Map([['u1', { enabled: false, reminders: [1440, 60], updatedAt: null }]]);
    expect(run(due - D, s)).toHaveLength(0);
  });

  test('ไม่เตือนย้อนหลัง: จองนัดใกล้เวลา หรือเพิ่งบันทึกการตั้งค่าหลังเวลาที่ควรเตือน', () => {
    const late = { ...appt, createdAt: new Date(due - 30 * MIN) };
    expect(run(due - 25 * MIN, new Map(), late)).toHaveLength(0);
    const s = new Map([['u1', { enabled: true, reminders: [1440], updatedAt: new Date(due - 20 * H) }]]);
    expect(run(due - D + 5 * MIN, s)).toHaveLength(0);
  });

  test('dedupeKey คงที่ต่อ นัดหมาย/ผู้รับ/ช่วงเวลา/เวลานัด (เลื่อนนัดแล้วเตือนใหม่ได้)', () => {
    expect(run(due - D)[0].dedupeKey).toBe(`reminder:A1:u1:1440:${due}`);
    const moved = { ...appt, dueDateTime: new Date(due + D), createdAt: new Date(due - 10 * D) };
    expect(run(due + D - D, new Map(), moved)[0].dedupeKey).not.toBe(run(due - D)[0].dedupeKey);
  });

  test('ผู้รับแต่ละคนใช้การตั้งค่าของตัวเอง', () => {
    const multi = [
      { userId: 'u1', role: 'patient' },
      { userId: 'u2', role: 'caregiver' },
      { userId: 'u3', role: 'nurse' },
    ];
    const s = new Map([
      ['u2', { enabled: false, reminders: [1440], updatedAt: null }],
      ['u3', { enabled: true, reminders: [60], updatedAt: null }],
    ]);
    const r = run(due - H, s, appt, multi);
    expect(r.map((x) => x.userId).sort()).toEqual(['u1', 'u3']);
  });
});