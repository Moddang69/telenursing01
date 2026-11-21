import express from 'express';
import {
  createCaseClosure,
  getNurseCaseClosures,
  getNurseCaseClosureCount,
} from '../controllers/caseClosure.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { body, param } from 'express-validator';

const router = express.Router();

// POST /api/case-closures - พยาบาลปิดเคส
router.post(
  '/',
  authenticate,
  verifyRole(['nurse']),
  [
    body('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
    body('closureReason')
      .isIn(['disease_remission', 'lost_contact', 'patient_deceased', 'transferred', 'patient_request', 'other'])
      .withMessage('closureReason ไม่ถูกต้อง'),
    body('otherReason').optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  createCaseClosure
);

// GET /api/case-closures/nurse/:nurseId - ดึงประวัติการปิดเคสของพยาบาล
router.get(
  '/nurse/:nurseId',
  authenticate,
  verifyRole(['nurse', 'admin']),
  [param('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง')],
  validateRequest,
  getNurseCaseClosures
);

// GET /api/case-closures/count/nurse/:nurseId - นับจำนวนเคสที่ปิด
router.get(
  '/count/nurse/:nurseId',
  authenticate,
  verifyRole(['nurse', 'admin']),
  [param('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง')],
  validateRequest,
  getNurseCaseClosureCount
);

export default router;
