import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Nurse, CareTeam, Patient, HealthRecord, Appointment } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';
import { getRange, SEVERITY_ORDER } from '../constants/healthRanges.js';

/**
 * nurse.controller.js
 * Map ตรงกับ NurseHomePage, NursePatientListPage, NursePatientDetailPage, NurseAppointmentsPage, NurseHistoryPage
 * ทุก endpoint ที่มี :patientId ต้องผ่าน verifyCareTeamAccess middleware ก่อนเสมอ (Phase 4.5)
 * ทุก endpoint ที่มี :nurseId ต้องผ่าน verifyNurseSelf (พยาบาลดูได้เฉพาะข้อมูลของตนเอง)
 */

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const sevIdx = (s) => SEVERITY_ORDER.indexOf(s);

/** แปลงค่าล่าสุดของ record ให้เป็นข้อความที่พยาบาลอ่านได้ (ใช้ช่วงที่เลือก ถ้าเป็นข้อมูลเก่าใช้ตัวเลข) */
function describeRecord(rec) {
  switch (rec.type) {
    case 'SMBG': {
      const r = getRange('smbg', rec.smbg?.rangeKey);
      return { metric: 'SMBG', value: r ? r.short : rec.smbg?.value, unit: 'mg/dL' };
    }
    case 'BLOOD_PRESSURE': {
      const s = getRange('systolic', rec.bloodPressure?.systolicRangeKey);
      const d = getRange('diastolic', rec.bloodPressure?.diastolicRangeKey);
      const value =
        s && d ? `${s.short} / ${d.short}` : `${rec.bloodPressure?.systolic}/${rec.bloodPressure?.diastolic}`;
      return { metric: 'Blood Pressure', value, unit: 'mmHg' };
    }
    case 'HBA1C': {
      const r = getRange('hba1c', rec.hba1c?.rangeKey);
      return { metric: 'HbA1c', value: r ? r.short : rec.hba1c?.value, unit: '%' };
    }
    case 'LDL': {
      const r = getRange('ldl', rec.ldl?.rangeKey);
      return { metric: 'LDL', value: r ? r.short : rec.ldl?.value, unit: 'mg/dL' };
    }
    default:
      return { metric: rec.type, value: null, unit: '' };
  }
}

/**
 * สรุป Alert ของผู้ป่วยแต่ละคนจาก "ค่าล่าสุดของแต่ละชนิด" (SMBG/BP/HbA1c/LDL)
 * คืน Map<patientIdString, { alertSeverity, latestAbnormal, lastUpdated }>
 */
async function buildAlertMap(patientIds) {
  const map = new Map();
  if (!patientIds.length) return map;

  const latest = await HealthRecord.aggregate([
    { $match: { patientId: { $in: patientIds } } },
    { $sort: { date: -1, time: -1, createdAt: -1 } },
    { $group: { _id: { patientId: '$patientId', type: '$type' }, doc: { $first: '$$ROOT' } } },
  ]);

  for (const row of latest) {
    const rec = row.doc;
    const key = rec.patientId.toString();
    const severity = rec.evaluatedSeverity || 'NORMAL';
    const current = map.get(key) || { alertSeverity: 'NORMAL', latestAbnormal: null, lastUpdated: null };

    if (!current.lastUpdated || rec.createdAt > current.lastUpdated) current.lastUpdated = rec.createdAt;
    if (sevIdx(severity) > sevIdx(current.alertSeverity)) {
      current.alertSeverity = severity;
      current.latestAbnormal = describeRecord(rec);
    }
    map.set(key, current);
  }
  return map;
}

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

async function getActivePatientIds(nurseId) {
  const teams = await CareTeam.find({ nurseId, status: 'ACTIVE' }).select('patientId');
  return teams.map((t) => t.patientId);
}

// ---------------------------------------------------------------
// GET /api/nurses/:nurseId  (Profile ของตนเอง)
// ---------------------------------------------------------------
export const getNurseProfile = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;
  const nurse = await Nurse.findById(nurseId);
  if (!nurse) throw new ApiError(404, 'ไม่พบข้อมูลพยาบาล');
  res.status(200).json({ success: true, data: nurse });
});

