import express from 'express';
import {
  createCarePlan,
  getCarePlans,
  getCarePlanById,
  updateCarePlan,
} from '../controllers/carePlan.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  createCarePlanValidator,
  updateCarePlanValidator,
} from '../validators/carePlan.validator.js';

const router = express.Router();

router.post(
  '/:patientId',
  authenticate,
  verifyRole(['nurse']),
  ...verifyPatientDataAccess(),
  createCarePlanValidator,
  validateRequest,
  createCarePlan
);

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewCarePlan'),
  patientIdParamValidator,
  validateRequest,
  getCarePlans
);

router.get(
  '/:patientId/:carePlanId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewCarePlan'),
  patientIdParamValidator,
  validateRequest,
  getCarePlanById
);

router.patch(
  '/:patientId/:carePlanId',
  authenticate,
  verifyRole(['nurse']),
  ...verifyPatientDataAccess(),
  updateCarePlanValidator,
  validateRequest,
  updateCarePlan
);

export default router;
