import express from 'express';
import {
  createSatisfactionRating,
  getNurseSatisfactionRatings,
  getNurseAverageRating,
  checkRatingExists,
} from '../controllers/satisfactionRating.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { body, param } from 'express-validator';

const router = express.Router();

// POST /api/satisfaction-ratings - ผู้ป่วยให้คะแนน
router.post(
  '/',
  authenticate,
  verifyRole(['patient']),
  [
    body('appointmentId').isMongoId().withMessage('appointmentId ไม่ถูกต้อง'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('คะแนนต้องอยู่ระหว่าง 1-5'),
    body('comment').optional().isString().isLength({ max: 1000 }),
  ],
  validateRequest,
  createSatisfactionRating
);

// GET /api/satisfaction-ratings/check/:appointmentId - เช็คว่าให้คะแนนแล้วหรือยัง
router.get(
  '/check/:appointmentId',
  authenticate,
  verifyRole(['patient']),
  [param('appointmentId').isMongoId().withMessage('appointmentId ไม่ถูกต้อง')],
  validateRequest,
  checkRatingExists
);

// GET /api/satisfaction-ratings/nurse/:nurseId - ดึงคะแนนทั้งหมดของพยาบาล
router.get(
  '/nurse/:nurseId',
  authenticate,
  verifyRole(['nurse', 'admin']),
  [param('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง')],
  validateRequest,
  getNurseSatisfactionRatings
);

// GET /api/satisfaction-ratings/nurse/:nurseId/average - คำนวณคะแนนเฉลี่ย
router.get(
  '/nurse/:nurseId/average',
  authenticate,
  verifyRole(['nurse', 'admin']),
  [param('nurseId').isMongoId().withMessage('nurseId ไม่ถูกต้อง')],
  validateRequest,
  getNurseAverageRating
);

export default router;
