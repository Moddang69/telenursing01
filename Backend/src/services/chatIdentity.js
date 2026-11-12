import { User, Patient, Nurse, Caregiver } from '../models/index.js';

/**
 * chatIdentity.js — ระบุตัวตนผู้ส่งข้อความในแชทกลุ่ม (ชื่อ-นามสกุล)
 * ไม่เก็บชื่อลงใน Message แต่ดึงจากโปรไฟล์ปัจจุบันทุกครั้ง → ชื่อที่แสดงเป็นปัจจุบันเสมอ และข้อความเก่าก็มีชื่อด้วย
 */

const MODEL_BY_ROLE = { patient: Patient, nurse: Nurse, caregiver: Caregiver };

const fullName = (doc) => (doc ? `${doc.firstName || ''} ${doc.lastName || ''}`.trim() : '');

// ชื่อของผู้ใช้จาก JWT payload { role, roleRefId }
export async function getSenderName(user) {
  const Model = MODEL_BY_ROLE[user?.role];
  if (!Model || !user.roleRefId) return '';
  const doc = await Model.findById(user.roleRefId).select('firstName lastName');
  return fullName(doc);
}

// แนบ senderName ให้รายการข้อความ (ใช้ query รวมเป็นชุด ไม่ query ทีละข้อความ) — คืน plain objects
export async function attachSenderNames(messages) {
  const plain = messages.map((m) => (typeof m.toObject === 'function' ? m.toObject() : m));
  const userIds = [...new Set(plain.map((m) => String(m.senderUserId)))];
  if (!userIds.length) return plain;

  const users = await User.find({ _id: { $in: userIds } }).select('role roleRefId');

  const refsByRole = { patient: [], nurse: [], caregiver: [] };
  users.forEach((u) => refsByRole[u.role]?.push(u.roleRefId));

  const nameByRef = new Map();
  await Promise.all(
    Object.entries(refsByRole).map(async ([role, refs]) => {
      if (!refs.length) return;
      const docs = await MODEL_BY_ROLE[role].find({ _id: { $in: refs } }).select('firstName lastName');
      docs.forEach((d) => nameByRef.set(String(d._id), fullName(d)));
    })
  );

  const nameByUser = new Map(users.map((u) => [String(u._id), nameByRef.get(String(u.roleRefId)) || '']));
  return plain.map((m) => ({ ...m, senderName: nameByUser.get(String(m.senderUserId)) || '' }));
}

export default { getSenderName, attachSenderNames };