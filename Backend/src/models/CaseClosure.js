import mongoose from 'mongoose';

/**
 * CaseClosure.js
 * เก็บข้อมูลการปิดเคสโดยพยาบาล
 * - closureReason: เหตุผลหลักที่เลือก (predefined)
 * - otherReason: เหตุผลอื่นๆ ที่พิมพ์เอง (ถ้าเลือก 'other')
 */
const caseClosureSchema = new mongoose.Schema(
  {
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
    closureReason: {
      type: String,
      required: true,
      enum: [
        'disease_remission',      // ผู้ป่วยเข้าสู่ระยะสงบของโรค
        'lost_contact',           // ขาดการติดต่อ
        'patient_deceased',       // ผู้ป่วยเสียชีวิต
        'transferred',            // ส่งต่อสถานพยาบาลอื่น
        'patient_request',        // ผู้ป่วยขอออกจากระบบ
        'other',                  // อื่นๆ
      ],
    },
    otherReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index สำหรับ query เร็วขึ้น
caseClosureSchema.index({ patientId: 1, closedAt: -1 });
caseClosureSchema.index({ nurseId: 1 });

export default mongoose.model('CaseClosure', caseClosureSchema);
