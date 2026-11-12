import mongoose from 'mongoose';

/**
 * MealLog.js (Phase 2 / 2.3 meallogs)
 */
const mealLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    meal: {
      type: String,
      enum: ['เช้า', 'กลางวัน', 'เย็น'],
      required: true,
    },
    description: { type: String, required: true },
    photoUrl: { type: String, default: null }, // TODO: file storage design (deferred per Assumption A7)
    date: { type: Date, required: true },
    time: { type: String, default: null },
    recordedBy: {
      type: String,
      enum: ['patient', 'caregiver'],
      required: true,
    },
    recordedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

mealLogSchema.index({ patientId: 1, date: -1 });
mealLogSchema.index({ createdAt: 1 }); // Retention purge

export default mongoose.model('MealLog', mealLogSchema);
