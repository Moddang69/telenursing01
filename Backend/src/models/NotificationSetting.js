import mongoose from 'mongoose';
import { DEFAULT_REMINDER_OFFSETS } from '../constants/notification.js';

/**
 * NotificationSetting.js — การตั้งค่าการแจ้งเตือนรายผู้ใช้ (ตั้งในหน้าโปรไฟล์)
 * videoCall.reminders = รายการ "กี่นาทีก่อนวิดีโอคอล" (สูงสุด 3 ค่า, 0 – 40320 นาที)
 * ยังไม่มีเอกสาร = ใช้ค่าต้นแบบ (เปิด, 1 วัน + 1 ชั่วโมง) — เอกสารจะถูกสร้างเมื่อผู้ใช้บันทึกการตั้งค่าครั้งแรกเท่านั้น
 */
const notificationSettingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    videoCall: {
      enabled: { type: Boolean, default: true },
      reminders: { type: [Number], default: () => [...DEFAULT_REMINDER_OFFSETS] },
    },
  },
  { timestamps: true }
);

export default mongoose.model('NotificationSetting', notificationSettingSchema);