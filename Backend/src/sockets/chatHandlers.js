import { Message, Patient, Nurse, CareTeam, CaregiverLink } from '../models/index.js';
import { getSenderName } from '../services/chatIdentity.js';

/**
 * chatHandlers.js — Realtime Chat ผ่าน Socket.io (แชทกลุ่ม 3 ฝ่าย)
 *
 * Room = `chat-{patientId}` (1 ผู้ป่วย = 1 ห้อง รวม ผู้ป่วย + ผู้ดูแลที่เชื่อมโยงอยู่ + พยาบาลที่ดูแล)
 * ทุกข้อความแนบ senderName (ชื่อ-นามสกุลผู้ส่ง) เพื่อระบุตัวตนในแชท
 *
 * Events (Client → Server) — ทุก event ที่มี ack จะตอบ { ok, message?, data? }
 *   join-chat      { patientId }              เข้าห้อง (ตรวจสิทธิ์ก่อน)
 *   leave-chat     { patientId }              ออกจากห้อง
 *   chat-message   { patientId, text }        ส่งข้อความ (บันทึก DB แล้ว broadcast)
 *   typing         { patientId }              กำลังพิมพ์
 *   mark-read      { patientId }              อ่านข้อความของอีกฝั่งแล้ว
 *   join-my-chats  (พยาบาลเท่านั้น)           เข้าห้องแชทของผู้ป่วยทุกคนใน Care Team เพื่อรับข้อความ/นับ unread รวมที่ Header
 * Events (Server → Client)
 *   new-message    <Message>                  ข้อความใหม่ (ส่งให้ทุกคนในห้อง รวมผู้ส่ง)
 *   peer-typing    { patientId, role, userId, name }
 *   messages-read  { patientId, readerRole, readerUserId }
 *
 * Security: ตรวจสิทธิ์ระดับเดียวกับ REST (verifyPatientDataAccess('chatWithNurse')) ทุกครั้งที่ join/ส่ง
 * ป้องกันการเข้าฟัง/ส่งข้อความเข้า thread ของผู้ป่วยรายอื่น
 */

export const MAX_TEXT_LENGTH = 2000;
export const IDENTITY_MISMATCH_MESSAGE =
  'บัญชีที่ใช้งานในหน้านี้ไม่ตรงกับบัญชีที่ล็อกอินอยู่ในเบราว์เซอร์ (อาจมีการล็อกอินบัญชีอื่นในอีกแท็บ) กรุณารีเฟรชหน้าหรือเข้าสู่ระบบใหม่ก่อนส่งข้อความ';
const ACCESS_TTL_MS = 60_000; // cache ผลตรวจสิทธิ์ต่อ socket (ลดการ query ตอนพิมพ์/อ่าน) — ส่งข้อความจะตรวจใหม่ทุกครั้ง
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MESSAGES = 20;
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export const chatRoom = (patientId) => `chat-${patientId}`;

/**
 * เงื่อนไข "ข้อความที่ยังไม่ได้อ่าน" ของผู้ใช้คนนี้ในห้องแชทกลุ่ม
 *  = ข้อความของคนอื่น (ไม่ใช่ที่ตัวเองส่ง) ที่ตัวเองยังไม่อยู่ใน readBy
 *  (ข้อความเก่าก่อนมี readBy ที่ read=true ถือว่าอ่านแล้ว)
 * ใช้ร่วมกันทั้งตอนนับ badge และตอน mark read
 */
export function unreadFilterFor(user, patientId) {
  return {
    patientId,
    senderUserId: { $ne: user.userId },
    readBy: { $ne: user.userId },
    $nor: [{ read: true, readBy: { $exists: false } }],
  };
}

// สิ่งที่อัปเดตตอน mark read: บันทึกว่าผู้ใช้คนนี้อ่านแล้ว + read=true (ให้ผู้ส่งเห็น ✓✓)
export const markReadUpdateFor = (user) => ({
  $addToSet: { readBy: user.userId },
  $set: { read: true },
});

const allow = () => ({ ok: true });
const deny = (message) => ({ ok: false, message });

/**
 * ตรวจว่า user (จาก JWT ใน socket) เข้าแชทของ patientId ได้หรือไม่
 * Admin ไม่ได้รับสิทธิ์แชท Realtime (ดูประวัติผ่าน REST ได้ตามเดิม)
 */
