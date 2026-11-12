import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../constants/notification.js';

/**
 * Notification.js — การแจ้งเตือนในแอป (แสดงที่ปุ่มกระดิ่งบน Header)
 * link = path ฝั่ง Frontend ที่จะเปิดเมื่อผู้ใช้กดการแจ้งเตือน (กำหนดตามบทบาทของผู้รับตอนสร้าง)
 * dedupeKey = กันแจ้งซ้ำ (เช่น เตือนนัดเดิม/ช่วงเวลาเดิมซ้ำ) — unique ต่อผู้รับ
 * ลบอัตโนมัติหลัง 90 วัน (TTL)
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    link: { type: String, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, default: undefined },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model('Notification', notificationSchema);