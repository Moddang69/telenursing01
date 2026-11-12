import mongoose from 'mongoose';

/**
 * Education.js (Phase 2 / 2.3 educations)
 */
const educationSchema = new mongoose.Schema(
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
    category: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null }, // เนื้อหา/คำอธิบายบทเรียนโดยย่อ
    contentUrl: { type: String, default: null }, // ลิงก์สื่อการสอน (วิดีโอ/บทความ) ถ้ามี
    status: {
      type: String,
      enum: ['ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'ASSIGNED',
    },
    assignedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

educationSchema.index({ patientId: 1, status: 1 });

export default mongoose.model('Education', educationSchema);
