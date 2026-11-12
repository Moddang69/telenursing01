import mongoose from 'mongoose';

/**
 * AuditLog.js (Phase 2 / 2.3 auditlogs)
 * Insert-Only Collection (Phase 4.7) — ห้ามมี update/delete method ใน Service Layer
 * userName เป็น denormalized field เพื่อให้ log อ่านได้แม้ user ถูกลบในอนาคต
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    result: {
      type: String,
      enum: ['Success', 'Failure'],
      required: true,
    },
    ipAddress: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

// ป้องกันการแก้ไข/ลบโดยไม่ตั้งใจที่ระดับ Model (Phase 4.7 — Immutability)
auditLogSchema.pre('findOneAndUpdate', function guardAgainstUpdate(next) {
  next(new Error('AuditLog is Insert-Only. Update operation is not permitted.'));
});
auditLogSchema.pre('deleteOne', { document: false, query: true }, function guardAgainstDelete(next) {
  next(new Error('AuditLog is Insert-Only. Delete operation is not permitted.'));
});

export default mongoose.model('AuditLog', auditLogSchema);
