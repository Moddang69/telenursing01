import mongoose from 'mongoose';

/**
 * CarePlan.js (Phase 2 / 2.3 careplans)
 * createdBy เก็บชื่อ (denormalized) ตาม Phase 3.6 เพื่อลด join ตอนแสดงผล UI
 */
const carePlanSchema = new mongoose.Schema(
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
    goal: { type: String, required: true },
    action: { type: String, required: true },
    frequency: { type: String, required: true },
    target: { type: String, required: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'PAUSED', 'EXPIRED'],
      default: 'ACTIVE',
    },
    createdBy: { type: String, required: true }, // denormalized nurse full name
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

carePlanSchema.index({ patientId: 1, status: 1 });

export default mongoose.model('CarePlan', carePlanSchema);
