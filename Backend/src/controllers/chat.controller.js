import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Message, Patient, CareTeam } from '../models/index.js';
import { chatRoom, unreadFilterFor, markReadUpdateFor, IDENTITY_MISMATCH_MESSAGE } from '../sockets/chatHandlers.js';
import { getSenderName, attachSenderNames } from '../services/chatIdentity.js';
import { notifyChatMessage } from '../services/notification.service.js';

/**
 * chat.controller.js (แชทกลุ่ม ผู้ป่วย/ผู้ดูแล/พยาบาล — ทุกข้อความแนบ senderName)
 * REST ใช้ดึง "ประวัติ" ข้อความ (Pagination) + mark read
 * การ "ส่ง" Realtime ทำผ่าน Socket.io (sockets/chatHandlers.js) เป็นหลัก
 * REST POST เป็น Fallback กรณี Client ไม่ได้เชื่อม Socket — และจะ broadcast เข้าห้อง Socket ให้อีกฝั่งเห็นแบบ Realtime ด้วย
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// GET /api/chat/:patientId?before=<timestamp>&limit=50
export const getMessageHistory = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { before, limit } = req.query;

  const filter = { patientId };
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) filter.sentAt = { $lt: d };
  }

  const parsed = parseInt(limit, 10);
  const size = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;

  const messages = await Message.find(filter).sort({ sentAt: -1 }).limit(size);

  res.status(200).json({ success: true, data: await attachSenderNames(messages.reverse()) });
});

// POST /api/chat/:patientId  (Fallback REST — ปกติใช้ Socket.io emit 'chat-message')
export const sendMessageFallback = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const text = String(req.body.text || '').trim();

  // ป้องกันส่งข้อความในนามบัญชีอื่น (เช่น ล็อกอินคนละบัญชีในหลายแท็บของเบราว์เซอร์เดียวกัน ทำให้ Token ที่ใช้ไม่ใช่ของหน้านี้)
  if (req.body.asUserId && String(req.body.asUserId) !== req.user.userId) {
    throw new ApiError(409, IDENTITY_MISMATCH_MESSAGE);
  }

  const message = await Message.create({
    patientId,
    senderRole: req.user.role,
    senderUserId: req.user.userId,
    text,
    sentAt: new Date(),
  });

  const data = { ...message.toObject(), senderName: await getSenderName(req.user) };

  // ส่งต่อให้ทุกคนที่เปิดห้องแชทอยู่ (Realtime) — io ถูกเก็บไว้ใน app ตอน start server
  req.app.get('io')?.to(chatRoom(patientId)).emit('new-message', data);

  // Web Push ถึงสมาชิกห้องคนอื่น แม้ไม่ได้เปิดเว็บ (ไม่รอผล)
  notifyChatMessage({ patientId, message: data }).catch(() => {});

  res.status(201).json({ success: true, message: 'ส่งข้อความสำเร็จ', data });
});

// PATCH /api/chat/:patientId/read  (Mark all as read)
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const result = await Message.updateMany(unreadFilterFor(req.user, patientId), markReadUpdateFor(req.user));

  if (result.modifiedCount > 0) {
    req.app.get('io')?.to(chatRoom(patientId)).emit('messages-read', {
      patientId: String(patientId),
      readerRole: req.user.role,
      readerUserId: req.user.userId,
    });
  }

  res.status(200).json({ success: true, message: 'อัปเดตสถานะอ่านแล้วสำเร็จ' });
});

// GET /api/chat/:patientId/unread-count  (จำนวนข้อความที่ยังไม่ได้อ่าน — ใช้แสดง badge บน Header)
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments(unreadFilterFor(req.user, req.params.patientId));
  res.status(200).json({ success: true, data: { count } });
});

// GET /api/chat/conversations  (เฉพาะพยาบาล)
// รายการห้องแชทของผู้ป่วยใน Care Team ที่ "เคยมีการสนทนา" พร้อมข้อความล่าสุด + จำนวนที่ยังไม่ได้อ่านของพยาบาลคนนี้
// และ totalUnread (ผลรวม) สำหรับ badge ที่ปุ่มแชทบน Header
export const getNurseConversations = asyncHandler(async (req, res) => {
  const teams = await CareTeam.find({ nurseId: req.user.roleRefId, status: 'ACTIVE' }).select('patientId');
  const patientIds = teams.map((t) => t.patientId);
  if (!patientIds.length) {
    return res.status(200).json({ success: true, data: { conversations: [], totalUnread: 0 } });
  }

  const me = new mongoose.Types.ObjectId(req.user.userId);

  // aggregate ไม่ cast ชนิดให้อัตโนมัติ จึงใช้ ObjectId ตรงๆ — เงื่อนไข unread เหมือน unreadFilterFor ใน chatHandlers.js
  const [lastByPatient, unreadByPatient] = await Promise.all([
    Message.aggregate([
      { $match: { patientId: { $in: patientIds } } },
      { $sort: { sentAt: -1 } },
      { $group: { _id: '$patientId', last: { $first: '$$ROOT' } } },
    ]),
    Message.aggregate([
      {
        $match: {
          patientId: { $in: patientIds },
          senderUserId: { $ne: me },
          readBy: { $ne: me },
          $nor: [{ read: true, readBy: { $exists: false } }],
        },
      },
      { $group: { _id: '$patientId', count: { $sum: 1 } } },
    ]),
  ]);

  if (!lastByPatient.length) {
    return res.status(200).json({ success: true, data: { conversations: [], totalUnread: 0 } });
  }

  const unreadMap = new Map(unreadByPatient.map((u) => [String(u._id), u.count]));
  const patients = await Patient.find({ _id: { $in: lastByPatient.map((g) => g._id) } }).select('firstName lastName hn');
  const patientMap = new Map(patients.map((p) => [String(p._id), p]));
  const lastMessages = await attachSenderNames(lastByPatient.map((g) => g.last));

  const conversations = lastByPatient
    .map((g, i) => {
      const patient = patientMap.get(String(g._id));
      const last = lastMessages[i];
      return {
        patientId: String(g._id),
        patientName: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'ผู้ป่วย',
        hn: patient?.hn || '',
        lastMessage: {
          text: last.text,
          sentAt: last.sentAt,
          senderUserId: String(last.senderUserId),
          senderRole: last.senderRole,
          senderName: last.senderName,
        },
        unreadCount: unreadMap.get(String(g._id)) || 0,
      };
    })
    .sort((a, b) => new Date(b.lastMessage.sentAt) - new Date(a.lastMessage.sentAt));

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  res.status(200).json({ success: true, data: { conversations, totalUnread } });
});

export default { getMessageHistory, sendMessageFallback, markMessagesAsRead, getUnreadCount, getNurseConversations };