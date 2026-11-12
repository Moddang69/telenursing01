import apiClient from '../config/apiClient.js';

const SESSION_KEY = 'telenursing_session';

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
}

function resolvePatientId(targetPatientId) {
  return targetPatientId || getCurrentUser().roleRefId;
}

const pad = (n) => String(n).padStart(2, '0');
const toLocalDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const entityId = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);
const fullName = (p) => (p && typeof p === 'object' ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '');

/**
 * แปลง Appointment จาก Backend ให้อยู่ในรูปที่หน้าจอใช้
 * (Backend ส่ง nurseId/patientId เป็น object ที่ populate แล้ว, date เป็น ISO, ใช้ _id)
 */
export function normalizeAppointment(a) {
  const due = a.dueDateTime ? new Date(a.dueDateTime) : null;
  const patient = a.patientId && typeof a.patientId === 'object' ? a.patientId : null;
  return {
    ...a,
    id: a._id,
    patientId: entityId(a.patientId),
    patientName: fullName(a.patientId),
    hn: patient?.hn || null,
    nurseName: fullName(a.nurseId),
    date: due ? toLocalDay(due) : String(a.date || '').slice(0, 10), // วันที่ตามเวลาท้องถิ่นของผู้ใช้
    time: a.time,
  };
}

export const appointmentService = {
  // นัดหมาย "ใกล้ที่สุดที่ยังไม่ผ่าน" ของผู้ป่วย — Backend ไม่มี endpoint /upcoming จึงกรองฝั่ง Frontend
  async getUpcomingAppointment(targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.get(`/appointments/${patientId}`, {
      params: { status: 'SCHEDULED' },
    });
    const now = new Date();

    const upcoming = (res.data || [])
      .filter((a) => new Date(a.dueDateTime) >= now)
      .sort((a, b) => new Date(a.dueDateTime) - new Date(b.dueDateTime));

    return upcoming[0] ? normalizeAppointment(upcoming[0]) : null;
  },

  // สำหรับ Nurse: คิวนัดหมายของตนเอง (ตั้งแต่วันนี้เป็นต้นไป) จัดกลุ่มตามวัน — { 'วันจันทร์ที่ ...': [appointment, ...] }
  async getQueueGroupedByDay() {
    const nurseId = getCurrentUser().roleRefId;
    const res = await apiClient.get(`/nurses/${nurseId}/appointments`);

    const groups = {};
    (res.data || []).map(normalizeAppointment).forEach((apt) => {
      const key = new Date(`${apt.date}T00:00:00`).toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      (groups[key] = groups[key] || []).push(apt);
    });
    return groups;
  },

  async getAppointments(targetPatientId, params = {}) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.get(`/appointments/${patientId}`, { params });
    return (res.data || []).map(normalizeAppointment);
  },

  // Nurse ต้องส่ง targetPatientId เสมอ (ไม่เช่นนั้นจะใช้ id ของพยาบาลเอง)
  async createAppointment(data, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/appointments/${patientId}`, data);
    return res.data;
  },

  async updateAppointmentStatus(appointmentId, status, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.patch(`/appointments/${patientId}/${appointmentId}/status`, { status });
    return res.data;
  },

  async submitPreConsult(appointmentId, payload, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/appointments/${patientId}/${appointmentId}/pre-consult`, payload);
    return res.data;
  },
};

export default appointmentService;
