import apiClient from '../config/apiClient.js';
import { resolveRange } from '../constants/healthRanges.js';

const SESSION_KEY = 'telenursing_session';

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
}

function resolvePatientId(targetPatientId) {
  return targetPatientId || getCurrentUser().roleRefId;
}

const toDay = (d) => (d ? String(d).slice(0, 10) : d);

/**
 * Backend ส่งข้อมูลเรียง "ใหม่ -> เก่า" แต่ทุกหน้าจอใช้สมมติฐาน "เก่า -> ใหม่"
 * (ค่าล่าสุด = สมาชิกตัวสุดท้าย, slice(-n) = n รายการล่าสุด)
 * จึงเรียงกลับเป็น เก่า -> ใหม่ ที่นี่จุดเดียว ส่วนกราฟจะกลับด้านให้ "ใหม่อยู่ซ้าย" เองใน ChartCard
 */
function sortOldestFirst(list) {
  return [...list].sort((a, b) => {
    const ka = `${toDay(a.date)} ${a.time || '00:00'} ${a.createdAt || ''}`;
    const kb = `${toDay(b.date)} ${b.time || '00:00'} ${b.createdAt || ''}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

async function fetchRecords(patientId, type) {
  const res = await apiClient.get(`/health/${patientId}/records`, { params: { type, limit: 500 } });
  return sortOldestFirst(res.data || []);
}

export const healthService = {
  // =========================================================
  // SMBG (น้ำตาลในเลือด) — บันทึกเป็นช่วง
  // =========================================================
  async getSmbg(targetPatientId) {
    const records = await fetchRecords(resolvePatientId(targetPatientId), 'SMBG');
    return records.map((r) => {
      const range = resolveRange('smbg', r.smbg?.rangeKey, r.smbg?.value);
      return {
        id: r._id,
        date: toDay(r.date),
        time: r.time,
        value: r.smbg?.value, // ค่ากลางช่วง — ใช้พล็อตกราฟ
        rangeKey: range?.key || null,
        rangeLabel: range?.short || null, // เช่น "70 – 99" — ใช้แสดงผล
        severity: r.evaluatedSeverity || range?.severity || 'NORMAL',
        type: r.smbg?.measurementType,
      };
    });
  },

  async addSmbg(entry, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/health/${patientId}/records`, {
      type: 'SMBG',
      date: entry.date,
      time: entry.time,
      unit: 'mg/dL',
      smbg: { rangeKey: entry.rangeKey, measurementType: entry.type || 'other' },
    });
    return res.data;
  },

  // =========================================================
  // Blood Pressure (ความดันโลหิต + ชีพจร) — บันทึกเป็นช่วง
  // =========================================================
  async getBloodPressure(targetPatientId) {
    const records = await fetchRecords(resolvePatientId(targetPatientId), 'BLOOD_PRESSURE');
    return records.map((r) => {
      const bp = r.bloodPressure || {};
      const sys = resolveRange('systolic', bp.systolicRangeKey, bp.systolic);
      const dia = resolveRange('diastolic', bp.diastolicRangeKey, bp.diastolic);
      const pulse = resolveRange('pulse', bp.pulseRangeKey, bp.pulse);
      return {
        id: r._id,
        date: toDay(r.date),
        time: r.time,
        systolic: bp.systolic, // ค่ากลางช่วง — ใช้พล็อตกราฟ
        diastolic: bp.diastolic,
        pulse: bp.pulse ?? null,
        systolicLabel: sys?.short || null,
        diastolicLabel: dia?.short || null,
        pulseLabel: pulse?.short || null,
        severity: r.evaluatedSeverity || 'NORMAL',
      };
    });
  },

  async addBloodPressure(entry, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/health/${patientId}/records`, {
      type: 'BLOOD_PRESSURE',
      date: entry.date,
      time: entry.time,
      unit: 'mmHg',
      bloodPressure: {
        systolicRangeKey: entry.systolicRangeKey,
        diastolicRangeKey: entry.diastolicRangeKey,
        pulseRangeKey: entry.pulseRangeKey || null,
      },
    });
    return res.data;
  },

  // =========================================================
  // HbA1c
  // =========================================================
  async getHbA1c(targetPatientId) {
    const records = await fetchRecords(resolvePatientId(targetPatientId), 'HBA1C');
    return records.map((r) => {
      const range = resolveRange('hba1c', r.hba1c?.rangeKey, r.hba1c?.value);
      return {
        id: r._id,
        date: toDay(r.date),
        value: r.hba1c?.value,
        rangeKey: range?.key || null,
        rangeLabel: range?.short || null,
        severity: r.evaluatedSeverity || range?.severity || 'NORMAL',
      };
    });
  },

  async addHbA1c(entry, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/health/${patientId}/records`, {
      type: 'HBA1C',
      date: entry.date,
      unit: '%',
      hba1c: { rangeKey: entry.rangeKey },
    });
    return res.data;
  },

  // =========================================================
  // LDL
  // =========================================================
  async getLdl(targetPatientId) {
    const records = await fetchRecords(resolvePatientId(targetPatientId), 'LDL');
    return records.map((r) => {
      const range = resolveRange('ldl', r.ldl?.rangeKey, r.ldl?.value);
      return {
        id: r._id,
        date: toDay(r.date),
        value: r.ldl?.value,
        rangeKey: range?.key || null,
        rangeLabel: range?.short || null,
        severity: r.evaluatedSeverity || range?.severity || 'NORMAL',
      };
    });
  },

  // หลายหน้าเรียก getLipid() (ชื่อเดิมที่ไม่เคยมีอยู่จริง → Promise.all พังและหน้าค้าง Loading)
  // คงชื่อนี้ไว้เป็น alias ของ getLdl เพื่อความเข้ากันได้
  async getLipid(targetPatientId) {
    return this.getLdl(targetPatientId);
  },

  async addLdl(entry, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/health/${patientId}/records`, {
      type: 'LDL',
      date: entry.date,
      unit: 'mg/dL',
      ldl: { rangeKey: entry.rangeKey },
    });
    return res.data;
  },

  // =========================================================
  // Meals
  // =========================================================
  async getMeals(targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.get(`/meals/${patientId}`);
    return sortOldestFirst((res.data || []).map((m) => ({ ...m, date: toDay(m.date) })));
  },

  async addMeal(entry, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/meals/${patientId}`, entry);
    return res.data;
  },

  // =========================================================
  // Exercises
  // =========================================================
  async getExercises(targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.get(`/exercises/${patientId}`);
    return sortOldestFirst((res.data || []).map((e) => ({ ...e, date: toDay(e.date) })));
  },

  async addExercise(entry, targetPatientId) {
    const patientId = resolvePatientId(targetPatientId);
    const res = await apiClient.post(`/exercises/${patientId}`, entry);
    return res.data;
  },
};

export default healthService;
