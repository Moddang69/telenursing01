import express from 'express';
import { createMealLog, getMealLogs, getMealLogById } from '../controllers/meal.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { verifyConsent } from '../middleware/verifyConsent.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  createMealLogValidator,
} from '../validators/health.validator.js';

const router = express.Router();

router.post(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver']),
  ...verifyPatientDataAccess('assistHealthLog'),
  verifyConsent,
  createMealLogValidator,
  validateRequest,
  createMealLog
);

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  validateRequest,
  getMealLogs
);

router.get(
  '/:patientId/:logId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewHealthData'),
  patientIdParamValidator,
  validateRequest,
  getMealLogById
);

export default router;
