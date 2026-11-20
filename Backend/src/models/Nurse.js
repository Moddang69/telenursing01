import mongoose from 'mongoose';

/**
 * Nurse.js (Phase 2 / 2.3 nurses)
 * FK: userId -> users._id (1:1)
 */
const approvalHistoryItemSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['APPROVED', 'REJECTED', 'SUSPENDED', 'REACTIVATED'] },
    reason: { type: String, default: null },
    byAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const nurseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    position: { type: String, default: null },
    expertise: { type: String, default: null },
    hospital: { type: String, required: true },
    department: { type: String, default: null },
    ward: { type: String, default: null },
    approvalStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING_APPROVAL',
    },
    confidentialityAccepted: { type: Boolean, default: false },
    confidentialityVersion: { type: String, default: null },
    confidentialityAcceptedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvalHistory: { type: [approvalHistoryItemSchema], default: [] },
  },
  { timestamps: true }
);

nurseSchema.index({ approvalStatus: 1 });

export default mongoose.model('Nurse', nurseSchema);
