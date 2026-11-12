import express from 'express';
import {
  createHealthRecord,
  getHealthRecords,
  getHealthRecordsForChart,
  getHealthRecordById,
} from '../controllers/health.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { verifyConsent } from '../middleware/verifyConsent.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  listQueryValidator,
  createHealthRecordValidator,
} from '../validators/health.validator.js';

const router = express.Router();

// สร้าง Record ใหม่ — ต้องผ่าน Consent Check (Phase 4.6) เฉพาะ patient/caregiver (ไม่ใช่ nurse เพราะ nurse อ่านอย่างเดียว)
router.post(
  '/:patientId/records',
  authenticate,
  verifyRole(['patient', 'caregiver']),
  ...verifyPatientDataAccess('assistHealthLog'),
  verifyConsent,
  createHealthRecordValidator,
  validateRequest,
  createHealthRecord
);

router.get(
  '/:patientId/records',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  listQueryValidator,
  validateRequest,
  getHealthRecords
);

router.get(
  '/:patientId/records/chart',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  listQueryValidator,
  validateRequest,
  getHealthRecordsForChart
);

router.get(
  '/:patientId/records/:recordId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  validateRequest,
  getHealthRecordById
);

export default router;
