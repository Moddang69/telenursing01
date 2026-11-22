import apiClient from '../config/apiClient.js';

/**
 * nurseService — เชื่อม Backend จริงทั้งหมด (เดิมใช้ mock: data/mockPatientsForNurse.js ฯลฯ)
 *
 * Endpoint ที่ใช้:
 *   GET /nurses/:nurseId/dashboard      สรุปตัวเลขหน้าหลัก
 *   GET /nurses/:nurseId/patients       ผู้ป่วยในความดูแล (เรียงเคสรุนแรงก่อน)
 *   GET /nurses/patients/:patientId     รายละเอียดผู้ป่วย (ผ่าน Care Team + บันทึก Audit Log ที่ Backend)
 *   GET /nurses/:nurseId/analytics      ตัวเลขสรุปการดำเนินงาน
 *   GET /nurses/:nurseId/history        ประวัติการปรึกษาที่เสร็จสิ้น
 */
const SESSION_KEY = 'telenursing_session';

function getNurseId() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}').roleRefId;
}

const fullName = (p) => `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
const day = (d) => (d ? String(d).slice(0, 10) : '');

const RELATIONSHIP_LABEL = {
  father: 'พ่อ',
  mother: 'แม่',
  spouse: 'คู่สมรส',
  daughter: 'บุตรสาว',
  son: 'บุตรชาย',
  sibling: 'พี่น้อง',
};

/** แปลงข้อมูลผู้ป่วยจาก Backend ให้อยู่ในรูปที่หน้าพยาบาลใช้ */
function normalizePatient(p) {
  return {
    ...p,
    patientId: p._id,
    name: fullName(p),
    dob: day(p.dob),
    secondaryContact: [p.secondaryContactNumber, p.emergencyContact && `(${p.emergencyContact})`]
      .filter(Boolean)
      .join(' '),
    caregiverLabel: p.caregiverName
      ? `${p.caregiverName}${
          p.caregiverRelationship
            ? ` (${p.caregiverRelationship === 'other' ? p.caregiverRelationshipOther || 'อื่น ๆ' : RELATIONSHIP_LABEL[p.caregiverRelationship] || p.caregiverRelationship})`
            : ''
        }`
      : '',
    alertSeverity: p.alertSeverity || 'NORMAL',
    latestAbnormal: p.latestAbnormal || null,
  };
}

export const nurseService = {
  async getAssignedPatients() {
    const res = await apiClient.get(`/nurses/${getNurseId()}/patients`);
    return (res.data || []).map(normalizePatient);
  },

  async getPatientDetail(patientId) {
    const res = await apiClient.get(`/nurses/patients/${patientId}`);
    return normalizePatient(res.data);
  },

  // แบบสอบถามก่อนพบพยาบาลของนัดหมายปัจจุบัน (ฝังอยู่ใน Appointment.preConsult)
  // ดึงจากนัดหมายที่ join ได้ตอนนี้ (status ยังไม่เสร็จสิ้น) ไม่ใช่จากนัดหมายเก่า
  async getPreConsultAnswers(patientId) {
    const res = await apiClient.get(`/appointments/${patientId}`);
    const now = Date.now();
    const graceMs = 60 * 60 * 1000; // 60 นาที
    const joinableStatuses = ['SCHEDULED', 'WAITING', 'PATIENT_JOINED', 'NURSE_JOINED', 'IN_CONSULTATION'];

    // หานัดหมายปัจจุบันที่มี preConsult และยังมีสถานะที่เข้าห้องได้
    const currentAppointment = (res.data || [])
      .filter((a) => joinableStatuses.includes(a.status) && a.preConsult?.submittedAt)
      .filter((a) => new Date(a.dueDateTime).getTime() >= now - graceMs)
      .sort((a, b) => new Date(a.dueDateTime) - new Date(b.dueDateTime))[0];

    return currentAppointment?.preConsult || null;
  },

  async getDashboardSummary() {
    const res = await apiClient.get(`/nurses/${getNurseId()}/dashboard`);
    return res.data;
  },

  // เวลารอคอยเฉลี่ย/คะแนนความพึงพอใจ: ระบบยังไม่เก็บข้อมูล Backend จึงคืน null (หน้าจอแสดง "-")
  async getAnalyticsSummary() {
    const res = await apiClient.get(`/nurses/${getNurseId()}/analytics`);
    return res.data;
  },

  async getConsultationHistory() {
    const res = await apiClient.get(`/nurses/${getNurseId()}/history`);
    return (res.data || []).map((a) => ({
      id: a._id,
      patient: fullName(a.patientId),
      hn: a.patientId?.hn,
      date: day(a.dueDateTime || a.date),
      type: 'Video Consultation',
      reason: a.reason,
      note: a.consultationNote || a.note,
    }));
  },

  async getPatientConsultationHistory(patientId) {
    const res = await apiClient.get(`/nurses/patients/${patientId}/consultation-history`);
    return (res.data || []).map((a) => ({
      id: a._id,
      date: day(a.dueDateTime || a.date),
      reason: a.reason,
      note: a.consultationNote || a.note,
    }));
  },

  // ดึงรายการคะแนนความพึงพอใจทั้งหมดของพยาบาล
  async getSatisfactionRatings() {
    const res = await apiClient.get(`/satisfaction-ratings/nurse/${getNurseId()}`);
    return res.data || [];
  },

  // ปิดเคสผู้ป่วย
  async closeCase(patientId, closureReason, otherReason) {
    const res = await apiClient.post('/case-closures', {
      patientId,
      closureReason,
      otherReason,
    });
    return res.data;
  },

  // ดึงประวัติการปิดเคส
  async getCaseClosures() {
    const res = await apiClient.get(`/case-closures/nurse/${getNurseId()}`);
    return res.data || [];
  },
};

export default nurseService;
