import mongoose from 'mongoose';

const dataRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DATA_DELETION', 'CONSENT_WITHDRAWAL', 'NURSE_CHANGE'],
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    requestedFields: { type: [String], default: [] }, // เฉพาะ DATA_DELETION
    currentNurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      default: null,
    }, // เฉพาะ NURSE_CHANGE
    requestedNurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      default: null,
    }, // 🔧 เพิ่มใหม่: เฉพาะ NURSE_CHANGE — เดิมไม่มี field นี้เลย ทำให้ระบุไม่ได้ว่าผู้ป่วยต้องการเปลี่ยนไปหาพยาบาลคนไหน
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ['REQUESTED', 'UNDER_REVIEW', 'CONFIRMED', 'COMPLETED', 'REJECTED'],
      default: 'REQUESTED',
    },
    requestedAt: { type: Date, required: true, default: Date.now },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dataRequestSchema.index({ patientId: 1 });
dataRequestSchema.index({ status: 1, type: 1 });
dataRequestSchema.index({ createdAt: 1 }); // Retention purge

export default mongoose.model('DataRequest', dataRequestSchema);
