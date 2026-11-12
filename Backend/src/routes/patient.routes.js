import express from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  getCareTeamHistory,
  getPatientSummary,
} from '../controllers/patient.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifySelfAccess } from '../middleware/verifySelfAccess.js';
import { verifyCareTeamAccess } from '../middleware/verifyCareTeamAccess.js';
import { verifyCaregiverLinkAccess } from '../middleware/verifyCaregiverLinkAccess.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  updatePatientProfileValidator,
} from '../validators/patient.validator.js';

/**
 * patient.routes.js
 * ทุก Route ผ่าน: authenticate -> verifyRole -> Data Scoping (self/careteam/caregiver-link) -> validator -> controller
 * รองรับทั้ง Patient เข้าถึงตนเอง, Nurse เข้าถึงผ่าน Care Team, และ Caregiver เข้าถึงผ่าน Caregiver Link (Phase 4.4 RBAC Matrix)
 */
const router = express.Router();

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'nurse', 'admin', 'caregiver']),
  verifySelfAccess,
  verifyCareTeamAccess,
  verifyCaregiverLinkAccess(),
  patientIdParamValidator,
  validateRequest,
  getPatientProfile
);

router.patch(
  '/:patientId',
  authenticate,
  verifyRole(['patient']),
  verifySelfAccess,
  updatePatientProfileValidator,
  validateRequest,
  updatePatientProfile
);

router.get(
  '/:patientId/summary',
  authenticate,
  verifyRole(['patient', 'nurse', 'admin']),
  verifySelfAccess,
  verifyCareTeamAccess,
  patientIdParamValidator,
  validateRequest,
  getPatientSummary
);

router.get(
  '/:patientId/care-team-history',
  authenticate,
  verifyRole(['patient', 'admin']),
  verifySelfAccess,
  patientIdParamValidator,
  validateRequest,
  getCareTeamHistory
);

export default router;