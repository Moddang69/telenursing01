import { Appointment } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * appointment.service.js
 * Business Logic การนัดหมาย — ตรวจ Double-booking ด้วย Composite Key (nurseId, date, time) ตาม Phase 3.2 #12
 */

export async function checkDoubleBooking({ nurseId, date, time, excludeAppointmentId = null }) {
  const filter = {
    nurseId,
    date: new Date(date),
    time,
    status: { $nin: ['CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'] },
  };
  if (excludeAppointmentId) filter._id = { $ne: excludeAppointmentId };

  const conflict = await Appointment.findOne(filter);
  if (conflict) {
    throw new ApiError(409, 'ช่วงเวลานี้พยาบาลมีนัดหมายอื่นอยู่แล้ว กรุณาเลือกเวลาอื่น');
  }
}

export function computeDueDateTime(date, time) {
  const [hh, mm] = time.split(':').map(Number);
  const due = new Date(date);
  due.setHours(hh, mm, 0, 0);
  return due;
}

export default { checkDoubleBooking, computeDueDateTime };
