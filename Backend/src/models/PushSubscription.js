import mongoose from 'mongoose';

/**
 * PushSubscription.js — อุปกรณ์/เบราว์เซอร์ที่ผู้ใช้อนุญาตให้ส่ง Web Push (แจ้งเตือนแม้ไม่ได้เปิดเว็บ)
 * endpoint unique: อุปกรณ์เดียวกันล็อกอินคนใหม่ → ย้ายเจ้าของไปเป็นผู้ใช้ล่าสุด
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('PushSubscription', pushSubscriptionSchema);