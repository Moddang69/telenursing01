import mongoose from 'mongoose';

/**
 * Consent.js (Phase 2 / 2.3 consents)
 * เก็บทุก version ที่ user เคยยินยอม/ถอน (compliance history — Phase 3.2 #10)
 */
const consentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['patient', 'nurse'],
      required: true,
    },
    type: {
      type: String,
      enum: ['PATIENT_DATA_CONSENT', 'NURSE_CONFIDENTIALITY'],
      required: true,
    },
    version: { type: String, required: true },
    status: {
      type: String,
      enum: ['GIVEN', 'CONSENT_WITHDRAWN'],
      required: true,
    },
    givenAt: { type: Date, default: null },
    withdrawnAt: { type: Date, default: null },
    withdrawReason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Phase 2 — Composite Key ป้องกันยินยอมซ้ำ version เดียวกัน
consentSchema.index({ userId: 1, type: 1, version: 1 }, { unique: true });

export default mongoose.model('Consent', consentSchema);
