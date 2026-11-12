import mongoose from 'mongoose';

/**
 * CareTeam.js (Phase 2 / 2.3 careteams)
 * Junction Collection: Patient <-> Nurse (Phase 3.2 #2 — Referenced เพื่อเก็บ History)
 * Business Rule: patient มี status="ACTIVE" ได้แค่ 1 record เท่านั้น (partial unique index)
 */
const careTeamSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['ACTIVE', 'ENDED'],
      default: 'ACTIVE',
    },
    assignedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    reason: { type: String, default: null },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ป้องกัน Patient มี Care Team ที่ ACTIVE ซ้อนกันมากกว่า 1 (Phase 3.2 #2)
careTeamSchema.index(
  { patientId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
careTeamSchema.index({ nurseId: 1, status: 1 });

export default mongoose.model('CareTeam', careTeamSchema);