export async function checkChatAccess(user, patientId) {
  const pid = String(patientId || '');
  if (!OBJECT_ID.test(pid)) return deny('patientId ไม่ถูกต้อง');

  switch (user.role) {
    case 'patient':
      return user.roleRefId === pid ? allow() : deny('คุณไม่มีสิทธิ์เข้าถึงแชทของผู้ป่วยรายอื่น');

    case 'nurse': {
      const nurse = await Nurse.findById(user.roleRefId).select('approvalStatus confidentialityAccepted');
      if (!nurse || nurse.approvalStatus !== 'APPROVED' || !nurse.confidentialityAccepted) {
        return deny('บัญชีพยาบาลยังไม่ได้รับอนุมัติหรือยังไม่ได้ยอมรับนโยบายรักษาความลับ');
      }
      const team = await CareTeam.findOne({ patientId: pid, nurseId: user.roleRefId, status: 'ACTIVE' }).select('_id');
      return team ? allow() : deny('ผู้ป่วยรายนี้ไม่ได้อยู่ใน Care Team ของคุณ');
    }

    case 'caregiver': {
      // ผู้ดูแลที่เชื่อมโยงกับผู้ป่วย (ACTIVE) ส่งข้อความได้เสมอ ไม่ต้องมีสิทธิ์ chatWithNurse
      const link = await CaregiverLink.findOne({ caregiverId: user.roleRefId, patientId: pid, status: 'ACTIVE' }).select('_id');
      return link ? allow() : deny('คุณไม่ได้เชื่อมโยงเป็นผู้ดูแลของผู้ป่วยรายนี้');
    }

    default:
      return deny('บทบาทของคุณไม่มีสิทธิ์ใช้แชท');
  }
}

