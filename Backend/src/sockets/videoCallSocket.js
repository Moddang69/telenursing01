import { Appointment, VideoSession, Message } from '../models/index.js';
import { socketAuthMiddleware } from './socketAuth.js';
import { registerChatHandlers } from './chatHandlers.js';

/**
 * videoCallSocket.js (Phase 5 sockets/videoCallSocket.js)
 * จัดการ Event: join-room, offer, answer, ice-candidate, end-call (แชทอยู่ที่ chatHandlers.js)
 * Room Convention: ใช้ appointmentId เป็นชื่อ Room เสมอ (1 นัดหมาย = 1 ห้อง)
 *
 * Security: ทุก Socket ต้องผ่าน socketAuthMiddleware ก่อน (JWT) และตรวจสิทธิ์ก่อน join-room
 * เพื่อป้องกันคนแปลกหน้าเข้าฟัง/เข้าดู Video Call ของคนอื่น
 */
// ตรวจว่า socket นี้เป็นเจ้าของนัดหมาย (patient/nurse ของนัดหมายนี้หรือ admin) — คืน appointment หรือ null
// (ใช้กับ end-call: เดิมไม่ตรวจสิทธิ์ ใครที่ login ก็ส่ง end-call ด้วย appointmentId ของคนอื่นเพื่อปิดนัดหมายได้)
async function loadAuthorizedAppointment(socket, appointmentId) {
  if (!appointmentId) return null;
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) return null;
  const isOwner =
    socket.user.role === 'admin' ||
    (socket.user.role === 'patient' && socket.user.roleRefId === appointment.patientId.toString()) ||
    (socket.user.role === 'nurse' && socket.user.roleRefId === appointment.nurseId.toString());
  return isOwner ? appointment : null;
}

