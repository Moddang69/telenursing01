import express from 'express';
import { createAssignment } from '../controllers/careTeam.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifySelfAccess } from '../middleware/verifySelfAccess.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { selectNurseValidator } from '../validators/patient.validator.js';

/**
 * assignment.routes.js (Assumption A9)
 * POST /api/assignments — ใช้ทั้ง Patient เลือก Nurse ครั้งแรก (SelectNursePage)
 * และ Admin Reassign (AdminPatientManagementPage) — คุมสิทธิ์ด้วย verifyRole + verifySelfAccess
 */
const router = express.Router();

router.post(
  '/',
  authenticate,
  verifyRole(['patient', 'admin']),
  // verifySelfAccess ตรวจเฉพาะกรณี Patient เรียกเอง (Admin ข้ามเพราะ role !== 'patient' ใน middleware)
  (req, res, next) => {
    if (req.user.role === 'patient') {
      req.params.patientId = req.body.patientId; // ให้ verifySelfAccess อ่านจาก params ได้
    }
    next();
  },
  verifySelfAccess,
  selectNurseValidator.filter((v) => true), // reuse validator (body.nurseId, body.patientId)
  validateRequest,
  createAssignment
);

export default router;
