import apiClient from '../config/apiClient.js';
import { getSocket } from '../config/socketClient.js';

/**
 * videoCallService.js
 * รวม REST (Metadata + ขอ Agora Token) + Socket.io (สถานะห้อง/แชท/จบสาย) เข้าด้วยกัน
 *
 * หมายเหตุ: ภาพ/เสียงวิดีโอคอลใช้ Agora RTC (ดู hooks/useAgoraCall.js)
 * Socket.io ยังใช้สำหรับ join-room, connection-state-change, end-call และแชท
 * ส่วน offer/answer/ice-candidate (WebRTC signaling เดิม) ไม่ได้ใช้แล้ว แต่คงฟังก์ชันไว้เพื่อไม่ให้โค้ดอื่นพัง
 */

const SESSION_KEY = 'telenursing_session';

// สถานะนัดหมายที่ยังเข้าห้องวิดีโอได้
const JOINABLE_STATUSES = ['SCHEDULED', 'WAITING', 'PATIENT_JOINED', 'NURSE_JOINED', 'IN_CONSULTATION'];
// เผื่อเวลาให้เข้าห้องได้หลังเวลานัด (นาที)
const JOIN_GRACE_MINUTES = 60;

const entityId = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

/**
 * หานัดหมายที่ "ควรเข้าห้องตอนนี้" — ทั้งผู้ป่วยและพยาบาลใช้กฎเดียวกัน
 * เพื่อให้ทั้งสองฝั่งเลือกนัดหมายเดียวกัน (= Agora channel เดียวกัน)
 *  - Patient: ไม่ต้องส่ง patientId (ใช้ roleRefId ของตัวเอง)
 *  - Nurse: ส่ง patientId ของผู้ป่วยที่จะคุยด้วย
 */
export async function findJoinableAppointment(targetPatientId) {
  const me = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
  const patientId = targetPatientId || me.roleRefId;
  if (!patientId) return null;

  const res = await apiClient.get(`/appointments/${patientId}`);
  const earliest = Date.now() - JOIN_GRACE_MINUTES * 60 * 1000;

  let list = (res.data || []).filter(
    (a) => JOINABLE_STATUSES.includes(a.status) && new Date(a.dueDateTime).getTime() >= earliest
  );
  if (me.role === 'nurse') {
    list = list.filter((a) => String(entityId(a.nurseId)) === String(me.roleRefId));
  }
  list.sort((a, b) => new Date(a.dueDateTime) - new Date(b.dueDateTime));

  return list[0] ? { ...list[0], id: list[0]._id } : null;
}

export async function createOrGetSession(appointmentId) {
  const res = await apiClient.post(`/video-sessions/${appointmentId}`);
  return res.data;
}

// wasConnected: เคยเชื่อมต่อกับอีกฝั่งจริงแล้วหรือไม่ — ถ้ายัง Backend จะไม่ปิดนัดหมาย (เป็นแค่การออกจากห้อง)
export async function endSession(appointmentId, consultationNote, wasConnected = false) {
  const res = await apiClient.patch(`/video-sessions/${appointmentId}/end`, { consultationNote, wasConnected });
  return res.data;
}

// ขอ Agora RTC Token จาก Backend — { appId, channel, token, uid, expiresAt }
export async function getAgoraToken(appointmentId) {
  const res = await apiClient.post(`/video-sessions/${appointmentId}/agora-token`);
  return res.data;
}

export function joinRoom(appointmentId) {
  const socket = getSocket();
  if (!socket) throw new Error('Socket ยังไม่เชื่อมต่อ กรุณา login ใหม่');
  socket.emit('join-room', { appointmentId });
}

export function sendConnectionState(appointmentId, state) {
  getSocket()?.emit('connection-state-change', { appointmentId, state });
}

// คืน Promise<{ ok, completed } | null> — completed=false หมายถึงแค่ออกจากห้อง (คู่สนทนายังไม่เคยเชื่อมต่อ) เข้าร่วมใหม่ได้
// null = ไม่ได้รับคำตอบจากเซิร์ฟเวอร์ภายใน 4 วินาที (ผู้เรียกใช้ค่าที่ client รู้เอง)
export function endCall(appointmentId, consultationNote, wasConnected = false) {
  const socket = getSocket();
  if (!socket) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    socket.emit('end-call', { appointmentId, consultationNote, wasConnected }, (res) => {
      clearTimeout(timer);
      resolve(res || null);
    });
  });
}

// สมัครรับ call-ended แล้วคืนฟังก์ชันยกเลิก (ไม่ไปลบ listener ของที่อื่น)
export function subscribeCallEnded(cb) {
  const socket = getSocket();
  if (!socket) return () => {};
  socket.on('call-ended', cb);
  return () => socket.off('call-ended', cb);
}

export function removeAllListeners() {
  const socket = getSocket();
  if (!socket) return;
  ['peer-joined', 'offer', 'answer', 'ice-candidate', 'call-ended', 'peer-disconnected'].forEach((e) =>
    socket.off(e)
  );
}

export default {
  findJoinableAppointment, createOrGetSession, endSession, getAgoraToken, joinRoom, sendConnectionState,
  endCall, subscribeCallEnded,removeAllListeners,
};