// PATCH /api/nurses/:nurseId
export const updateNurseProfile = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;
  const allowedFields = ['phone', 'position', 'expertise', 'department', 'ward'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const nurse = await Nurse.findByIdAndUpdate(nurseId, { $set: updates }, { new: true });
  if (!nurse) throw new ApiError(404, 'ไม่พบข้อมูลพยาบาล');

  res.status(200).json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: nurse });
});

// ---------------------------------------------------------------
// GET /api/nurses/:nurseId/patients  (Assigned Patients + สรุป Alert)
// ---------------------------------------------------------------
export const getAssignedPatients = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  // Data Scoping สำคัญ: Query จาก careteams เท่านั้น ไม่ query patients ตรงๆ (Phase 4.5)
  const patientIds = await getActivePatientIds(nurseId);

  const patients = await Patient.find({ _id: { $in: patientIds } }).select(
    'firstName lastName hn dob gender consentStatus'
  );
  const alerts = await buildAlertMap(patientIds);

  const data = patients
    .map((p) => {
      const alert = alerts.get(p._id.toString());
      return {
        ...p.toObject(),
        alertSeverity: alert?.alertSeverity || 'NORMAL',
        latestAbnormal: alert?.latestAbnormal || null,
        lastUpdated: alert?.lastUpdated || null,
      };
    })
    .sort((a, b) => sevIdx(b.alertSeverity) - sevIdx(a.alertSeverity)); // เคสรุนแรงขึ้นก่อน

  res.status(200).json({ success: true, data });
});

// ---------------------------------------------------------------
// GET /api/nurses/patients/:patientId  (ผ่าน verifyCareTeamAccess แล้ว)
// ---------------------------------------------------------------
export const getPatientDetailForNurse = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');

  const alerts = await buildAlertMap([patient._id]);
  const alert = alerts.get(patientId);

  // บันทึก Audit Log ทุกครั้งที่ Nurse เปิดดู Patient Detail (Phase 4.7 — Mandatory Event)
  await logAudit({
    userId: req.user.userId,
    userName: req.user.role,
    action: `Viewed Patient ${patient.firstName} ${patient.lastName}`,
    targetType: 'patient',
    targetId: patientId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    data: {
      ...patient.toObject(),
      alertSeverity: alert?.alertSeverity || 'NORMAL',
      latestAbnormal: alert?.latestAbnormal || null,
      lastUpdated: alert?.lastUpdated || null,
    },
  });
});

// ---------------------------------------------------------------
// GET /api/nurses/:nurseId/dashboard
// ---------------------------------------------------------------
export const getNurseDashboard = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const patientIds = await getActivePatientIds(nurseId);
  const alerts = await buildAlertMap(patientIds);

  let activeAlerts = 0;
  let criticalCases = 0;
  for (const a of alerts.values()) {
    if (a.alertSeverity !== 'NORMAL') activeAlerts += 1;
    if (a.alertSeverity === 'CRITICAL') criticalCases += 1;
  }

  const dayStart = startOfDay();
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const todaysAppointments = await Appointment.countDocuments({
    nurseId,
    dueDateTime: { $gte: dayStart, $lt: dayEnd },
    status: { $nin: ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'] },
  });

  res.status(200).json({
    success: true,
    data: {
      totalPatients: patientIds.length,
      todaysAppointments,
      activeAlerts,
      criticalCases,
    },
  });
});

// ---------------------------------------------------------------
// GET /api/nurses/:nurseId/appointments  (คิวนัดหมายของพยาบาล — ตั้งแต่วันนี้เป็นต้นไป)
// ---------------------------------------------------------------
export const getNurseAppointments = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;
  const from = req.query.from ? new Date(req.query.from) : startOfDay();

  const appointments = await Appointment.find({
    nurseId,
    dueDateTime: { $gte: from },
    status: { $nin: ['CANCELLED', 'RESCHEDULED'] },
  })
    .populate('patientId', 'firstName lastName hn')
    .sort({ dueDateTime: 1 });

  res.status(200).json({ success: true, data: appointments });
});

