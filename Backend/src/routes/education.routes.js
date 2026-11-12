import express from 'express';
import {
  assignEducation,
  getEducations,
  updateEducationStatus,
} from '../controllers/education.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  assignEducationValidator,
  updateEducationStatusValidator,
} from '../validators/education.validator.js';

const router = express.Router();

router.post(
  '/:patientId',
  authenticate,
  verifyRole(['nurse']),
  ...verifyPatientDataAccess(),
  assignEducationValidator,
  validateRequest,
  assignEducation
);

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewEducation'),
  patientIdParamValidator,
  validateRequest,
  getEducations
);

router.patch(
  '/:patientId/:educationId/status',
  authenticate,
  verifyRole(['patient', 'caregiver']),
  ...verifyPatientDataAccess('viewEducation'),
  updateEducationStatusValidator,
  validateRequest,
  updateEducationStatus
);

export default router;
