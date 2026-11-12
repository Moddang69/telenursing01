import express from 'express';
import { searchAll } from '../controllers/search.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { searchValidator } from '../validators/search.validator.js';

/**
 * /api/search — ผู้ป่วย ผู้ดูแล และพยาบาล (Admin ไม่รองรับ)
 */
const router = express.Router();

router.get('/', authenticate, verifyRole(['patient', 'caregiver', 'nurse']), searchValidator, validateRequest, searchAll);

export default router;