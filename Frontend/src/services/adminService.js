import apiClient from '../config/apiClient.js';

function nurseName(n) {
  if (!n) return '';
  return `${n.firstName || ''} ${n.lastName || ''}`.trim();
}

function normalizeNurse(n) {
  return { ...n, id: n.id || n._id, name: nurseName(n) };
}

function normalizePatient(p) {
  return {
    ...p,
    id: p.id || p._id,
    name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
    assignedNurseName: p.assignedNurseId ? nurseName(p.assignedNurseId) : null,
  };
}

function normalizeAuditLog(log) {
  const target = [log.targetType, log.targetId].filter(Boolean).join(':');
  return {
    ...log,
    id: log.id || log._id,
    user: log.userName,
    target: target || '-',
    datetime: log.createdAt ? new Date(log.createdAt).toLocaleString('th-TH') : '',
  };
}

function normalizeDataRequest(r) {
  const patient = r.patientId && typeof r.patientId === 'object' ? r.patientId : null;
  const currentNurse = r.currentNurseId && typeof r.currentNurseId === 'object' ? r.currentNurseId : null;
  // 🔧 แก้แล้วที่ Backend: เพิ่ม field requestedNurseId ใน DataRequest model + populate ให้แล้ว
  // (ดู Backend/src/models/DataRequest.js, controllers/dataRequest.controller.js)
  const requestedNurse = r.requestedNurseId && typeof r.requestedNurseId === 'object' ? r.requestedNurseId : null;
  return {
    ...r,
    id: r.id || r._id,
    patientName: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : r.patientName,
    patientHn: patient?.hn || r.patientHn,
    categories: r.requestedFields || [],
    currentNurseName: currentNurse ? nurseName(currentNurse) : r.currentNurseName,
    requestedNurseName: requestedNurse ? nurseName(requestedNurse) : (r.requestedNurseName || 'ไม่ระบุ'),
    requestedAt: r.requestedAt ? new Date(r.requestedAt).toLocaleDateString('th-TH') : '',
  };
}

const RELATIONSHIP_LABEL = {
  parent: 'พ่อ/แม่',
  spouse: 'คู่สมรส',
  child: 'บุตร',
  sibling: 'พี่น้อง',
  other: 'อื่น ๆ',
};

// คำขอเชื่อมโยงผู้ดูแล <-> ผู้ป่วย ที่ยังไม่มีใครกดอนุมัติ (Backend ส่ง caregiverId/patientId
// เป็น object ที่ populate ชื่อ-เบอร์โทร/HN มาให้แล้ว จึงดึงชื่อที่อ่านง่ายมาแสดงตรงนี้)
function normalizeCaregiverLink(l) {
  const caregiver = l.caregiverId && typeof l.caregiverId === 'object' ? l.caregiverId : null;
  const patient = l.patientId && typeof l.patientId === 'object' ? l.patientId : null;
  return {
    ...l,
    id: l.id || l._id,
    caregiverId: caregiver ? caregiver._id : l.caregiverId,
    caregiverName: caregiver ? `${caregiver.firstName || ''} ${caregiver.lastName || ''}`.trim() : '-',
    caregiverPhone: caregiver?.phone || '-',
    patientId: patient ? patient._id : l.patientId,
    patientName: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : '-',
    patientHn: patient?.hn || '-',
    relationshipLabel: RELATIONSHIP_LABEL[l.relationship] || l.relationship || '-',
    requestedAt: l.createdAt ? new Date(l.createdAt).toLocaleString('th-TH') : '',
  };
}

