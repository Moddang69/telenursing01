import ApiError from '../utils/ApiError.js';
import { Patient } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * verifyConsent.js (Phase 4.6 — Consent Enforcement)
 * บล็อกการเขียนข้อมูลใหม่ (POST/PUT/PATCH) ถ้า Patient ถอน Consent แล้ว
 * ยังอนุญาตให้อ่านข้อมูลเก่าได้ตามปกติ (ใช้เฉพาะ Route ที่เป็นการเขียนข้อมูล)
 */
export const verifyConsent = asyncHandler(async (req, res, next) => {
  const patientId = req.params.patientId || req.body.patientId;
  if (!patientId) {
    return next();
  }

  const patient = await Patient.findById(patientId).select('consentStatus');
  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  if (patient.consentStatus === 'CONSENT_WITHDRAWN') {
    throw new ApiError(
      403,
      'ผู้ป่วยรายนี้ได้ถอนความยินยอมการใช้ข้อมูลแล้ว ไม่สามารถบันทึกข้อมูลใหม่ได้'
    );
  }

  next();
});

export default verifyConsent;
