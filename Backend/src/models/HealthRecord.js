import mongoose from 'mongoose';

/**
 * HealthRecord.js (Phase 2 / 2.3 healthrecords)
 * Polymorphic Pattern (Assumption A6): SMBG / BLOOD_PRESSURE / HBA1C / LDL รวม collection เดียว
 * evaluatedSeverity มาจาก Placeholder Clinical Rule เท่านั้น — ไม่ใช่การวินิจฉัยทางการแพทย์จริง
 */
const healthRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    type: {
      type: String,
      enum: ['SMBG', 'BLOOD_PRESSURE', 'HBA1C', 'LDL'],
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, default: null }, // "HH:mm"

    // --- SMBG ---
    smbg: {
      value: { type: Number, default: null }, // ค่ากลางของช่วงที่เลือก (ใช้พล็อตกราฟ)
      rangeKey: { type: String, default: null }, // ช่วงที่ผู้ใช้เลือก เช่น glu_70_99
      measurementType: {
        type: String,
        enum: ['fasting', 'before_meal', 'after_meal', 'bedtime', 'other', null],
        default: null,
      },
    },
    // --- Blood Pressure ---
    bloodPressure: {
      systolic: { type: Number, default: null },
      diastolic: { type: Number, default: null },
      pulse: { type: Number, default: null },
      systolicRangeKey: { type: String, default: null },
      diastolicRangeKey: { type: String, default: null },
      pulseRangeKey: { type: String, default: null },
    },
    // --- HbA1c ---
    hba1c: {
      value: { type: Number, default: null },
      rangeKey: { type: String, default: null },
    },
    // --- LDL ---
    ldl: {
      value: { type: Number, default: null },
      rangeKey: { type: String, default: null },
    },

    unit: { type: String, required: true },
    recordedBy: {
      type: String,
      enum: ['patient', 'caregiver', 'nurse'],
      required: true,
    },
    recordedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'lab', 'device'],
      default: 'manual',
    },

    // Placeholder Clinical Rule Evaluation — Phase 4 / Master Prompt constraint
    evaluatedSeverity: {
      type: String,
      enum: ['NORMAL', 'WARNING', 'HIGH', 'CRITICAL', null],
      default: null,
    },
    evaluatedMessage: {
      type: String,
      default:
        'Placeholder clinical rule — replace with validated clinical guideline before clinical use.',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Phase 2 — Compound Index สำคัญที่สุดของ Collection นี้ (ใช้ query กราฟแนวโน้ม)
healthRecordSchema.index({ patientId: 1, type: 1, date: -1 });
healthRecordSchema.index({ patientId: 1, date: -1 });
healthRecordSchema.index({ createdAt: 1 }); // Retention purge

export default mongoose.model('HealthRecord', healthRecordSchema);
