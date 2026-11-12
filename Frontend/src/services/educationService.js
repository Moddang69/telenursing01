import apiClient from '../config/apiClient.js';

// Backend ส่งเอกสาร MongoDB กลับมาเป็น `_id` (ไม่ใช่ `id`)
// แต่หน้าจอฝั่งผู้ป่วย/ผู้ดูแลอ่านค่าจาก `ed.id` ทำให้ได้ undefined เสมอ
// เมื่อกดปุ่ม "เริ่มเรียน" จึงยิง PATCH ไปที่ /educations/:patientId/undefined/status
// Backend ปฏิเสธคำขอ (validation error) และสถานะเลยไม่ถูกอัปเดต
// แก้โดย normalize ให้มีทั้ง `id` และ `_id` เพื่อให้ใช้ได้ทั้งสองแบบไม่กระทบหน้าที่ใช้ `_id` อยู่แล้ว
const normalize = (doc) => (doc && doc._id ? { ...doc, id: doc._id } : doc);
const normalizeList = (list) => (Array.isArray(list) ? list.map(normalize) : list);

export const educationService = {
    async getEducationList(patientId) {
        const res = await apiClient.get(`/educations/${patientId}`);
        return normalizeList(res.data);
    },
    async assignEducation(patientId, payload) {
        const res = await apiClient.post(`/educations/${patientId}`, payload);
        return normalize(res.data);
    },
    async getEducations(patientId, params = {}) {
        const res = await apiClient.get(`/educations/${patientId}`, { params });
        return normalizeList(res.data);
    },
    async updateEducationStatus(patientId, educationId, status) {
        const res = await apiClient.patch(`/educations/${patientId}/${educationId}/status`, { status });
        return normalize(res.data);
    }
};