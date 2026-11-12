import {
  Patient,
  Nurse,
  Appointment,
  CarePlan,
  Education,
  Message,
  CareTeam,
  CaregiverLink,
} from '../models/index.js';
import { attachSenderNames } from './chatIdentity.js';
import { formatDateTimeTh } from './reminderRules.js';

/**
 * search.service.js — ค้นหาจาก Header (จำกัดขอบเขตตามบทบาทและสิทธิ์)
 *
 * พยาบาล        : ผู้ป่วยใน Care Team (ชื่อ/นามสกุล/HN), นัดหมาย, แผนการดูแล, ความรู้สุขภาพที่มอบหมาย, ข้อความแชท
 * ผู้ป่วย        : ความรู้สุขภาพ, แผนการดูแล, นัดหมาย (ชื่อพยาบาล/เหตุผล), พยาบาลผู้ดูแล, ข้อความแชท — เฉพาะของตนเอง
 * ผู้ดูแล        : ความรู้สุขภาพ, แผนการดูแล, นัดหมาย ของผู้ป่วยที่เชื่อมโยง (ตามสิทธิ์ viewEducation/viewCarePlan/viewAppointment), ข้อความแชท
 *
 * ความปลอดภัย: ไม่รับ patientId จาก Client — ขอบเขตข้อมูลมาจาก Token + Care Team / CaregiverLink เท่านั้น
 * และ escape อักขระพิเศษของ regex ทั้งหมดก่อนค้นหา
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 50;
export const MAX_PER_GROUP = 5;
const MAX_TOKENS = 5;

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// แยกคำค้นเป็นคำๆ (คั่นด้วยช่องว่าง) — ทุกคำต้องตรงอย่างน้อย 1 ฟิลด์ ("สมชาย ใจดี" หาได้ทั้งชื่อและนามสกุล)
export function parseQuery(raw) {
  const q = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
  const tokens = q.split(' ').filter(Boolean).slice(0, MAX_TOKENS);
  return { q, tokens, regexes: tokens.map((t) => new RegExp(escapeRegex(t), 'i')) };
}

const tokensMatch = (fields, regexes) => ({
  $and: regexes.map((re) => ({ $or: fields.map((f) => ({ [f]: re })) })),
});

const fullName = (d) => (d ? `${d.firstName || ''} ${d.lastName || ''}`.trim() : '');

// ตัดข้อความสั้นๆ รอบคำที่ตรง เพื่อแสดงเป็นตัวอย่างผลการค้นหาข้อความแชท
export function makeSnippet(text, regexes, max = 80) {
  const s = String(text || '');
  let idx = -1;
  for (const re of regexes) {
    const m = re.exec(s);
    if (m && (idx === -1 || m.index < idx)) idx = m.index;
  }
  if (s.length <= max) return s;
  const start = Math.max(0, (idx === -1 ? 0 : idx) - 20);
  return `${start > 0 ? '…' : ''}${s.slice(start, start + max)}${start + max < s.length ? '…' : ''}`;
}

const ROLE_LABEL = { patient: 'ผู้ป่วย', nurse: 'พยาบาล', caregiver: 'ผู้ดูแล' };
const STATUS_LABEL = {
  SCHEDULED: 'นัดหมายแล้ว',
  WAITING: 'รอเข้าห้อง',
  PATIENT_JOINED: 'ผู้ป่วยเข้าห้องแล้ว',
  NURSE_JOINED: 'พยาบาลเข้าห้องแล้ว',
  IN_CONSULTATION: 'กำลังปรึกษา',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
  NO_SHOW: 'ไม่มาตามนัด',
  RESCHEDULED: 'เลื่อนนัด',
};
const EDU_STATUS_LABEL = { ASSIGNED: 'ยังไม่เริ่ม', NOT_STARTED: 'ยังไม่เริ่ม', IN_PROGRESS: 'กำลังเรียน', COMPLETED: 'เรียนจบแล้ว' };

const group = (key, label, items) => ({ key, label, items });
const nonEmpty = (groups) => groups.filter((g) => g.items.length > 0);

// ---------------- พยาบาล ----------------
async function searchAsNurse(user, { regexes }) {
  const nurse = await Nurse.findById(user.roleRefId).select('approvalStatus confidentialityAccepted');
  if (!nurse || nurse.approvalStatus !== 'APPROVED' || !nurse.confidentialityAccepted) return [];

  const teams = await CareTeam.find({ nurseId: user.roleRefId, status: 'ACTIVE' }).select('patientId');
  const patientIds = teams.map((t) => t.patientId);
  if (!patientIds.length) return [];

  const matchedPatients = await Patient.find({
    _id: { $in: patientIds },
    ...tokensMatch(['firstName', 'lastName', 'hn'], regexes),
  })
    .select('firstName lastName hn')
    .limit(50);
  const matchedIds = matchedPatients.map((p) => p._id);

  const [carePlans, educations, messages, appointments] = await Promise.all([
    CarePlan.find({ patientId: { $in: patientIds }, ...tokensMatch(['goal', 'action', 'target'], regexes) })
      .sort({ createdAt: -1 })
      .limit(MAX_PER_GROUP)
      .select('patientId goal action'),
    Education.find({ patientId: { $in: patientIds }, ...tokensMatch(['title', 'category', 'description'], regexes) })
      .sort({ assignedAt: -1 })
      .limit(MAX_PER_GROUP)
      .select('patientId title category status'),
    Message.find({ patientId: { $in: patientIds }, ...tokensMatch(['text'], regexes) })
      .sort({ sentAt: -1 })
      .limit(MAX_PER_GROUP)
      .select('patientId text sentAt senderRole senderUserId'),
    Appointment.find({
      nurseId: user.roleRefId,
      patientId: { $in: patientIds },
      $or: [{ patientId: { $in: matchedIds } }, tokensMatch(['reason'], regexes)],
    })
      .sort({ dueDateTime: -1 })
      .limit(MAX_PER_GROUP)
      .select('patientId dueDateTime reason status'),
  ]);

  // ชื่อผู้ป่วยที่ใช้แสดงในผลลัพธ์ทุกกลุ่ม (ดึงเพิ่มเฉพาะที่ยังไม่มี)
  const nameMap = new Map(matchedPatients.map((p) => [String(p._id), p]));
  const missing = [
    ...new Set([...carePlans, ...educations, ...messages, ...appointments].map((x) => String(x.patientId))),
  ].filter((id) => !nameMap.has(id));
  if (missing.length) {
    const more = await Patient.find({ _id: { $in: missing } }).select('firstName lastName hn');
    more.forEach((p) => nameMap.set(String(p._id), p));
  }
  const nameOf = (pid) => fullName(nameMap.get(String(pid))) || 'ผู้ป่วย';
  const detail = (pid, tab) => `/nurse/patients/${pid}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`;

  const namedMessages = await attachSenderNames(messages);

  return nonEmpty([
    group(
      'patients',
      'ผู้ป่วย',
      matchedPatients
        .slice()
        .sort((a, b) => fullName(a).localeCompare(fullName(b), 'th'))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          id: String(p._id),
          icon: 'patient',
          title: fullName(p),
          subtitle: `HN: ${p.hn}`,
          link: detail(p._id),
        }))
    ),
    group(
      'appointments',
      'นัดหมายวิดีโอคอล',
      appointments.map((a) => ({
        id: String(a._id),
        icon: 'appointment',
        title: nameOf(a.patientId),
        subtitle: `${formatDateTimeTh(a.dueDateTime)} · ${a.reason || 'ไม่ระบุเหตุผล'} · ${STATUS_LABEL[a.status] || a.status}`,
        link: '/nurse/appointments',
      }))
    ),
    group(
      'carePlans',
      'แผนการดูแล',
      carePlans.map((c) => ({
        id: String(c._id),
        icon: 'carePlan',
        title: c.goal,
        subtitle: `${nameOf(c.patientId)} · ${c.action}`,
        link: detail(c.patientId, 'Care Plan'),
      }))
    ),
    group(
      'educations',
      'ความรู้สุขภาพที่มอบหมาย',
      educations.map((e) => ({
        id: String(e._id),
        icon: 'education',
        title: e.title,
        subtitle: `${nameOf(e.patientId)} · ${e.category} · ${EDU_STATUS_LABEL[e.status] || e.status}`,
        link: detail(e.patientId, 'Education'),
      }))
    ),
    group(
      'messages',
      'ข้อความแชท',
      namedMessages.map((m) => ({
        id: String(m._id),
        icon: 'message',
        title: nameOf(m.patientId),
        subtitle: `${m.senderName || ROLE_LABEL[m.senderRole] || ''}: ${makeSnippet(m.text, regexes)}`,
        link: `/nurse/chat/${m.patientId}`,
      }))
    ),
  ]);
}

// ---------------- ผู้ป่วย / ผู้ดูแล ----------------
async function searchAsPatientCircle(user, { regexes }) {
  const isCaregiver = user.role === 'caregiver';

  // ขอบเขตผู้ป่วยและสิทธิ์
  let scopes; // [{ patientId, education, carePlan, appointment }]
  if (isCaregiver) {
    const links = await CaregiverLink.find({ caregiverId: user.roleRefId, status: 'ACTIVE' }).select('patientId permissions');
    scopes = links.map((l) => ({
      patientId: l.patientId,
      education: l.permissions?.viewEducation !== false,
      carePlan: l.permissions?.viewCarePlan !== false,
      appointment: l.permissions?.viewAppointment !== false,
    }));
  } else {
    scopes = [{ patientId: user.roleRefId, education: true, carePlan: true, appointment: true }];
  }
  if (!scopes.length) return [];

  const idsFor = (perm) => scopes.filter((s) => s[perm]).map((s) => s.patientId);
  const allIds = scopes.map((s) => s.patientId); // แชทใช้ได้เสมอเมื่อเชื่อมโยง ACTIVE (ตามที่กำหนดไว้)
  const base = isCaregiver ? '/caregiver' : '/patient';
  const myCare = `${base}/my-care`;

  const eduIds = idsFor('education');
  const planIds = idsFor('carePlan');
  const apptIds = idsFor('appointment');

  const [educations, carePlans, messages, apptNurseIds] = await Promise.all([
    eduIds.length
      ? Education.find({ patientId: { $in: eduIds }, ...tokensMatch(['title', 'category', 'description'], regexes) })
          .sort({ assignedAt: -1 })
          .limit(MAX_PER_GROUP)
          .select('title category status')
      : [],
    planIds.length
      ? CarePlan.find({ patientId: { $in: planIds }, ...tokensMatch(['goal', 'action', 'frequency', 'target'], regexes) })
          .sort({ createdAt: -1 })
          .limit(MAX_PER_GROUP)
          .select('goal action')
      : [],
    Message.find({ patientId: { $in: allIds }, ...tokensMatch(['text'], regexes) })
      .sort({ sentAt: -1 })
      .limit(MAX_PER_GROUP)
      .select('patientId text sentAt senderRole senderUserId'),
    apptIds.length ? Appointment.distinct('nurseId', { patientId: { $in: apptIds } }) : [],
  ]);

  // นัดหมาย: ตรงกับเหตุผลที่นัด หรือชื่อพยาบาลที่นัด
  let appointments = [];
  let nurseMap = new Map();
  if (apptIds.length) {
    const nurses = apptNurseIds.length
      ? await Nurse.find({ _id: { $in: apptNurseIds } }).select('firstName lastName hospital')
      : [];
    nurseMap = new Map(nurses.map((n) => [String(n._id), n]));
    const matchedNurseIds = nurses.filter((n) => regexes.every((re) => re.test(fullName(n)))).map((n) => n._id);
    appointments = await Appointment.find({
      patientId: { $in: apptIds },
      $or: [{ nurseId: { $in: matchedNurseIds } }, tokensMatch(['reason'], regexes)],
    })
      .sort({ dueDateTime: -1 })
      .limit(MAX_PER_GROUP)
      .select('nurseId dueDateTime reason status');
  }

  // พยาบาลผู้ดูแล (เฉพาะผู้ป่วย — ผู้ดูแลไม่มีหน้าแสดงข้อมูลพยาบาล)
  let careNurses = [];
  if (!isCaregiver) {
    const team = await CareTeam.find({ patientId: user.roleRefId, status: 'ACTIVE' }).select('nurseId');
    if (team.length) {
      const nurses = await Nurse.find({ _id: { $in: team.map((t) => t.nurseId) } }).select('firstName lastName hospital');
      careNurses = nurses.filter((n) => regexes.every((re) => re.test(fullName(n))));
    }
  }

  const namedMessages = await attachSenderNames(messages);

  return nonEmpty([
    group(
      'educations',
      'ความรู้สุขภาพ',
      educations.map((e) => ({
        id: String(e._id),
        icon: 'education',
        title: e.title,
        subtitle: `${e.category} · ${EDU_STATUS_LABEL[e.status] || e.status}`,
        link: `${myCare}?tab=education&highlight=${e._id}`,
      }))
    ),
    group(
      'carePlans',
      'แผนการดูแล',
      carePlans.map((c) => ({
        id: String(c._id),
        icon: 'carePlan',
        title: c.goal,
        subtitle: c.action,
        link: `${myCare}?tab=careplan&highlight=${c._id}`,
      }))
    ),
    group(
      'appointments',
      'นัดหมายวิดีโอคอล',
      appointments.map((a) => ({
        id: String(a._id),
        icon: 'appointment',
        title: `วิดีโอคอลกับ ${fullName(nurseMap.get(String(a.nurseId))) || 'พยาบาล'}`,
        subtitle: `${formatDateTimeTh(a.dueDateTime)} · ${a.reason || 'ไม่ระบุเหตุผล'} · ${STATUS_LABEL[a.status] || a.status}`,
        link: `${base}/home`,
      }))
    ),
    group(
      'nurses',
      'พยาบาลผู้ดูแล',
      careNurses.map((n) => ({
        id: String(n._id),
        icon: 'nurse',
        title: fullName(n),
        subtitle: n.hospital || 'พยาบาลผู้ดูแล',
        link: '/patient/profile',
      }))
    ),
    group(
      'messages',
      'ข้อความแชท',
      namedMessages.map((m) => ({
        id: String(m._id),
        icon: 'message',
        title: `${m.senderName || ''}${m.senderName ? ' ' : ''}(${ROLE_LABEL[m.senderRole] || ''})`.trim(),
        subtitle: makeSnippet(m.text, regexes),
        link: `${base}/chat`,
      }))
    ),
  ]);
}

/**
 * search — คืน { query, groups, total } ตามบทบาทของผู้ค้นหา (admin ไม่รองรับ)
 */
export async function search(user, rawQuery) {
  const parsed = parseQuery(rawQuery);
  if (parsed.q.length < MIN_QUERY_LENGTH) return { query: parsed.q, groups: [], total: 0 };

  let groups = [];
  if (user.role === 'nurse') groups = await searchAsNurse(user, parsed);
  else if (user.role === 'patient' || user.role === 'caregiver') groups = await searchAsPatientCircle(user, parsed);

  return { query: parsed.q, groups, total: groups.reduce((n, g) => n + g.items.length, 0) };
}

export default { search, parseQuery, makeSnippet, escapeRegex, MIN_QUERY_LENGTH, MAX_QUERY_LENGTH };