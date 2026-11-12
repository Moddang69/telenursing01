import mongoose from 'mongoose';

/**
 * ExerciseLog.js (Phase 2 / 2.3 exerciselogs)
 */
const exerciseLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    activity: { type: String, required: true },
    duration: { type: Number, required: true }, // นาที
    distance: { type: Number, default: null }, // กม.
    pace: { type: String, default: null },
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

exerciseLogSchema.index({ patientId: 1, date: -1 });
exerciseLogSchema.index({ createdAt: 1 }); // Retention purge

export default mongoose.model('ExerciseLog', exerciseLogSchema);
