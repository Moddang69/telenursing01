import apiClient from '../config/apiClient.js';

function normalizeNurse(n) {
  return { ...n, id: n.id || n._id };
}

export const assignmentService = {
  async getAvailableNurses() {
    const res = await apiClient.get('/nurses/available');
    return (res.data || []).map(normalizeNurse);
  },

  async selectNurse({ patientId, nurseId }) {
    const res = await apiClient.post('/assignments', { patientId, nurseId });
    return res.data;
  },

  async reassignNurse({ patientId, nurseId, reason }) {
    const res = await apiClient.patch(`/admin/patients/${patientId}/reassign`, { nurseId, reason });
    return res.data;
  },

  // ใช้โดย PatientProfilePage.jsx — ผู้ป่วยขอเปลี่ยนพยาบาลผู้ดูแล (ต้องผ่าน Admin อนุมัติ)
  async requestNurseChange({ requestedNurseId, reason }) {
    const res = await apiClient.post('/data-requests', {
      type: 'NURSE_CHANGE',
      requestedNurseId,
      reason,
    });
    return {
      ...res.data,
      status: res.data.status === 'REQUESTED' ? 'PENDING' : res.data.status,
    };
  },

  // ใช้โดย PatientProfilePage.jsx — ดูคำขอเปลี่ยนพยาบาลที่ยังค้างอยู่ของตนเอง (ถ้ามี)
  async getMyNurseChangeRequest() {
    const res = await apiClient.get('/data-requests/my');
    const list = res.data || [];
    const pending = list.find((r) => r.type === 'NURSE_CHANGE' && ['REQUESTED', 'UNDER_REVIEW'].includes(r.status));
    if (!pending) return null;
    const nurse = pending.requestedNurseId;
    return {
      ...pending,
      status: 'PENDING',
      requestedNurseName: nurse && typeof nurse === 'object' ? `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() : null,
    };
  },
};

export default assignmentService;