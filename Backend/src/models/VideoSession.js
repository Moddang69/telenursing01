import mongoose from 'mongoose';

/**
 * VideoSession.js (Phase 2 / 2.3 videosessions)
 * Referenced จาก Appointment (Phase 3.2 #8) — state เปลี่ยนบ่อยระหว่าง call
 * recordingPolicy เป็น CONFIGURABLE ตาม Master Prompt constraint (ห้ามตัดสินใจเรื่อง Legal/Recording เอง)
 */
const videoSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      required: true,
    },
    state: {
      type: String,
      enum: [
        'WAITING_FOR_NURSE',
        'NURSE_JOINED',
        'CONNECTING',
        'CONNECTED',
        'RECONNECTING',
        'DISCONNECTED',
        'CALL_ENDED',
      ],
      default: 'WAITING_FOR_NURSE',
    },
    startedAt: { type: Date, default: null },
    // เวลาที่ 2 ฝั่งเชื่อมต่อกันได้จริงครั้งแรก — ใช้แยก "คุยกันแล้ว" (จบ = COMPLETED) ออกจาก "คู่สนทนาไม่เข้า แล้วกดวาง" (ยังเข้าใหม่ได้)
    connectedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    consultationNote: { type: String, default: null },
    // CONFIGURABLE — ค่า default สำหรับ Prototype เท่านั้น ต้องตรวจสอบนโยบายจริงก่อนใช้งานจริง
    recordingPolicy: {
      type: String,
      default: 'NOT_RECORDED',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

videoSessionSchema.index({ nurseId: 1, startedAt: -1 });
videoSessionSchema.index({ createdAt: 1 }); // Retention purge

export default mongoose.model('VideoSession', videoSessionSchema);
