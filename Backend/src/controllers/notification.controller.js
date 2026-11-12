import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Notification, NotificationSetting, PushSubscription } from '../models/index.js';
import { DEFAULT_REMINDER_OFFSETS } from '../constants/notification.js';
import { getPublicKey } from '../services/push.service.js';

/**
 * notification.controller.js
 * ทุก endpoint ทำงานกับ "ผู้ใช้ที่ล็อกอินอยู่" เท่านั้น (req.user.userId) — ไม่รับ userId จาก Client
 */

const DEFAULT_LIMIT = 20;

const toClient = (n) => ({
  id: String(n._id),
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: !!n.read,
  createdAt: n.createdAt,
});

// GET /api/notifications?limit=20&before=<ISO>
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 50);

  const filter = { userId };
  if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

  // ดึงเกิน 1 รายการเพื่อรู้ว่ามีหน้าถัดไปหรือไม่
  const rows = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toClient);
  const unreadCount = await Notification.countDocuments({ userId, read: false });

  res.status(200).json({ success: true, data: { items, unreadCount, hasMore } });
});

// PATCH /api/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateOne(
    { _id: req.params.id, userId: req.user.userId },
    { $set: { read: true, readAt: new Date() } }
  );
  if (!result.matchedCount) throw new ApiError(404, 'ไม่พบการแจ้งเตือนนี้');
  const unreadCount = await Notification.countDocuments({ userId: req.user.userId, read: false });
  res.status(200).json({ success: true, data: { unreadCount } });
});

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.userId, read: false }, { $set: { read: true, readAt: new Date() } });
  res.status(200).json({ success: true, data: { unreadCount: 0 } });
});

// GET /api/notifications/settings — ยังไม่เคยบันทึก = คืนค่าต้นแบบ (ไม่สร้างเอกสารตอนอ่าน)
export const getNotificationSettings = asyncHandler(async (req, res) => {
  const doc = await NotificationSetting.findOne({ userId: req.user.userId });
  res.status(200).json({
    success: true,
    data: {
      videoCall: {
        enabled: doc ? doc.videoCall.enabled !== false : true,
        reminders: doc ? doc.videoCall.reminders : [...DEFAULT_REMINDER_OFFSETS],
      },
    },
  });
});

// PUT /api/notifications/settings
export const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { enabled, reminders } = req.body.videoCall;
  const sorted = [...reminders].sort((a, b) => b - a); // เก็บเรียงจากไกลไปใกล้นัด

  const doc = await NotificationSetting.findOneAndUpdate(
    { userId: req.user.userId },
    { $set: { 'videoCall.enabled': enabled, 'videoCall.reminders': sorted } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(200).json({
    success: true,
    message: 'บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ',
    data: { videoCall: { enabled: doc.videoCall.enabled, reminders: doc.videoCall.reminders } },
  });
});

// GET /api/notifications/push/public-key — null ถ้าเซิร์ฟเวอร์ยังไม่ได้ตั้งค่า VAPID
export const getPushPublicKey = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { publicKey: getPublicKey() } });
});

// POST /api/notifications/push/subscribe — ลงทะเบียนอุปกรณ์นี้ให้ผู้ใช้ปัจจุบัน (อุปกรณ์เดิมที่เคยเป็นของผู้ใช้อื่น จะย้ายมาเป็นของผู้ใช้นี้)
export const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body.subscription;
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        userId: req.user.userId,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: String(req.get('user-agent') || '').slice(0, 300),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(200).json({ success: true, message: 'เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว' });
});

// POST /api/notifications/push/unsubscribe — ลบเฉพาะอุปกรณ์ของผู้ใช้ปัจจุบัน
export const unsubscribePush = asyncHandler(async (req, res) => {
  await PushSubscription.deleteOne({ endpoint: req.body.endpoint, userId: req.user.userId });
  res.status(200).json({ success: true, message: 'ปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว' });
});

export default {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationSettings,
  updateNotificationSettings,
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
};