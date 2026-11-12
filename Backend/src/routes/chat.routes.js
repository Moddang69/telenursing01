import express from 'express';
import {
  getMessageHistory,
  sendMessageFallback,
  markMessagesAsRead,
  getUnreadCount,
  getNurseConversations,
} from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyPatientDataAccess } from '../middleware/verifyPatientDataAccess.js';
import { verifyConsent } from '../middleware/verifyConsent.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { patientIdParamValidator, sendMessageValidator } from '../validators/chat.validator.js';

const router = express.Router();

// รายการห้องแชทของพยาบาล — ต้องอยู่ก่อน '/:patientId' ไม่เช่นนั้น 'conversations' จะถูกตีความเป็น patientId
router.get('/conversations', authenticate, verifyRole(['nurse']), getNurseConversations);

router.get(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse', 'admin']),
  ...verifyPatientDataAccess(), // ผู้ดูแลที่เชื่อมโยง (ACTIVE) ใช้แชทได้เสมอ ไม่ต้องมีสิทธิ์ chatWithNurse
  patientIdParamValidator,
  validateRequest,
  getMessageHistory
);

router.get(
  '/:patientId/unread-count',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse']),
  ...verifyPatientDataAccess(), // ผู้ดูแลที่เชื่อมโยง (ACTIVE) ใช้แชทได้เสมอ ไม่ต้องมีสิทธิ์ chatWithNurse
  patientIdParamValidator,
  validateRequest,
  getUnreadCount
);

router.post(
  '/:patientId',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse']),
  ...verifyPatientDataAccess(), // ผู้ดูแลที่เชื่อมโยง (ACTIVE) ใช้แชทได้เสมอ ไม่ต้องมีสิทธิ์ chatWithNurse
  verifyConsent, // ผู้ป่วยที่ถอนความยินยอมแล้ว ห้ามเขียนข้อความใหม่ (เหมือนฝั่ง Socket)
  sendMessageValidator,
  validateRequest,
  sendMessageFallback
);

router.patch(
  '/:patientId/read',
  authenticate,
  verifyRole(['patient', 'caregiver', 'nurse']),
  ...verifyPatientDataAccess(), // ผู้ดูแลที่เชื่อมโยง (ACTIVE) ใช้แชทได้เสมอ ไม่ต้องมีสิทธิ์ chatWithNurse
  patientIdParamValidator,
  validateRequest,
  markMessagesAsRead
);

export default router;