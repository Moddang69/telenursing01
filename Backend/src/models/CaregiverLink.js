import mongoose from 'mongoose';

/**
 * CaregiverLink.js (Phase 2 / 2.3 caregiverlinks)
 * Junction Collection: Caregiver <-> Patient + Permissions (Phase 3.2 #3)
 */
const permissionsSchema = new mongoose.Schema(
  {
    viewHealthData: { type: Boolean, default: true },
    assistHealthLog: { type: Boolean, default: false },
    viewAppointment: { type: Boolean, default: true },
    viewCarePlan: { type: Boolean, default: true },
    viewEducation: { type: Boolean, default: true },
    chatWithNurse: { type: Boolean, default: false },
  },
  { _id: false }
);

const caregiverLinkSchema = new mongoose.Schema(
  {
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Caregiver',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    relationship: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'ACTIVE', 'REVOKED'],
      default: 'PENDING_VERIFICATION',
    },
    permissions: { type: permissionsSchema, default: () => ({}) },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      default: null,
    },
  },
  { timestamps: true }
);

// Phase 3.2 #3 — Composite Key ป้องกัน Link ซ้ำ (เฉพาะที่ยัง ACTIVE/PENDING เพื่อรองรับ REVOKED ในอดีต)
caregiverLinkSchema.index(
  { caregiverId: 1, patientId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['ACTIVE', 'PENDING_VERIFICATION'] } } }
);
caregiverLinkSchema.index({ patientId: 1, status: 1 });

export default mongoose.model('CaregiverLink', caregiverLinkSchema);
