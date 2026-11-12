import apiClient from '../config/apiClient.js';

export const dataRequestService = {
  async createDataRequest(payload) {
    const res = await apiClient.post('/data-requests', payload);
    return res.data;
  },

  async getMyDataRequests() {
    const res = await apiClient.get('/data-requests/my');
    return res.data;
  },

  // ใช้โดย PatientProfilePage.jsx — ผู้ป่วยขอให้ลบข้อมูลส่วนบุคคลบางหมวด (ต้องผ่าน Admin อนุมัติ)
  async requestDataDeletion({ categories, reason }) {
    const res = await apiClient.post('/data-requests', {
      type: 'DATA_DELETION',
      requestedFields: categories,
      reason,
    });
    return {
      ...res.data,
      status: res.data.status === 'REQUESTED' ? 'PENDING' : res.data.status,
    };
  },

  // ใช้โดย PatientProfilePage.jsx — ดูคำขอลบข้อมูลที่ยังค้างอยู่ของตนเอง (ถ้ามี)
  async getMyDataDeletionRequest() {
    const res = await apiClient.get('/data-requests/my');
    const list = res.data || [];
    const pending = list.find((r) => r.type === 'DATA_DELETION' && ['REQUESTED', 'UNDER_REVIEW'].includes(r.status));
    if (!pending) return null;
    return { ...pending, status: 'PENDING', categories: pending.requestedFields || [] };
  },
};

export default dataRequestService;
