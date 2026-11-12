import apiClient from '../config/apiClient.js';
import { getPatientProfile } from './patientService.js';

export const caregiverService = {
  async getCaregiver(caregiverId) {
    const res = await apiClient.get(`/caregivers/${caregiverId}`);
    return res.data;
  },

  async updateCaregiverProfile(caregiverId, updates) {
    const res = await apiClient.patch(`/caregivers/${caregiverId}`, updates);
    return res.data;
  },

  // ผู้ดูแลไม่ต้องรู้ HN ของผู้ป่วย — ระบุด้วย ชื่อ + นามสกุล + เบอร์โทรศัพท์ของผู้ป่วยแทน
  async requestLink(caregiverId, { patientFirstName, patientLastName, patientPhone, relationship }) {
    const res = await apiClient.post(`/caregivers/${caregiverId}/links`, {
      patientFirstName,
      patientLastName,
      patientPhone,
      relationship,
    });
    return res.data;
  },

  async getMyLinks(caregiverId) {
    const res = await apiClient.get(`/caregivers/${caregiverId}/links`);
    return res.data;
  },

  async getLinkedPatient(caregiverId) {
    const links = await this.getMyLinks(caregiverId);
    const activeLink = (links || []).find((l) => l.status === 'ACTIVE');
    if (!activeLink) return null;

    const patientRef = activeLink.patientId;
    const patientId = typeof patientRef === 'object' ? patientRef._id : patientRef;
    const profile = await getPatientProfile(patientId);

    return {
      ...profile,
      patientId,
      patientName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      patientHn: profile.hn,
      relationship: activeLink.relationship,
      caregiverLinkId: activeLink._id || activeLink.id,
      permissions: activeLink.permissions || {},
    };
  },

  async approveLink(linkId, permissions) {
    const res = await apiClient.patch(`/caregivers/links/${linkId}/approve`, { permissions });
    return res.data;
  },

  async revokeLink(linkId) {
    const res = await apiClient.patch(`/caregivers/links/${linkId}/revoke`);
    return res.data;
  },

  async updatePermissions(linkId, permissions) {
    const res = await apiClient.patch(`/caregivers/links/${linkId}/permissions`, { permissions });
    return res.data;
  },
};

export default caregiverService;