export const adminService = {
  // ---------- Dashboard ----------
  async getDashboardSummary() {
    const res = await apiClient.get('/admin/dashboard-summary');
    return res.data;
  },

  // ---------- Nurses ----------
  async getNurses() {
    const res = await apiClient.get('/admin/nurses');
    return (res.data || []).map(normalizeNurse);
  },

  async listPendingNurses() {
    const res = await apiClient.get('/admin/nurses/pending');
    return (res.data || []).map(normalizeNurse);
  },

  async processNurseApproval(nurseId, action, reason) {
    const res = await apiClient.patch(`/admin/nurses/${nurseId}/approval`, { action, reason });
    return res.data;
  },

  async approveNurse(nurseId) {
    return this.processNurseApproval(nurseId, 'APPROVED');
  },

  async rejectNurse(nurseId, reason) {
    return this.processNurseApproval(nurseId, 'REJECTED', reason);
  },

  async suspendNurse(nurseId, reason) {
    return this.processNurseApproval(nurseId, 'SUSPENDED', reason);
  },

  async reactivateNurse(nurseId) {
    return this.processNurseApproval(nurseId, 'REACTIVATED');
  },

  // ---------- Patients ----------
  async searchPatients(q = '') {
    const res = await apiClient.get('/admin/patients', { params: q ? { q } : {} });
    return (res.data || []).map(normalizePatient);
  },

  async reassignNurse({ patientId, newNurseId, nurseId, reason }) {
    const res = await apiClient.patch(`/admin/patients/${patientId}/reassign`, {
      nurseId: newNurseId || nurseId,
      reason,
    });
    return res.data;
  },

  // ---------- Users ----------
  async listUsers(params = {}) {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },

  async suspendUser(userId, reason) {
    const res = await apiClient.patch(`/admin/users/${userId}/suspend`, { reason });
    return res.data;
  },

  // ---------- Audit Log ----------
  async getAuditLogs(params = {}) {
    const res = await apiClient.get('/admin/audit-logs', { params });
    return (res.data || []).map(normalizeAuditLog);
  },

  // ---------- Data Requests (รวม DATA_DELETION / CONSENT_WITHDRAWAL / NURSE_CHANGE) ----------
  async getAllDataRequests(params = {}) {
    const res = await apiClient.get('/data-requests', { params });
    return (res.data || []).map(normalizeDataRequest);
  },

  // ใช้โดยส่วนบนสุดของ AdminDataRequestsPage.jsx (คำขอทั่วไป: DATA_DELETION + CONSENT_WITHDRAWAL)
  async getDataRequests() {
    const all = await this.getAllDataRequests();
    return all.filter((r) => r.type !== 'NURSE_CHANGE');
  },

  async getNurseChangeRequests() {
    return this.getAllDataRequests({ type: 'NURSE_CHANGE' });
  },

  async getPatientDataDeletionRequests() {
    return this.getAllDataRequests({ type: 'DATA_DELETION' });
  },

  async processDataRequest(requestId, action, adminNote) {
    // Backend รับ decision เป็น 'CONFIRMED' | 'REJECTED' เท่านั้น
    // หน้าเพจเดิมส่ง action เป็น 'approve' | 'reject' (ตัวพิมพ์เล็ก) — map ให้ตรงกันตรงนี้
    const decision = String(action).toUpperCase() === 'REJECT' || String(action).toUpperCase() === 'REJECTED'
      ? 'REJECTED'
      : 'CONFIRMED';
    const res = await apiClient.patch(`/data-requests/${requestId}/process`, { decision, adminNote });
    return res.data;
  },

  async approveNurseChangeRequest(requestId) {
    return this.processDataRequest(requestId, 'approve');
  },

  async rejectNurseChangeRequest(requestId, reason) {
    return this.processDataRequest(requestId, 'reject', reason);
  },

  async approvePatientDataDeletion(requestId) {
    return this.processDataRequest(requestId, 'approve');
  },

  async rejectPatientDataDeletion(requestId, reason) {
    return this.processDataRequest(requestId, 'reject', reason);
  },

    // ---------- Caregiver Link Approval (ผู้ดูแล <-> ผู้ป่วย) ----------
  async getPendingCaregiverLinks() {
    const res = await apiClient.get('/admin/caregiver-links/pending');
    return (res.data || []).map(normalizeCaregiverLink);
  },
};

export default adminService;
