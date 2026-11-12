import mongoose from 'mongoose';

/**
 * Message.js (Phase 2 / 2.3 messages)
 * patientId ใช้เป็น thread key (ตาม mock ปัจจุบันของ Frontend — 1 patient = 1 thread กับ nurse ของตน)
 */
const messageSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['patient', 'nurse', 'caregiver'],
      required: true,
    },
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true },
    // read = อย่างน้อย 1 คนอื่น (ที่ไม่ใช่ผู้ส่ง) อ่านแล้ว — ใช้แสดง ✓✓ ให้ผู้ส่ง
    read: { type: Boolean, default: false },
    // แชทกลุ่ม (ผู้ป่วย/ผู้ดูแล/พยาบาล) — เก็บว่าใครอ่านแล้วบ้าง เพื่อนับ "ยังไม่ได้อ่าน" แยกรายคน
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sentAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

messageSchema.index({ patientId: 1, sentAt: 1 });
messageSchema.index({ sentAt: 1 }); // Retention purge

export default mongoose.model('Message', messageSchema);