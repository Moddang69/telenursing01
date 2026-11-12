import apiClient from '../config/apiClient.js';

export const consentService = {
  // ใช้โดย ConsentPage.jsx (ผู้ป่วยยินยอมให้เก็บ/ใช้ข้อมูล)
  async giveConsent(payload = {}) {
    const type = payload.type || 'PATIENT_DATA_CONSENT';
    const version = payload.version || payload.consentVersion;
    const res = await apiClient.post('/consents', { type, version });
    return res.data;
  },

  // ใช้โดย ConsentWithdrawalDialog.jsx (ผู้ป่วยถอนความยินยอม)
  async withdrawConsent(payload) {
    const withdrawReason =
      typeof payload === 'string' ? payload : payload?.reason ?? payload?.withdrawReason ?? null;
    const res = await apiClient.patch('/consents/withdraw', { withdrawReason });
    return res.data;
  },

  async getConsentHistory() {
    const res = await apiClient.get('/consents/history');
    return res.data;
  },

  // ใช้โดย NurseConfidentialityPage.jsx (พยาบาลยอมรับนโยบายความลับผู้ป่วย)
  // เดิมยิง endpoint /consents/confidentiality/accept ที่ไม่มีจริง — แก้ให้ใช้ POST /consents เหมือนกันแต่ type ต่างกัน
  async acceptConfidentiality(payload = {}) {
    const version = payload.version || payload.consentVersion;
    const res = await apiClient.post('/consents', { type: 'NURSE_CONFIDENTIALITY', version });
    return res.data;
  },
};

export default consentService;
