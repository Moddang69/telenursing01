import express from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  submitPreConsult,
} from '../controllers/appointment.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { verifyConsent } from '../middleware/verifyConsent.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  patientIdParamValidator,
  createAppointmentValidator,
  updateAppointmentStatusValidator,
  submitPreConsultValidator,
} from '../validators/appointment.validator.js';

const router = express.Router();

router.post(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'nurse']),
  ...verifyPatientDataAccess('viewAppointment'),
  verifyConsent,
  createAppointmentValidator,
  validateRequest,
  createAppointment
);

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewAppointment'),
  patientIdParamValidator,
  validateRequest,
  getAppointments
);

router.get(
  '/:patientId/:appointmentId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess('viewAppointment'),
  patientIdParamValidator,
  validateRequest,
  getAppointmentById
);

router.patch(
  '/:patientId/:appointmentId/status',
  authenticate,
  verifyRole(['patient', 'nurse']),
  ...verifyPatientDataAccess('viewAppointment'),
  updateAppointmentStatusValidator,
  validateRequest,
  updateAppointmentStatus
);

router.post(
  '/:patientId/:appointmentId/pre-consult',
  authenticate,
  verifyRole(['patient']),
  ...verifyPatientDataAccess(),
  submitPreConsultValidator,
  validateRequest,
  submitPreConsult
);

export default router;
