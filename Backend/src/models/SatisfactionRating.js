import mongoose from 'mongoose';

/**
 * SatisfactionRating.js
 * เก็บคะแนนความพึงพอใจของผู้ป่วยหลังวิดีโอคอลเสร็จ
 * - rating: 1-5 ดาว
 * - comment: ข้อคิดเห็นเพิ่มเติม (ไม่บังคับ)
 */
const satisfactionRatingSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true, // 1 นัดหมาย = 1 คะแนนเท่านั้น
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Index สำหรับ query เร็วขึ้น
satisfactionRatingSchema.index({ nurseId: 1, createdAt: -1 });
satisfactionRatingSchema.index({ patientId: 1 });
satisfactionRatingSchema.index({ appointmentId: 1 });

export default mongoose.model('SatisfactionRating', satisfactionRatingSchema);
