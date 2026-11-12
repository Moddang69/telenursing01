import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { HealthRecord, Patient } from '../models/index.js';
import healthEvaluationService from '../services/healthEvaluation.service.js';
import { logAudit } from '../middleware/auditLogger.js';
import notificationService from '../services/notification.service.js';

/**
 * health.controller.js
 * Map ตรงกับ Frontend: HealthDataInputPage, HealthDataHistoryPage, HealthDataChartPage
 * รองรับ 4 type: SMBG, BLOOD_PRESSURE, HBA1C, LDL (Polymorphic Pattern — Phase 7 HealthRecord Model)
 */

// POST /api/health/:patientId/records
export const createHealthRecord = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { type, date, time, unit, source } = req.body;

  const patient = await Patient.findById(patientId).select('firstName lastName');
  if (!patient) throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');

  // Client ส่งมาเฉพาะ "ช่วงค่า" (rangeKey) — Backend แปลงเป็นค่ากลางช่วงสำหรับพล็อตกราฟ
  // และประเมิน Severity เองทั้งหมด ไม่เชื่อค่าตัวเลข/Severity จาก Client (Phase 4 Security Design)
  const { data: valueData, severity, message } = healthEvaluationService.buildRecordFromRanges(type, req.body);

  const record = await HealthRecord.create({
    patientId,
    type,
    date,
    time,
    unit,
    ...valueData,
    source: source || 'manual',
    recordedBy: req.user.role, // patient | caregiver
    recordedByUserId: req.user.userId,
    evaluatedSeverity: severity,
    evaluatedMessage: message,
  });

  await logAudit({
    userId: req.user.userId,
    userName: `${patient.firstName} ${patient.lastName}`,
    action: `Recorded ${type} for Patient ${patientId}`,
    targetType: 'healthrecord',
    targetId: record._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  // ค่าผิดปกติ (WARNING/HIGH/CRITICAL) → แจ้งพยาบาลที่ดูแลผู้ป่วย
  if (severity && severity !== 'NORMAL') {
    notificationService
      .notifyAbnormalHealthRecord({ patientId, record })
      .catch((err) => console.error('notify abnormal health failed: - health.controller.js:54', err.message));
  }

  res.status(201).json({ success: true, message: 'บันทึกข้อมูลสุขภาพสำเร็จ', data: record });
});

// GET /api/health/:patientId/records?type=SMBG&startDate=&endDate=&limit=
export const getHealthRecords = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { type, startDate, endDate, limit } = req.query;

  const filter = { patientId };
  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const records = await HealthRecord.find(filter)
    .sort({ date: -1, time: -1, createdAt: -1 })
    .limit(limit ? parseInt(limit, 10) : 100);

  res.status(200).json({ success: true, data: records });
});

// GET /api/health/:patientId/records/chart?type=SMBG&startDate=&endDate=
// สำหรับ HealthDataChartPage — คืนเฉพาะ field ที่ใช้วาดกราฟ (ลด payload)
export const getHealthRecordsForChart = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { type, startDate, endDate } = req.query;

  if (!type) throw new ApiError(400, 'กรุณาระบุ type สำหรับการแสดงกราฟ');

  const filter = { patientId, type };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const records = await HealthRecord.find(filter)
    .select('type date time smbg bloodPressure hba1c ldl evaluatedSeverity')
    .sort({ date: 1 });

  res.status(200).json({ success: true, data: records });
});

// GET /api/health/:patientId/records/:recordId
export const getHealthRecordById = asyncHandler(async (req, res) => {
  const { recordId } = req.params;
  const record = await HealthRecord.findById(recordId);
  if (!record) throw new ApiError(404, 'ไม่พบข้อมูลรายการนี้');
  res.status(200).json({ success: true, data: record });
});

export default {
  createHealthRecord,
  getHealthRecords,
  getHealthRecordsForChart,
  getHealthRecordById,
};