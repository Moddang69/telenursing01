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
    socket.on('connection-state-change', async ({ appointmentId, state }) => {
      const validStates = ['CONNECTING', 'CONNECTED', 'RECONNECTING', 'DISCONNECTED'];
      if (!validStates.includes(state)) return;

      await VideoSession.findOneAndUpdate({ appointmentId }, { $set: { state } });
      socket.to(appointmentId).emit('peer-state-change', { state });
    });

    // ---------- END CALL ----------
    socket.on('end-call', async ({ appointmentId, consultationNote }) => {
      try {
        await VideoSession.findOneAndUpdate(
          { appointmentId },
          { $set: { state: 'CALL_ENDED', endedAt: new Date(), consultationNote: consultationNote || null } }
        );
        await Appointment.findByIdAndUpdate(appointmentId, { $set: { status: 'COMPLETED' } });

        io.to(appointmentId).emit('call-ended', { by: socket.user.role });
        io.socketsLeave(appointmentId);
      } catch (err) {
        socket.emit('error', { message: 'เกิดข้อผิดพลาดในการจบการปรึกษา' });
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
        await VideoSession.findOneAndUpdate(
          { appointmentId: socket.currentAppointmentId },
          { $set: { state: 'DISCONNECTED' } }
        );
        socket.to(socket.currentAppointmentId).emit('peer-disconnected', { role: socket.user.role });
      }
    });
  });
}

export default initVideoCallSocket;