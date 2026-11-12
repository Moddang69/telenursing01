import { Notification, Patient, Nurse, Caregiver, CaregiverLink, CareTeam } from '../models/index.js';
import { sendPushToUser } from './push.service.js';
import { formatDateTimeTh } from './reminderRules.js';

/**
 * notification.service.js — สร้างและส่งการแจ้งเตือน
 * ช่องทาง: (1) บันทึกลงฐานข้อมูล แสดงที่กระดิ่ง Header  (2) Socket.io แบบ Realtime ขณะเปิดเว็บ  (3) Web Push แม้ไม่ได้เปิดเว็บ
 *
 * ทุกฟังก์ชัน notify* ถูกเรียกแบบ fire-and-forget จาก Controller (ล้มเหลวต้องไม่ทำให้คำขอหลักพัง)
 */

let ioRef = null;
export const initNotificationService = (io) => {
  ioRef = io;
};

// path ฝั่ง Frontend ที่จะเปิดเมื่อกดการแจ้งเตือน (ตรงกับ ROUTES ใน Frontend/src/constants/routes.js)
export const LINKS = {
  patientHome: '/patient/home',
  patientMyCare: '/patient/my-care',
  caregiverHome: '/caregiver/home',
  caregiverMyCare: '/caregiver/my-care',
  nurseAppointments: '/nurse/appointments',
  nursePatient: (patientId) => `/nurse/patients/${patientId}`,
};

const toClient = (doc) => ({
  id: String(doc._id),
  type: doc.type,
  title: doc.title,
  body: doc.body,
  link: doc.link,
  read: !!doc.read,
  createdAt: doc.createdAt,
});

async function deliver(doc) {
  ioRef?.to(`user-${doc.userId}`).emit('notification', toClient(doc));
  try {
    await sendPushToUser(doc.userId, {
      title: doc.title,
      body: doc.body,
      url: doc.link || '/',
      tag: `n-${doc._id}`,
      notificationId: String(doc._id),
    });
  } catch (err) {
    console.warn('push delivery failed: - notification.service.js:48', err.message);
  }
}

/**
 * createNotifications — entries: [{ userId, type, title, body, link, data, dedupeKey }]
 * ข้ามรายการที่ dedupeKey ซ้ำ (เคยแจ้งแล้ว) โดยไม่ถือเป็น error
 */
export async function createNotifications(entries) {
  const created = [];
  for (const e of entries) {
    if (!e.userId) continue;
    try {
      const doc = await Notification.create({
        userId: e.userId,
        type: e.type,
        title: e.title,
        body: e.body || '',
        link: e.link || null,
        data: e.data || {},
        dedupeKey: e.dedupeKey || undefined,
      });
      created.push(doc);
    } catch (err) {
      if (err?.code === 11000) continue; // เคยแจ้งแล้ว
      console.error('createNotification failed: - notification.service.js:73', err.message);
    }
  }
  await Promise.all(created.map(deliver));
  return created;
}

// ---------- ผู้รับ ----------

const fullName = (d) => (d ? `${d.firstName || ''} ${d.lastName || ''}`.trim() : '');

/**
 * ผู้ป่วย + ผู้ดูแลที่เชื่อมโยง (ACTIVE) — caregiverPermission: ส่งเฉพาะผู้ดูแลที่ได้สิทธิ์ดูเรื่องนั้น (เช่น 'viewCarePlan')
 */
export async function getPatientCircle(patientId, { caregiverPermission = null } = {}) {
  const patient = await Patient.findById(patientId).select('userId firstName lastName');
  const links = await CaregiverLink.find({ patientId, status: 'ACTIVE' }).select('caregiverId permissions');
  const allowed = caregiverPermission ? links.filter((l) => l.permissions?.[caregiverPermission] !== false) : links;
  const caregivers = allowed.length
    ? await Caregiver.find({ _id: { $in: allowed.map((l) => l.caregiverId) } }).select('userId')
    : [];
  return {
    patient,
    patientName: fullName(patient),
    patientUserId: patient?.userId || null,
    caregiverUserIds: caregivers.map((c) => c.userId).filter(Boolean),
  };
}

