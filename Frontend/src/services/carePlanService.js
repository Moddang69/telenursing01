import apiClient from '../config/apiClient.js';

// Backend ส่งเอกสาร MongoDB กลับมาเป็น `_id` (ไม่ใช่ `id`)
// แต่บางหน้าจอ (เช่น MyCarePage.jsx) อ่านค่าจาก `cp.id` ซึ่งไม่มีจริง — เพื่อป้องกันบั๊กแบบเดียวกับ
// educationService (กดปุ่มแล้วส่ง id เป็น undefined ไปที่ Backend) จึง normalize ให้มีทั้ง
// `id` และ `_id` เพื่อใช้ได้ทั้งสองแบบ ไม่กระทบหน้าที่ใช้ `_id` ตรงๆ อยู่แล้ว (เช่นฝั่งพยาบาล)
const normalize = (doc) => (doc && doc._id ? { ...doc, id: doc._id } : doc);
const normalizeList = (list) => (Array.isArray(list) ? list.map(normalize) : list);

export const carePlanService = {
  async createCarePlan(patientId, payload) {
    const res = await apiClient.post(`/care-plans/${patientId}`, payload);
    return normalize(res.data);
  },

  async getCarePlans(patientId, params = {}) {
    const res = await apiClient.get(`/care-plans/${patientId}`, { params });
    return normalizeList(res.data);
  },

  async updateCarePlan(patientId, carePlanId, updates) {
    const res = await apiClient.patch(`/care-plans/${patientId}/${carePlanId}`, updates);
    return normalize(res.data);
  }
};