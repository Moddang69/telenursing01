import { AuditLog } from '../models/index.js';

/**
 * auditLogger.js (Phase 4.7 — Mandatory Audit Events)
 * Helper function เรียกใช้ใน Controller เพื่อบันทึก auditlogs แบบ Insert-Only
 * ออกแบบให้ไม่ throw error ทำให้ Controller หลักพังถ้าการบันทึก log ล้มเหลว (best-effort logging)
 */
export async function logAudit({ userId, userName, action, targetType = null, targetId = null, result, ipAddress = null }) {
  try {
    await AuditLog.create({ userId, userName, action, targetType, targetId, result, ipAddress });
  } catch (err) {
    // Log ความล้มเหลวของ Audit Log เองไปที่ console เพื่อไม่ให้ Silent Fail หายไปเฉยๆ
    console.error('⚠️  Failed to write AuditLog: - auditLogger.js:13', err.message);
  }
}

export default logAudit;