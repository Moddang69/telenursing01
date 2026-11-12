import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Consent, User, Patient, Nurse } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';

/**
 * consent.controller.js
 * Map ตรงกับ ConsentPage.jsx (patient), NurseConfidentialityPage.jsx (nurse)
 * บังคับใช้ Phase 4.6 — Consent Enforcement
 */

// POST /api/consents  (ยินยอม — patient หรือ nurse)
export const giveConsent = asyncHandler(async (req, res) => {
  const { type, version } = req.body;
  const userId = req.user.userId;

  // unique index = (userId, type, version) → ถ้าเคยมี record version นี้แล้ว (เช่น ถอนแล้วกลับมายินยอมใหม่)
  // ต้อง "เปิดใช้ซ้ำ" record เดิม ไม่ใช่ create ใหม่ (ไม่งั้นชน duplicate key → 500 และไม่บันทึก)
  const consent = await Consent.findOneAndUpdate(
    { userId, type, version },
    {
      $set: { role: req.user.role, status: 'GIVEN', givenAt: new Date(), withdrawnAt: null, withdrawReason: null },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // อัปเดตสถานะที่ users/patients/nurses ให้ตรงกัน (Denormalized flag สำหรับ query เร็ว)
  if (type === 'PATIENT_DATA_CONSENT' && req.user.role === 'patient') {
    await Patient.findByIdAndUpdate(req.user.roleRefId, { $set: { consentStatus: 'GIVEN' } });
    // กลับมายินยอมใหม่หลังเคยถอน → คืนสถานะบัญชีเป็น ACTIVE (ไม่แตะบัญชี SUSPENDED)
    await User.updateOne({ _id: userId, accountStatus: 'CONSENT_WITHDRAWN' }, { $set: { accountStatus: 'ACTIVE' } });
  }
  if (type === 'NURSE_CONFIDENTIALITY' && req.user.role === 'nurse') {
    await Nurse.findByIdAndUpdate(req.user.roleRefId, {
      $set: { confidentialityAccepted: true, confidentialityVersion: version, confidentialityAcceptedAt: new Date() },
    });
  }

  await logAudit({
    userId,
    userName: req.user.role,
    action: `Gave Consent: ${type} (v${version})`,
    targetType: 'consent',
    targetId: consent._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: 'บันทึกความยินยอมสำเร็จ', data: consent });
});

// PATCH /api/consents/withdraw  (ถอนความยินยอม — patient only)
export const withdrawConsent = asyncHandler(async (req, res) => {
  const { withdrawReason } = req.body;
  const userId = req.user.userId;

  if (req.user.role !== 'patient') {
    throw new ApiError(403, 'เฉพาะผู้ป่วยเท่านั้นที่สามารถถอนความยินยอมได้');
  }

  const latestConsent = await Consent.findOne({ userId, type: 'PATIENT_DATA_CONSENT', status: 'GIVEN' }).sort({
    createdAt: -1,
  });
  if (!latestConsent) throw new ApiError(400, 'ไม่พบความยินยอมที่ยังไม่ถูกถอน');

  latestConsent.status = 'CONSENT_WITHDRAWN';
  latestConsent.withdrawnAt = new Date();
  latestConsent.withdrawReason = withdrawReason || null;
  await latestConsent.save();

  await Patient.findByIdAndUpdate(req.user.roleRefId, { $set: { consentStatus: 'CONSENT_WITHDRAWN' } });
  await User.findByIdAndUpdate(userId, { $set: { accountStatus: 'CONSENT_WITHDRAWN' } });

  await logAudit({
    userId,
    userName: req.user.role,
    action: 'Withdrew Patient Data Consent',
    targetType: 'consent',
    targetId: latestConsent._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'ถอนความยินยอมสำเร็จ', data: latestConsent });
});

// GET /api/consents/history  (ดูประวัติของตนเอง)
export const getConsentHistory = asyncHandler(async (req, res) => {
  const history = await Consent.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: history });
});

export default { giveConsent, withdrawConsent, getConsentHistory };