// พยาบาลที่ดูแลผู้ป่วย (Care Team ACTIVE)
export async function getPatientNurses(patientId) {
  const teams = await CareTeam.find({ patientId, status: 'ACTIVE' }).select('nurseId');
  if (!teams.length) return [];
  return Nurse.find({ _id: { $in: teams.map((t) => t.nurseId) } }).select('userId firstName lastName');
}

// ---------- เหตุการณ์ต่างๆ ----------

// มีนัดหมายใหม่ → ผู้ป่วย + ผู้ดูแล (ยกเว้นคนที่สร้างเอง) และพยาบาล (กรณีผู้ป่วย/ผู้ดูแลเป็นคนจอง)
export async function notifyAppointmentCreated({ appointment, actor }) {
  const nurse = await Nurse.findById(appointment.nurseId).select('userId firstName lastName');
  const circle = await getPatientCircle(appointment.patientId, { caregiverPermission: 'viewAppointment' });
  const when = formatDateTimeTh(appointment.dueDateTime);
  const nurseName = fullName(nurse);
  const key = `appt-created:${appointment._id}`;
  const entries = [];

  if (circle.patientUserId && String(circle.patientUserId) !== String(actor?.userId)) {
    entries.push({
      userId: circle.patientUserId,
      type: 'APPOINTMENT_CREATED',
      title: 'มีการนัดหมายวิดีโอคอลใหม่',
      body: `วิดีโอคอลกับ ${nurseName} วันที่ ${when}`,
      link: LINKS.patientHome,
      data: { appointmentId: String(appointment._id) },
      dedupeKey: `${key}:${circle.patientUserId}`,
    });
  }
  for (const uid of circle.caregiverUserIds) {
    if (String(uid) === String(actor?.userId)) continue;
    entries.push({
      userId: uid,
      type: 'APPOINTMENT_CREATED',
      title: 'มีการนัดหมายวิดีโอคอลใหม่',
      body: `${circle.patientName} มีนัดวิดีโอคอลกับ ${nurseName} วันที่ ${when}`,
      link: LINKS.caregiverHome,
      data: { appointmentId: String(appointment._id) },
      dedupeKey: `${key}:${uid}`,
    });
  }
  if (nurse?.userId && actor?.role !== 'nurse') {
    entries.push({
      userId: nurse.userId,
      type: 'APPOINTMENT_CREATED',
      title: 'มีการนัดหมายวิดีโอคอลใหม่',
      body: `${circle.patientName} นัดวิดีโอคอลวันที่ ${when}`,
      link: LINKS.nurseAppointments,
      data: { appointmentId: String(appointment._id) },
      dedupeKey: `${key}:${nurse.userId}`,
    });
  }
  return createNotifications(entries);
}

// นัดหมายถูกยกเลิก → แจ้งทุกฝ่ายที่เกี่ยวข้อง ยกเว้นคนที่กดยกเลิกเอง (เพิ่มเติมจากที่ขอ)
export async function notifyAppointmentCancelled({ appointment, actor }) {
  const nurse = await Nurse.findById(appointment.nurseId).select('userId firstName lastName');
  const circle = await getPatientCircle(appointment.patientId, { caregiverPermission: 'viewAppointment' });
  const when = formatDateTimeTh(appointment.dueDateTime);
  const key = `appt-cancelled:${appointment._id}`;
  const entries = [];
  const add = (userId, body, link) => {
    if (!userId || String(userId) === String(actor?.userId)) return;
    entries.push({
      userId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'นัดหมายวิดีโอคอลถูกยกเลิก',
      body,
      link,
      data: { appointmentId: String(appointment._id) },
      dedupeKey: `${key}:${userId}`,
    });
  };
  add(circle.patientUserId, `นัดวันที่ ${when} ถูกยกเลิก`, LINKS.patientHome);
  circle.caregiverUserIds.forEach((uid) => add(uid, `นัดของ ${circle.patientName} วันที่ ${when} ถูกยกเลิก`, LINKS.caregiverHome));
  add(nurse?.userId, `นัดกับ ${circle.patientName} วันที่ ${when} ถูกยกเลิก`, LINKS.nurseAppointments);
  return createNotifications(entries);
}