export function initVideoCallSocket(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.user.userId}, role: ${socket.user.role}) - videoCallSocket.js:17`);

    // ห้องส่วนตัวของผู้ใช้ — ใช้ส่งการแจ้งเตือน Realtime (event 'notification') ไปทุกแท็บ/อุปกรณ์ที่ล็อกอินบัญชีนี้
    socket.join(`user-${socket.user.userId}`);

    // ---------- JOIN ROOM ----------
    socket.on('join-room', async ({ appointmentId }) => {
      try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
          return socket.emit('error', { message: 'ไม่พบข้อมูลการนัดหมาย' });
        }

        // 🔒 ตรวจสิทธิ์เจ้าของนัดหมายก่อน join (เทียบเท่า verifyAppointmentOwnership แต่ทำใน Socket Layer)
        const isOwner =
          socket.user.role === 'admin' ||
          (socket.user.role === 'patient' && socket.user.roleRefId === appointment.patientId.toString()) ||
          (socket.user.role === 'nurse' && socket.user.roleRefId === appointment.nurseId.toString());

        if (!isOwner) {
          return socket.emit('error', { message: 'คุณไม่มีสิทธิ์เข้าร่วมการปรึกษานี้' });
        }

        socket.join(appointmentId);
        socket.currentAppointmentId = appointmentId;

        const newState = socket.user.role === 'nurse' ? 'NURSE_JOINED' : 'CONNECTING';
        const session = await VideoSession.findOneAndUpdate(
          { appointmentId },
          {
            $set: { state: newState, ...(newState === 'NURSE_JOINED' ? { startedAt: new Date() } : {}) },
          },
          { new: true, upsert: false }
        );

        // แจ้งคนอื่นใน Room ว่ามีคนเข้าร่วมใหม่
        socket.to(appointmentId).emit('peer-joined', { role: socket.user.role, socketId: socket.id });
        socket.emit('joined-room', { appointmentId, session });
      } catch (err) {
        socket.emit('error', { message: 'เกิดข้อผิดพลาดในการเข้าร่วมห้อง' });
      }
    });



    // ---------- CONNECTION STATE UPDATE ----------
    socket.on('connection-state-change', async ({ appointmentId, state } = {}) => {
      const validStates = ['CONNECTING', 'CONNECTED', 'RECONNECTING', 'DISCONNECTED'];
      if (!validStates.includes(state)) return;

      try {
        // ต้องเป็นสมาชิกห้องของนัดหมายนี้ (join-room ผ่านการตรวจสิทธิ์แล้ว) — กันคนอื่นแก้ state ของ session ที่ไม่ใช่ของตน
        if (String(socket.currentAppointmentId) !== String(appointmentId)) return;

        // ไม่เขียนทับ session ที่จบไปแล้ว
        await VideoSession.findOneAndUpdate({ appointmentId, state: { $ne: 'CALL_ENDED' } }, { $set: { state } });
        // เชื่อมต่อกันได้จริงครั้งแรก → บันทึกไว้ (ตัวชี้ว่าการปรึกษาเกิดขึ้นแล้ว)
        if (state === 'CONNECTED') {
          await VideoSession.updateOne({ appointmentId, connectedAt: null }, { $set: { connectedAt: new Date() } });
        }
        socket.to(appointmentId).emit('peer-state-change', { state });
      } catch (err) {
        console.warn('connection-state-change failed: - videoCallSocket.js', err.message);
      }
    });

    // ---------- END CALL ----------
    // ack: { ok, completed } — completed=false หมายถึง "แค่ออกจากห้อง" (คู่สนทนายังไม่เคยเชื่อมต่อกัน) นัดหมายยังไม่เสร็จสิ้น เข้าใหม่ได้
    socket.on('end-call', async ({ appointmentId, consultationNote, wasConnected } = {}, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const appointment = await loadAuthorizedAppointment(socket, appointmentId);
        if (!appointment) {
          socket.emit('error', { message: 'คุณไม่มีสิทธิ์จบการปรึกษานี้' });
          return reply({ ok: false, completed: false });
        }

        const session = await VideoSession.findOne({ appointmentId });
        // "การปรึกษาเกิดขึ้นแล้ว" = เคยเชื่อมต่อกัน (เซิร์ฟเวอร์บันทึกไว้) หรือ client ยืนยันว่าเคยเห็นอีกฝั่ง
        const happened = !!session?.connectedAt || wasConnected === true;

        if (!happened) {
          // คู่สนทนายังไม่เข้า/ยังไม่เคยคุยกัน → ไม่ปิดนัดหมาย คืน session เป็นรอเข้าห้อง เพื่อให้เข้าร่วมใหม่ได้
          await VideoSession.updateOne(
            { appointmentId, state: { $ne: 'CALL_ENDED' } },
            { $set: { state: 'WAITING_FOR_NURSE', endedAt: null } }
          );
          socket.leave(String(appointmentId));
          socket.currentAppointmentId = null;
          return reply({ ok: true, completed: false });
        }

        await VideoSession.findOneAndUpdate(
          { appointmentId },
          {
            $set: {
              state: 'CALL_ENDED',
              endedAt: new Date(),
              ...(consultationNote ? { consultationNote } : {}),
              ...(session?.connectedAt ? {} : { connectedAt: new Date() }),
            },
          }
        );
        // ไม่ทับสถานะที่ถูกยกเลิก/เลื่อน/ไม่มาตามนัดไปแล้ว
        await Appointment.updateOne(
          { _id: appointmentId, status: { $nin: ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'] } },
          { $set: { status: 'COMPLETED' } }
        );

        io.to(String(appointmentId)).emit('call-ended', { by: socket.user.role });
        io.socketsLeave(String(appointmentId));
        socket.currentAppointmentId = null;
        reply({ ok: true, completed: true });
      } catch (err) {
        socket.emit('error', { message: 'เกิดข้อผิดพลาดในการจบการปรึกษา' });
        reply({ ok: false, completed: false });
      }
    });

    // ---------- REAL-TIME CHAT ----------
    // แยกไปอยู่ chatHandlers.js (ตรวจสิทธิ์ก่อน join/ส่ง, Consent, rate limit, typing, read receipt)
    registerChatHandlers(io, socket);

    // ---------- DISCONNECT ----------
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id} - videoCallSocket.js:93`);

      if (socket.currentAppointmentId) {
        // แจ้ง Peer อีกฝั่งว่าหลุดการเชื่อมต่อ (ไม่ปิด Session ทันที — รอ Reconnect ตาม state RECONNECTING)
        // ไม่เขียนทับ session ที่จบไปแล้ว (เดิมตอน socket หลุดหลังจบสาย state จะถูกเปลี่ยนจาก CALL_ENDED เป็น DISCONNECTED)
        await VideoSession.findOneAndUpdate(
          { appointmentId: socket.currentAppointmentId, state: { $ne: 'CALL_ENDED' } },
          { $set: { state: 'DISCONNECTED' } }
        );
        socket.to(socket.currentAppointmentId).emit('peer-disconnected', { role: socket.user.role });
      }
    });
  });
}

export default initVideoCallSocket;