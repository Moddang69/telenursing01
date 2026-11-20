import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { VideoSession, Appointment, Patient } from '../models/index.js';
import { buildRtcToken } from '../services/agora.service.js';
import { logAudit } from '../middleware/auditLogger.js';

/**
 * videoSession.controller.js
 * REST ใช้จัดการ Metadata ของ Session (สร้าง/ปิด/บันทึกสรุป)
 * ส่วน Real-time Signaling (offer/answer/ice-candidate) ทำผ่าน Socket.io ทั้งหมด (videoCallSocket.js)
 */

// POST /api/video-sessions/:appointmentId  (สร้าง Session ใหม่ ถ้ายังไม่มี — เรียกตอนกด "เข้าร่วม")
export const createOrGetVideoSession = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');

  let session = await VideoSession.findOne({ appointmentId });
  if (!session) {
    session = await VideoSession.create({
      appointmentId,
      patientId: appointment.patientId,
      nurseId: appointment.nurseId,
      state: 'WAITING_FOR_NURSE',
    });
  } else if (session.state === 'CALL_ENDED' && appointment.status !== 'COMPLETED') {
    // session ถูกปิดไปแต่นัดหมายยังไม่เสร็จสิ้น (เช่น วางสายก่อนคู่สนทนาเข้า) → เปิดให้เข้าห้องใหม่ได้
    session.state = 'WAITING_FOR_NURSE';
    session.endedAt = null;
    session.connectedAt = null;
    await session.save();
  }

  res.status(200).json({ success: true, data: session });
});

// GET /api/video-sessions/:appointmentId
export const getVideoSession = asyncHandler(async (req, res) => {
  const session = await VideoSession.findOne({ appointmentId: req.params.appointmentId });
  if (!session) throw new ApiError(404, 'ไม่พบข้อมูล Video Session');
  res.status(200).json({ success: true, data: session });
});

// PATCH /api/video-sessions/:appointmentId/end  (Nurse บันทึกสรุปการปรึกษา + ปิด Session)
export const endVideoSession = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { consultationNote, wasConnected } = req.body;

  const existing = await VideoSession.findOne({ appointmentId });
  if (!existing) throw new ApiError(404, 'ไม่พบข้อมูล Video Session');

  // คู่สนทนายังไม่เคยเชื่อมต่อกัน → เป็นแค่การออกจากห้อง: ไม่ปิดนัดหมาย/ไม่บันทึกสรุป และเข้าร่วมใหม่ได้
  const happened = !!existing.connectedAt || wasConnected === true || wasConnected === 'true';
  if (!happened) {
    if (existing.state !== 'CALL_ENDED') {
      existing.state = 'WAITING_FOR_NURSE';
      existing.endedAt = null;
      await existing.save();
    }
    return res.status(200).json({
      success: true,
      message: 'ออกจากห้องแล้ว (ยังไม่เริ่มการปรึกษา จึงยังไม่ปิดนัดหมาย)',
      completed: false,
      data: existing,
    });
  }

  const session = await VideoSession.findOneAndUpdate(
    { appointmentId },
    {
      $set: {
        state: 'CALL_ENDED',
        endedAt: new Date(),
        consultationNote: consultationNote || null,
        ...(existing.connectedAt ? {} : { connectedAt: new Date() }),
      },
    },
    { new: true }
  );

  // ไม่ทับสถานะที่ถูกยกเลิก/เลื่อน/ไม่มาตามนัดไปแล้ว
  await Appointment.updateOne(
    { _id: appointmentId, status: { $nin: ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'] } },
    { $set: { status: 'COMPLETED' } }
  );

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Ended Video Session for Appointment ${appointmentId}`,
    targetType: 'videosession',
    targetId: session._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'จบการปรึกษาสำเร็จ', completed: true, data: session });
});

// POST /api/video-sessions/:appointmentId/agora-token  (ออก RTC Token สำหรับเข้าห้อง Agora)
// ผ่าน authenticate + verifyAppointmentOwnership มาแล้ว → เฉพาะ patient/nurse เจ้าของนัดหมายเท่านั้นที่ได้ Token
export const getAgoraToken = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId).select('patientId nurseId status');
  if (!appointment) throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');

  if (['CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'].includes(appointment.status)) {
    throw new ApiError(409, 'การนัดหมายนี้สิ้นสุดหรือถูกยกเลิกแล้ว ไม่สามารถเข้าห้องวิดีโอคอลได้');
  }

  // ผู้ป่วยที่ถอนความยินยอมแล้ว ห้ามเริ่มการปรึกษาใหม่ (ภาพ/เสียงเป็นข้อมูลสุขภาพ)
  const patient = await Patient.findById(appointment.patientId).select('consentStatus');
  if (patient?.consentStatus === 'CONSENT_WITHDRAWN') {
    throw new ApiError(403, 'ผู้ป่วยรายนี้ได้ถอนความยินยอมแล้ว ไม่สามารถเริ่มวิดีโอคอลได้');
  }

  const data = buildRtcToken({ channelName: appointmentId });

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Issued Agora RTC token for Appointment ${appointmentId}`,
    targetType: 'videosession',
    targetId: appointmentId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data });
});

export default { createOrGetVideoSession, getVideoSession, endVideoSession, getAgoraToken };