export function registerChatHandlers(io, socket) {
  const accessCache = new Map(); // patientId -> expiresAt
  const pinnedRooms = new Set(); // ห้องที่พยาบาลเข้าผ่าน join-my-chats — ห้ามออกด้วย leave-chat (ไม่งั้น inbox ที่ Header จะไม่ได้รับข้อความของผู้ป่วยคนนั้นอีก)
  const sentAt = []; // timestamps สำหรับ rate limit

  // ชื่อผู้ส่ง — ดึงครั้งเดียวต่อการเชื่อมต่อแล้ว cache (ไม่ query ทุกข้อความ)
  let myName = null;
  const senderName = async () => {
    if (myName === null) myName = await getSenderName(socket.user);
    return myName;
  };

  const reply = (ack, payload) => {
    if (typeof ack === 'function') ack(payload);
    else if (payload && payload.ok === false) socket.emit('chat-error', { message: payload.message });
  };

  const ensureAccess = async (patientId, { fresh = false } = {}) => {
    const pid = String(patientId || '');
    const expires = accessCache.get(pid);
    if (!fresh && expires && expires > Date.now()) return allow();
    const result = await checkChatAccess(socket.user, pid);
    if (result.ok) accessCache.set(pid, Date.now() + ACCESS_TTL_MS);
    else accessCache.delete(pid);
    return result;
  };

  // ---------- JOIN / LEAVE ----------
  socket.on('join-chat', async (payload, ack) => {
    try {
      const patientId = payload?.patientId;
      const access = await ensureAccess(patientId, { fresh: true });
      if (!access.ok) return reply(ack, access);
      socket.join(chatRoom(patientId));
      reply(ack, { ok: true });
    } catch (err) {
      reply(ack, deny('เข้าร่วมแชทไม่สำเร็จ'));
    }
  });

  socket.on('leave-chat', (payload) => {
    const pid = payload?.patientId ? String(payload.patientId) : null;
    if (pid && !pinnedRooms.has(pid)) socket.leave(chatRoom(pid));
  });

  // ---------- NURSE INBOX ----------
  // พยาบาลเข้าห้องแชทของผู้ป่วยทุกคนใน Care Team (ACTIVE) ในครั้งเดียว — ใช้กับปุ่มแชทที่ Header (รายการแชท + จำนวนที่ยังไม่อ่านรวม)
  socket.on('join-my-chats', async (payloadOrAck, maybeAck) => {
    // event นี้ไม่มี payload — ไคลเอนต์อาจส่ง ack มาเป็นอาร์กิวเมนต์แรก (emitWithAck('join-my-chats'))
    const ack = typeof payloadOrAck === 'function' ? payloadOrAck : maybeAck;
    try {
      if (socket.user.role !== 'nurse') return reply(ack, deny('เฉพาะพยาบาลเท่านั้น'));
      const nurse = await Nurse.findById(socket.user.roleRefId).select('approvalStatus confidentialityAccepted');
      if (!nurse || nurse.approvalStatus !== 'APPROVED' || !nurse.confidentialityAccepted) {
        return reply(ack, deny('บัญชีพยาบาลยังไม่ได้รับอนุมัติหรือยังไม่ได้ยอมรับนโยบายรักษาความลับ'));
      }
      const teams = await CareTeam.find({ nurseId: socket.user.roleRefId, status: 'ACTIVE' }).select('patientId');
      teams.forEach((t) => {
        const pid = String(t.patientId);
        socket.join(chatRoom(pid));
        pinnedRooms.add(pid);
        accessCache.set(pid, Date.now() + ACCESS_TTL_MS);
      });
      reply(ack, { ok: true, count: teams.length });
    } catch (err) {
      reply(ack, deny('เข้าร่วมห้องแชทไม่สำเร็จ'));
    }
  });

  // ---------- SEND MESSAGE ----------
  socket.on('chat-message', async (payload, ack) => {
    try {
      const patientId = payload?.patientId;
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!text) return reply(ack, deny('กรุณากรอกข้อความ'));

      // ป้องกันส่งข้อความในนามบัญชีอื่น: หน้าจอส่งมาว่า "ตัวเองคือใคร" (asUserId) ต้องตรงกับบัญชีของ socket นี้
      if (payload?.asUserId && String(payload.asUserId) !== String(socket.user.userId)) {
        return reply(ack, deny(IDENTITY_MISMATCH_MESSAGE));
      }
      if (text.length > MAX_TEXT_LENGTH) return reply(ack, deny(`ข้อความยาวเกิน ${MAX_TEXT_LENGTH} ตัวอักษร`));

      // Rate limit ต่อ socket — กัน spam
      const now = Date.now();
      while (sentAt.length && now - sentAt[0] > RATE_WINDOW_MS) sentAt.shift();
      if (sentAt.length >= RATE_MAX_MESSAGES) return reply(ack, deny('ส่งข้อความถี่เกินไป กรุณารอสักครู่'));

      const access = await ensureAccess(patientId, { fresh: true });
      if (!access.ok) return reply(ack, access);

      // เหมือน verifyConsent: ผู้ป่วยที่ถอนความยินยอมแล้ว ห้ามเขียนข้อมูลใหม่
      const patient = await Patient.findById(patientId).select('consentStatus');
      if (!patient) return reply(ack, deny('ไม่พบข้อมูลผู้ป่วย'));
      if (patient.consentStatus === 'CONSENT_WITHDRAWN') {
        return reply(ack, deny('ผู้ป่วยรายนี้ได้ถอนความยินยอมแล้ว ไม่สามารถส่งข้อความใหม่ได้'));
      }

      sentAt.push(now);
      const message = await Message.create({
        patientId,
        senderRole: socket.user.role,
        senderUserId: socket.user.userId,
        text,
        sentAt: new Date(),
      });

      const room = chatRoom(patientId);
      socket.join(room); // กันกรณีเพิ่ง reconnect แล้วยังไม่ได้ join ใหม่ — ผู้ส่งจะได้รับข้อความของตัวเองด้วย
      const data = { ...message.toObject(), senderName: await senderName() };
      io.to(room).emit('new-message', data);
      reply(ack, { ok: true, message: data });
    } catch (err) {
      console.error('chatmessage error: - chatHandlers.js:204', err);
      reply(ack, deny('ส่งข้อความไม่สำเร็จ'));
    }
  });

  // ---------- TYPING ----------
  socket.on('typing', async (payload) => {
    const patientId = payload?.patientId;
    if (!patientId || !socket.rooms.has(chatRoom(patientId))) return; // ต้อง join (ผ่านการตรวจสิทธิ์) แล้วเท่านั้น
    socket.to(chatRoom(patientId)).emit('peer-typing', {
      patientId: String(patientId),
      role: socket.user.role,
      userId: socket.user.userId,
      name: await senderName().catch(() => ''),
    });
  });

  // ---------- READ RECEIPT ----------
  socket.on('mark-read', async (payload, ack) => {
    try {
      const patientId = payload?.patientId;
      const access = await ensureAccess(patientId);
      if (!access.ok) return reply(ack, access);

      const result = await Message.updateMany(unreadFilterFor(socket.user, patientId), markReadUpdateFor(socket.user));
      if (result.modifiedCount > 0) {
        socket.to(chatRoom(patientId)).emit('messages-read', {
          patientId: String(patientId),
          readerRole: socket.user.role,
          readerUserId: socket.user.userId,
        });
      }
      reply(ack, { ok: true });
    } catch (err) {
      reply(ack, deny('อัปเดตสถานะอ่านไม่สำเร็จ'));
    }
  });
}

export default registerChatHandlers;