// ---------------------------------------------------------------
// GET /api/nurses/:nurseId/analytics
// ---------------------------------------------------------------
export const getNurseAnalytics = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const dayStart = startOfDay();
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // ดึงข้อมูลทั้งหมดพร้อมกัน
  const [completed, workloadToday, waitingTimes, satisfactionData, closedCasesCount] = await Promise.all([
    Appointment.countDocuments({ nurseId, status: 'COMPLETED' }),
    Appointment.countDocuments({
      nurseId,
      dueDateTime: { $gte: dayStart, $lt: dayEnd },
      status: { $nin: ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'] },
    }),
    // คำนวณระยะเวลารอคอยเฉลี่ย (นาที) จาก VideoSession
    (async () => {
      const VideoSession = (await import('../models/VideoSession.js')).default;
      const sessions = await VideoSession.find({
        nurseId,
        connectedAt: { $exists: true, $ne: null },
        createdAt: { $exists: true, $ne: null },
      }).select('createdAt connectedAt');

      if (sessions.length === 0) return null;

      const totalMinutes = sessions.reduce((sum, s) => {
        const waitMs = s.connectedAt.getTime() - s.createdAt.getTime();
        return sum + waitMs / (1000 * 60);
      }, 0);

      return Math.round(totalMinutes / sessions.length);
    })(),
    // ดึงคะแนนความพึงพอใจเฉลี่ย
    (async () => {
      const SatisfactionRating = (await import('../models/SatisfactionRating.js')).default;
      const result = await SatisfactionRating.aggregate([
        { $match: { nurseId: nurseId.toString() } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
          },
        },
      ]);
      if (result.length === 0) return null;
      return Math.round(result[0].averageRating * 10) / 10;
    })(),
    // ดึงจำนวนเคสที่ปิดจริงจาก CaseClosure
    (async () => {
      const CaseClosure = (await import('../models/CaseClosure.js')).default;
      return await CaseClosure.countDocuments({ nurseId });
    })(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      completedCalls: completed,
      avgWaitingTimeMinutes: waitingTimes,
      patientSatisfactionScore: satisfactionData,
      nurseWorkloadToday: workloadToday,
      closedCases: closedCasesCount,
    },
  });
});

// ---------------------------------------------------------------
// GET /api/nurses/:nurseId/history  (ประวัติการปรึกษาที่เสร็จสิ้นแล้ว)
// ---------------------------------------------------------------
export const getNurseHistory = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const items = await Appointment.find({ nurseId, status: 'COMPLETED' })
    .populate('patientId', 'firstName lastName hn')
    .sort({ dueDateTime: -1 })
    .limit(50);

  // ดึง VideoSession สำหรับแต่ละ Appointment เพื่อเอา consultationNote
  const VideoSession = (await import('../models/VideoSession.js')).default;
  const appointmentIds = items.map((a) => a._id);
  const sessions = await VideoSession.find({ appointmentId: { $in: appointmentIds } });
  const sessionMap = new Map(sessions.map((s) => [s.appointmentId.toString(), s]));

  // รวม consultationNote เข้าไปในแต่ละ item
  const result = items.map((a) => ({
    ...a.toObject(),
    consultationNote: sessionMap.get(a._id.toString())?.consultationNote || null,
  }));

  res.status(200).json({ success: true, data: result });
});

// GET /api/nurses/patients/:patientId/consultation-history  (ประวัติการปรึกษาของผู้ป่วยรายหนึ่ง)
// ---------------------------------------------------------------
export const getPatientConsultationHistory = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const items = await Appointment.find({ patientId, status: 'COMPLETED' })
    .sort({ dueDateTime: -1 })
    .limit(50);

  // ดึง VideoSession สำหรับแต่ละ Appointment เพื่อเอา consultationNote
  const VideoSession = (await import('../models/VideoSession.js')).default;
  const appointmentIds = items.map((a) => a._id);
  const sessions = await VideoSession.find({ appointmentId: { $in: appointmentIds } });
  const sessionMap = new Map(sessions.map((s) => [s.appointmentId.toString(), s]));

  // รวม consultationNote เข้าไปในแต่ละ item
  const result = items.map((a) => ({
    ...a.toObject(),
    consultationNote: sessionMap.get(a._id.toString())?.consultationNote || null,
  }));

  res.status(200).json({ success: true, data: result });
});

export default {
  getNurseProfile,
  updateNurseProfile,
  getAssignedPatients,
  getPatientDetailForNurse,
  getNurseDashboard,
  getNurseAppointments,
  getNurseAnalytics,
  getNurseHistory,
  getPatientConsultationHistory,
};
