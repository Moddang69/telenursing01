import express from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationSettings,
  updateNotificationSettings,
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  listNotificationsValidator,
  notificationIdParamValidator,
  updateSettingsValidator,
  subscribePushValidator,
  unsubscribePushValidator,
} from '../validators/notification.validator.js';

/**
 * /api/notifications — เฉพาะผู้ป่วย ผู้ดูแล และพยาบาล (Admin ไม่มีระบบแจ้งเตือนนี้)
 * ลำดับสำคัญ: เส้นทางเฉพาะ (settings / push / read-all) ต้องมาก่อน '/:id/read'
 */
const router = express.Router();
router.use(authenticate, verifyRole(['patient', 'caregiver', 'nurse']));

router.get('/', listNotificationsValidator, validateRequest, getMyNotifications);

router.get('/settings', getNotificationSettings);
router.put('/settings', updateSettingsValidator, validateRequest, updateNotificationSettings);

router.get('/push/public-key', getPushPublicKey);
router.post('/push/subscribe', subscribePushValidator, validateRequest, subscribePush);
router.post('/push/unsubscribe', unsubscribePushValidator, validateRequest, unsubscribePush);

router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', notificationIdParamValidator, validateRequest, markNotificationRead);

export default router;