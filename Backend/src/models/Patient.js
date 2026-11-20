import mongoose from 'mongoose';

/**
 * Patient.js (Phase 2 / 2.3 patients)
 * FK: userId -> users._id (1:1), assignedNurseId -> nurses._id
 */
const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    hn: { type: String, required: true, unique: true, trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    phone: { type: String, required: true },
    hospital: { type: String, default: null }, // 🆕 หน่วยบริการต้นสังกัด
    emergencyContact: { type: String, default: null }, // 🆕 ชื่อผู้ติดต่อฉุกเฉิน
    secondaryContactNumber: { type: String, default: null }, // 🆕 เบอร์โทรผู้ติดต่อฉุกเฉิน
    caregiverName: { type: String, default: null }, // 🆕 ชื่อผู้ดูแล (ถ้ามี)
    caregiverRelationship: {
      type: String,

      enum: ['father', 'mother', 'spouse', 'daughter', 'son', 'sibling', 'other', null],
      default: null,
    },
    caregiverRelationshipOther: { type: String, default: null },
    address: { type: String, default: null },
    comorbidities: { type: String, default: null },
    drugAllergies: { type: String, default: null },
    assignedNurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      default: null,
    },
    consentStatus: {
      type: String,
      enum: ['NOT_GIVEN', 'GIVEN', 'CONSENT_WITHDRAWN'],
      default: 'NOT_GIVEN',
    },
    hasProfile: { type: Boolean, default: false },
    hasAssignment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

patientSchema.index({ assignedNurseId: 1 });

export default mongoose.model('Patient', patientSchema);