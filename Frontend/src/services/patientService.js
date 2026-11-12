import apiClient from '../config/apiClient.js';

export async function getPatientProfile(patientId) {
  const res = await apiClient.get(`/patients/${patientId}`);
  return res.data;
}

export async function getCareTeamHistory(patientId) {
  const res = await apiClient.get(`/patients/${patientId}/care-team-history`);
  return res.data;
}

export default { getPatientProfile, getCareTeamHistory };
