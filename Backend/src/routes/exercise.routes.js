import express from 'express';
import {
  createExerciseLog,
  getExerciseLogs,
  getExerciseLogById,
} from '../controllers/exercise.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { verifyConsent } from '../middleware/verifyConsent.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  createExerciseLogValidator,
} from '../validators/health.validator.js';

const router = express.Router();

router.post(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver']),
  ...verifyPatientDataAccess('assistHealthLog'),
  verifyConsent,
  createExerciseLogValidator,
  validateRequest,
  createExerciseLog
);

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  validateRequest,
  getExerciseLogs
);

router.get(
  '/:patientId/:logId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  validateRequest,
  getExerciseLogById
);

export default router;
