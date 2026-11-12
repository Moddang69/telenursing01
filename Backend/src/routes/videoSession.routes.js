import express from 'express';
import {
  createOrGetVideoSession,
  getVideoSession,
  endVideoSession,
  getAgoraToken,
} from '../controllers/videoSession.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyAppointmentOwnership } from '../middleware/verifyAppointmentOwnership.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  appointmentIdParamValidator,
  endVideoSessionValidator,
} from '../validators/videoSession.validator.js';

const router = express.Router();

router.post(
  '/:appointmentId',
  authenticate,
  verifyRole(['patient', 'nurse']),
  appointmentIdParamValidator,
  validateRequest,
  verifyAppointmentOwnership,
  createOrGetVideoSession
);

// ออก Agora RTC Token — เฉพาะ patient/nurse เจ้าของนัดหมาย (admin ไม่ควรเข้าดูวิดีโอผู้ป่วย)
router.post(
  '/:appointmentId/agora-token',
  authenticate,
  verifyRole(['patient', 'nurse']),
  appointmentIdParamValidator,
  validateRequest,
  verifyAppointmentOwnership,
  getAgoraToken
);

router.get(
  '/:appointmentId',
  authenticate,
  verifyRole(['patient', 'nurse', 'admin']),
  appointmentIdParamValidator,
  validateRequest,
  verifyAppointmentOwnership,
  getVideoSession
);

router.patch(
  '/:appointmentId/end',
  authenticate,
  verifyRole(['nurse']),
  endVideoSessionValidator,
  validateRequest,
  verifyAppointmentOwnership,
  endVideoSession
);

export default router;