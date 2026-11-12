import { Appointment, Patient, Nurse, Caregiver, CaregiverLink, NotificationSetting } from '../models/index.js';
import { ACTIVE_APPOINTMENT_STATUSES, MAX_OFFSET_MINUTES } from '../constants/notification.js';
import { computeDueReminders, formatDateTimeTh, whenText } from './reminderRules.js';
import { createNotifications, LINKS } from './notification.service.js';

/**
 * notificationScheduler.js — ตัวตั้งเวลาแจ้งเตือนล่วงหน้าก่อนวิดีโอคอล
 * ทุก 1 นาที: ดูนัดหมายที่จะถึงภายใน 4 สัปดาห์ → หาว่าผู้รับ (ผู้ป่วย/ผู้ดูแล/พยาบาล) คนไหนถึงเวลาเตือนตามที่ตั้งไว้ → สร้างการแจ้งเตือน
 * กันแจ้งซ้ำด้วย dedupeKey (นัดหมาย + ผู้รับ + ช่วงเวลา) จึงรันซ้ำ/รีสตาร์ทเซิร์ฟเวอร์ได้อย่างปลอดภัย
 * (รันใน process เดียวกับเซิร์ฟเวอร์ — ถ้าขยายเป็นหลายเครื่อง ให้รันตัวตั้งเวลาเพียงเครื่องเดียว)
 */

const TICK_MS = 60 * 1000;
const fullName = (d) => (d ? `${d.firstName || ''} ${d.lastName || ''}`.trim() : '');

export async function runReminderCheck(now = new Date()) {
  const from = new Date(now.getTime() - 5 * 60 * 1000);
  const to = new Date(now.getTime() + (MAX_OFFSET_MINUTES + 1) * 60 * 1000);

  const appointments = await Appointment.find({
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    dueDateTime: { $gte: from, $lte: to },
  }).select('patientId nurseId dueDateTime createdAt');
  if (!appointments.length) return 0;

  const patientIds = [...new Set(appointments.map((a) => String(a.patientId)))];
  const nurseIds = [...new Set(appointments.map((a) => String(a.nurseId)))];

  const [patients, nurses, links] = await Promise.all([
    Patient.find({ _id: { $in: patientIds } }).select('userId firstName lastName'),
    Nurse.find({ _id: { $in: nurseIds } }).select('userId firstName lastName'),
    CaregiverLink.find({ patientId: { $in: patientIds }, status: 'ACTIVE' }).select('patientId caregiverId permissions'),
  ]);
  const caregivers = links.length
    ? await Caregiver.find({ _id: { $in: links.map((l) => l.caregiverId) } }).select('userId')
    : [];

  const patientMap = new Map(patients.map((p) => [String(p._id), p]));
  const nurseMap = new Map(nurses.map((n) => [String(n._id), n]));
  const caregiverUser = new Map(caregivers.map((c) => [String(c._id), c.userId]));

  // รวมผู้รับของแต่ละนัด
  const recipientsByAppt = new Map();
  const allUserIds = new Set();
  for (const a of appointments) {
    const recipients = [];
    const patient = patientMap.get(String(a.patientId));
    const nurse = nurseMap.get(String(a.nurseId));
    if (patient?.userId) recipients.push({ userId: String(patient.userId), role: 'patient' });
    for (const l of links) {
      if (String(l.patientId) !== String(a.patientId)) continue;
      if (l.permissions?.viewAppointment === false) continue;
      const uid = caregiverUser.get(String(l.caregiverId));
      if (uid) recipients.push({ userId: String(uid), role: 'caregiver' });
    }
    if (nurse?.userId) recipients.push({ userId: String(nurse.userId), role: 'nurse' });
    recipients.forEach((r) => allUserIds.add(r.userId));
    recipientsByAppt.set(String(a._id), recipients);
  }

  const settingDocs = await NotificationSetting.find({ userId: { $in: [...allUserIds] } });
  const settingsByUser = new Map(
    settingDocs.map((s) => [
      String(s.userId),
      { enabled: s.videoCall?.enabled !== false, reminders: s.videoCall?.reminders || [], updatedAt: s.updatedAt },
    ])
  );

  const entries = [];
  for (const a of appointments) {
    const due = computeDueReminders({
      appointment: a,
      recipients: recipientsByAppt.get(String(a._id)) || [],
      settingsByUser,
      now,
    });
    if (!due.length) continue;

    const patientName = fullName(patientMap.get(String(a.patientId)));
    const nurseName = fullName(nurseMap.get(String(a.nurseId)));
    const when = formatDateTimeTh(a.dueDateTime);

    for (const d of due) {
      const lead = whenText(d.offsetMinutes);
      let body;
      let link;
      if (d.role === 'patient') {
        body = `วิดีโอคอลกับ ${nurseName} ${lead} (${when})`;
        link = LINKS.patientHome;
      } else if (d.role === 'caregiver') {
        body = `วิดีโอคอลของ ${patientName} กับ ${nurseName} ${lead} (${when})`;
        link = LINKS.caregiverHome;
      } else {
        body = `วิดีโอคอลกับ ${patientName} ${lead} (${when})`;
        link = LINKS.nurseAppointments;
      }
      entries.push({
        userId: d.userId,
        type: 'APPOINTMENT_REMINDER',
        title: d.offsetMinutes === 0 ? 'ถึงเวลาวิดีโอคอลแล้ว' : 'ใกล้ถึงเวลาวิดีโอคอล',
        body,
        link,
        data: { appointmentId: String(a._id), offsetMinutes: d.offsetMinutes },
        dedupeKey: d.dedupeKey,
      });
    }
  }

  const created = await createNotifications(entries);
  return created.length;
}

let timer = null;
let running = false;

async function tick() {
  if (running) return; // กันรันซ้อนถ้ารอบก่อนยังไม่จบ
  running = true;
  try {
    const n = await runReminderCheck(new Date());
    if (n > 0) console.log(`🔔 ส่งการแจ้งเตือนล่วงหน้า ${n} รายการ - notificationScheduler.js:121`);
  } catch (err) {
    console.error('Reminder scheduler error: - notificationScheduler.js:123', err.message);
  } finally {
    running = false;
  }
}

export function startReminderScheduler() {
  if (timer) return;
  setTimeout(tick, 5000); // รันครั้งแรกหลังเริ่มเซิร์ฟเวอร์ 5 วินาที
  timer = setInterval(tick, TICK_MS);
  timer.unref?.();
}

export function stopReminderScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

export default { startReminderScheduler, stopReminderScheduler, runReminderCheck };