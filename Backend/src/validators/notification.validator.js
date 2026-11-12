import { body, param, query } from 'express-validator';
import { validateReminderOffsets } from '../constants/notification.js';

export const listNotificationsValidator = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit ต้องอยู่ระหว่าง 1 – 50'),
  query('before').optional().isISO8601().withMessage('before ต้องเป็นวันที่ ISO'),
];

export const notificationIdParamValidator = [param('id').isMongoId().withMessage('id ไม่ถูกต้อง')];

export const updateSettingsValidator = [
  body('videoCall').isObject().withMessage('กรุณาระบุ videoCall'),
  body('videoCall.enabled').isBoolean().withMessage('enabled ต้องเป็น true/false').toBoolean(),
  body('videoCall.reminders')
    .isArray()
    .withMessage('reminders ต้องเป็นอาร์เรย์')
    .custom((reminders) => {
      const error = validateReminderOffsets(reminders);
      if (error) throw new Error(error);
      return true;
    }),
];

export const subscribePushValidator = [
  body('subscription.endpoint').isString().isLength({ min: 10, max: 2048 }).withMessage('endpoint ไม่ถูกต้อง'),
  body('subscription.keys.p256dh').isString().notEmpty().withMessage('p256dh ไม่ถูกต้อง'),
  body('subscription.keys.auth').isString().notEmpty().withMessage('auth ไม่ถูกต้อง'),
];

export const unsubscribePushValidator = [body('endpoint').isString().notEmpty().withMessage('endpoint ไม่ถูกต้อง')];