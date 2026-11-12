import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Patient, CareTeam } from '../models/index.js';
import careTeamService from '../services/careTeam.service.js';
import { logAudit } from '../middleware/auditLogger.js';

/**
 * patient.controller.js
 * Map ตรงกับ Phase 1.2 Table: PatientProfilePage, SelectNursePage, PatientHomePage (summary)
 */

// GET /api/patients/:patientId
export const getPatientProfile = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const patient = await Patient.findById(patientId).populate(
    'assignedNurseId',
    'firstName lastName hospital department'
  );

  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  res.status(200).json({ success: true, data: patient });
});

// PATCH /api/patients/:patientId
export const updatePatientProfile = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const allowedFields = [
    'firstName',
    'lastName',
    'phone',
    'hospital',
    'emergencyContact',
    'secondaryContactNumber',
    'caregiverName',
    'caregiverRelationship',
    'caregiverRelationshipOther',
    'address',
    'comorbidities',
    'drugAllergies',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const patient = await Patient.findByIdAndUpdate(patientId, { $set: updates }, { new: true });
  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  await logAudit({
    userId: req.user.userId,
    userName: `${patient.firstName} ${patient.lastName}`,
    action: `Patient updated own profile`,
    targetType: 'patient',
    targetId: patientId,
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: patient });
});

// GET /api/patients/:patientId/care-team-history
export const getCareTeamHistory = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const history = await careTeamService.getAssignmentHistory(patientId);
  res.status(200).json({ success: true, data: history });
});

// GET /api/patients/:patientId/summary  (สำหรับ PatientHomePage — รวม assignedNurse เบื้องต้น)
export const getPatientSummary = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const patient = await Patient.findById(patientId)
    .populate('assignedNurseId', 'firstName lastName hospital')
    .select('firstName lastName hn consentStatus hasProfile hasAssignment assignedNurseId');

  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  res.status(200).json({ success: true, data: patient });
});

export default {
  getPatientProfile,
  updatePatientProfile,
  getCareTeamHistory,
  getPatientSummary,
};