// พยาบาลสร้างแผนการดูแลใหม่ → ผู้ป่วย + ผู้ดูแลที่มีสิทธิ์ดูแผนการดูแล
export async function notifyCarePlanCreated({ patientId, carePlan, actor }) {
  const circle = await getPatientCircle(patientId, { caregiverPermission: 'viewCarePlan' });
  const by = carePlan.createdBy || 'พยาบาล';
  const entries = [];
  if (circle.patientUserId && String(circle.patientUserId) !== String(actor?.userId)) {
    entries.push({
      userId: circle.patientUserId,
      type: 'CARE_PLAN_NEW',
      title: 'มีแผนการดูแลใหม่จากพยาบาล',
      body: `${by}: ${carePlan.goal}`,
      link: LINKS.patientMyCare,
      data: { carePlanId: String(carePlan._id) },
      dedupeKey: `careplan:${carePlan._id}:${circle.patientUserId}`,
    });
  }
  for (const uid of circle.caregiverUserIds) {
    entries.push({
      userId: uid,
      type: 'CARE_PLAN_NEW',
      title: 'มีแผนการดูแลใหม่ของผู้ป่วย',
      body: `${circle.patientName} — ${by}: ${carePlan.goal}`,
      link: LINKS.caregiverMyCare,
      data: { carePlanId: String(carePlan._id) },
      dedupeKey: `careplan:${carePlan._id}:${uid}`,
    });
  }
  return createNotifications(entries);
}

// พยาบาลมอบหมายความรู้สุขภาพใหม่ → ผู้ป่วย + ผู้ดูแลที่มีสิทธิ์ดูความรู้สุขภาพ
export async function notifyEducationAssigned({ patientId, education, actor }) {
  const circle = await getPatientCircle(patientId, { caregiverPermission: 'viewEducation' });
  const entries = [];
  if (circle.patientUserId && String(circle.patientUserId) !== String(actor?.userId)) {
    entries.push({
      userId: circle.patientUserId,
      type: 'EDUCATION_NEW',
      title: 'มีความรู้สุขภาพใหม่จากพยาบาล',
      body: education.title,
      link: LINKS.patientMyCare,
      data: { educationId: String(education._id) },
      dedupeKey: `education:${education._id}:${circle.patientUserId}`,
    });
  }
  for (const uid of circle.caregiverUserIds) {
    entries.push({
      userId: uid,
      type: 'EDUCATION_NEW',
      title: 'มีความรู้สุขภาพใหม่สำหรับผู้ป่วย',
      body: `${circle.patientName} — ${education.title}`,
      link: LINKS.caregiverMyCare,
      data: { educationId: String(education._id) },
      dedupeKey: `education:${education._id}:${uid}`,
    });
  }
  return createNotifications(entries);
}

const SEVERITY_LABEL = { WARNING: 'เฝ้าระวัง', HIGH: 'สูง', CRITICAL: 'วิกฤต' };

// บันทึกค่าสุขภาพที่ผิดปกติ (ระดับ WARNING/HIGH/CRITICAL) → พยาบาลที่ดูแลผู้ป่วย
export async function notifyAbnormalHealthRecord({ patientId, record }) {
  if (!record?.evaluatedSeverity || record.evaluatedSeverity === 'NORMAL') return [];
  const [patient, nurses] = await Promise.all([
    Patient.findById(patientId).select('firstName lastName'),
    getPatientNurses(patientId),
  ]);
  const label = SEVERITY_LABEL[record.evaluatedSeverity] || record.evaluatedSeverity;
  // ข้อความประเมินมี disclaimer ต่อท้าย — ตัดออกให้แจ้งเตือนสั้นอ่านง่าย
  const detail = String(record.evaluatedMessage || '').split(' — Placeholder')[0];
  return createNotifications(
    nurses
      .filter((n) => n.userId)
      .map((n) => ({
        userId: n.userId,
        type: 'HEALTH_ABNORMAL',
        title: `ค่าสุขภาพผิดปกติ (${label}) — ${fullName(patient)}`,
        body: detail,
        link: LINKS.nursePatient(patientId),
        data: { patientId: String(patientId), healthRecordId: String(record._id), severity: record.evaluatedSeverity },
        dedupeKey: `health:${record._id}:${n.userId}`,
      }))
  );
}

export default {
  initNotificationService,
  createNotifications,
  getPatientCircle,
  getPatientNurses,
  notifyAppointmentCreated,
  notifyAppointmentCancelled,
  notifyCarePlanCreated,
  notifyEducationAssigned,
  notifyAbnormalHealthRecord,
  LINKS,
};