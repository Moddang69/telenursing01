import ApiError from '../utils/ApiError.js';

/**
 * verifyRole.js (Phase 4.4 — RBAC Matrix)
 * ใช้ต่อจาก authenticate.js เสมอ — จำกัดว่า Role ใดเข้าถึง Route นี้ได้
 * Usage: verifyRole(['nurse', 'admin'])
 */
export function verifyRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'ไม่พบข้อมูลการยืนยันตัวตน'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role "${req.user.role}" ไม่มีสิทธิ์เข้าถึง Resource นี้`)
      );
    }
    next();
  };
}

export default verifyRole;
