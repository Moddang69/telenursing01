import express from 'express';
import {
  getNurseProfile,
  updateNurseProfile,
  getAssignedPatients,
  getPatientDetailForNurse,
  getNurseDashboard,
  getNurseAppointments,
  getNurseAnalytics,
  getNurseHistory,
} from '../controllers/nurse.controller.js';
import { getAvailableNurses } from '../controllers/careTeam.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyCareTeamAccess } from '../middleware/verifyCareTeamAccess.js';
import { verifyNurseSelf, verifyNurseApproved } from '../middleware/verifyNurseSelf.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { patientIdParamValidator } from '../validators/patient.validator.js';

/**
 * nurse.routes.js
 * รวม Nurse Profile Routes + Care Team Access Routes (assignmentService — Assumption A9)
 */
const router = express.Router();

// ---------- Available Nurses / Assignment (Assumption A9) ----------
router.get('/available', authenticate, verifyRole(['patient', 'admin']), getAvailableNurses);

// ---------- Patient Detail via Care Team (🔒 verifyCareTeamAccess บังคับใช้ตรงนี้) ----------
// ต้องประกาศก่อน '/:nurseId' routes เพื่อกัน path ชนกัน
router.get(
  '/patients/:patientId',
  authenticate,
  verifyRole(['nurse']),
  patientIdParamValidator,
  validateRequest,
  verifyCareTeamAccess,
  getPatientDetailForNurse
);

// ---------- Nurse Profile (Self) — พยาบาลที่ยังรออนุมัติต้องเรียกได้ (ใช้ตอน login/หน้ารออนุมัติ) ----------
router.get('/:nurseId', authenticate, verifyRole(['nurse', 'admin']), verifyNurseSelf, getNurseProfile);
router.patch('/:nurseId', authenticate, verifyRole(['nurse']), verifyNurseSelf, updateNurseProfile);

// ---------- Dashboard / Patients / Appointments / Analytics / History (ต้องได้รับอนุมัติแล้ว) ----------
router.get('/:nurseId/dashboard', authenticate, verifyRole(['nurse']), verifyNurseSelf, verifyNurseApproved, getNurseDashboard);
router.get('/:nurseId/patients', authenticate, verifyRole(['nurse']), verifyNurseSelf, verifyNurseApproved, getAssignedPatients);
router.get('/:nurseId/appointments', authenticate, verifyRole(['nurse']), verifyNurseSelf, verifyNurseApproved, getNurseAppointments);
router.get('/:nurseId/analytics', authenticate, verifyRole(['nurse']), verifyNurseSelf, verifyNurseApproved, getNurseAnalytics);
router.get('/:nurseId/history', authenticate, verifyRole(['nurse']), verifyNurseSelf, verifyNurseApproved, getNurseHistory);

export default router;
