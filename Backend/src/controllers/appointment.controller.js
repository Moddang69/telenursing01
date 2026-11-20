import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Appointment, CareTeam } from '../models/index.js';
import appointmentService from '../services/appointment.service.js';
import { logAudit } from '../middleware/auditLogger.js';
import notificationService from '../services/notification.service.js';

/**
 * appointment.controller.js
 * Map ตรงกับ BookAppointmentPage.jsx, PreConsultFormPage.jsx, NurseAppointmentListPage.jsx
 * preConsult เป็น Embedded Document (Phase 3.2 #7)
 */

// POST /api/appointments/:patientId
// - Nurse สร้างนัดให้ผู้ป่วยใน Care Team ของตน (nurseId = ตัวเอง)
// - Patient จองกับพยาบาลที่ดูแลตนเองอยู่ (หา nurseId จาก Care Team ACTIVE — ไม่เชื่อ nurseId จาก Client)
export const createAppointment = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { date, time, reason, note, dueDateTime: dueDateTimeFromClient } = req.body;

  let nurseId;
  if (req.user.role === 'nurse') {
    nurseId = req.user.roleRefId;
  } else {
    const careTeam = await CareTeam.findOne({ patientId, status: 'ACTIVE' });
    if (!careTeam) throw new ApiError(400, 'ยังไม่มีพยาบาลผู้ดูแล กรุณาเลือกพยาบาลก่อนนัดหมาย');
    nurseId = careTeam.nurseId;
  }

  // ป้องกัน Double-booking ตาม Composite Key (nurseId, date, time) — Phase 3.2 #12
  await appointmentService.checkDoubleBooking({ nurseId, date, time });

  // Client ส่ง dueDateTime (ISO ตามเวลาท้องถิ่นของผู้ใช้) มาด้วยเพื่อกันปัญหา Timezone ของ Server
  const parsedDue = dueDateTimeFromClient ? new Date(dueDateTimeFromClient) : null;
  const dueDateTime =
    parsedDue && !Number.isNaN(parsedDue.getTime())
      ? parsedDue
      : appointmentService.computeDueDateTime(date, time);

  const appointment = await Appointment.create({
    patientId,
    nurseId,
    date,
    time,
    dueDateTime,
    reason: reason || null,
    note: note || null,
    status: 'SCHEDULED',
  });

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Created Appointment for Patient ${patientId} with Nurse ${nurseId}`,
    targetType: 'appointment',
    targetId: appointment._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  // แจ้งเตือนนัดหมายใหม่ (ไม่รอผล — ล้มเหลวต้องไม่กระทบการสร้างนัดหมาย)
  notificationService
    .notifyAppointmentCreated({ appointment, actor: req.user })
    .catch((err) => console.error('notify appointment created failed: - appointment.controller.js:64', err.message));

  res.status(201).json({ success: true, message: 'นัดหมายสำเร็จ', data: appointment });
});

// GET /api/appointments/:patientId  (list)
export const getAppointments = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { status } = req.query;

  const filter = { patientId };
  if (status) filter.status = status;

  const appointments = await Appointment.find(filter)
    .populate('nurseId', 'firstName lastName hospital')
    .sort({ dueDateTime: -1 });

  res.status(200).json({ success: true, data: appointments });
});

// GET /api/appointments/:patientId/:appointmentId
export const getAppointmentById = asyncHandler(async (req, res) => {
  // ต้องเป็นนัดหมายของผู้ป่วยตาม :patientId ที่ผ่านการตรวจสิทธิ์แล้วเท่านั้น (เดิมค้นด้วย appointmentId อย่างเดียว)
  const appointment = await Appointment.findOne({
    _id: req.params.appointmentId,
    patientId: req.params.patientId,
  }).populate('nurseId', 'firstName lastName hospital');
  if (!appointment) throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');
  res.status(200).json({ success: true, data: appointment });
});

// PATCH /api/appointments/:patientId/:appointmentId/status
export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { patientId, appointmentId } = req.params;
  const { status } = req.body;

  // ต้องเป็นนัดหมายของผู้ป่วยตาม :patientId ที่ผ่านการตรวจสิทธิ์แล้วเท่านั้น
  // (เดิมแก้ได้ด้วย appointmentId อย่างเดียว → พยาบาลที่ดูแลผู้ป่วย A ยกเลิกนัดของผู้ป่วย B ได้ถ้ารู้ id)
  const current = await Appointment.findOne({ _id: appointmentId, patientId });
  if (!current) throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');

  if (status === 'CANCELLED') {
    if (current.status === 'CANCELLED') {
      // ยกเลิกไปแล้ว (เช่น กดซ้ำ) — ตอบสำเร็จโดยไม่แจ้งเตือนซ้ำ
      return res.status(200).json({ success: true, message: 'นัดหมายนี้ถูกยกเลิกแล้ว', data: current });
    }
    if (['COMPLETED', 'NO_SHOW', 'IN_CONSULTATION'].includes(current.status)) {
      throw new ApiError(409, 'ไม่สามารถยกเลิกนัดหมายที่เสร็จสิ้นแล้วหรือกำลังให้คำปรึกษาอยู่ได้');
    }
  }

  const appointment = await Appointment.findByIdAndUpdate(
    appointmentId,
    { $set: { status } },
    { new: true }
  );

  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Updated Appointment ${appointmentId} status to ${status}`,
    targetType: 'appointment',
    targetId: appointmentId,
    result: 'Success',
    ipAddress: req.ip,
  });

  if (status === 'CANCELLED') {
    notificationService
      .notifyAppointmentCancelled({ appointment, actor: req.user })
      .catch((err) => console.error('notify appointment cancelled failed: - appointment.controller.js:119', err.message));
  }

  res.status(200).json({ success: true, message: 'อัปเดตสถานะสำเร็จ', data: appointment });
});

// POST /api/appointments/:patientId/:appointmentId/pre-consult
// (Patient กรอกก่อนเข้ารับคำปรึกษา — Embedded Document ตาม Phase 3.2 #7)
export const submitPreConsult = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const {
    location,
    gpsCoordinates,
    emergencyContact,
    latestGlucose,
    latestBP,
    painLevel,
    symptoms,
    otherSymptom,
    hospitalizedLastMonth,
  } = req.body;

  const appointment = await Appointment.findByIdAndUpdate(
    appointmentId,
    {
      $set: {
        preConsult: {
          location: location || null,
          gpsCoordinates: gpsCoordinates || { lat: null, lng: null },
          emergencyContact: emergencyContact || null,
          latestGlucose: latestGlucose || null,
          latestBP: latestBP || null,
          painLevel: painLevel ?? null,
          symptoms: symptoms || [],
          otherSymptom: otherSymptom || null,
          hospitalizedLastMonth: hospitalizedLastMonth ?? null,
          submittedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!appointment) throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');

  res.status(200).json({ success: true, message: 'บันทึกข้อมูลก่อนรับคำปรึกษาสำเร็จ', data: appointment });
});

export default {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  submitPreConsult,
};