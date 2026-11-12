import ApiError from '../utils/ApiError.js';
import { Appointment } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * verifyAppointmentOwnership.js
 * ใช้กับ Route ที่มี :appointmentId (VideoSession) — ตรวจว่า user ที่ login
 * เป็น patient หรือ nurse ที่ผูกกับ Appointment นี้จริง (ไม่ใช่ appointment ของคนอื่น)
 * Admin ผ่านได้เสมอ (RBAC Matrix Phase 4.4)
 */
export const verifyAppointmentOwnership = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') return next();

  const { appointmentId } = req.params;
  const appointment = await Appointment.findById(appointmentId).select('patientId nurseId');
  if (!appointment) throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');

  const isOwner =
    (req.user.role === 'patient' && req.user.roleRefId === appointment.patientId.toString()) ||
    (req.user.role === 'nurse' && req.user.roleRefId === appointment.nurseId.toString());

  if (!isOwner) {
    throw new ApiError(403, 'คุณไม่มีสิทธิ์เข้าถึงการนัดหมายนี้');
  }

  req.appointmentContext = appointment;
  next();
});

export default verifyAppointmentOwnership;
