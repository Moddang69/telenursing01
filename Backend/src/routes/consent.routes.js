import express from 'express';
import { giveConsent, withdrawConsent, getConsentHistory } from '../controllers/consent.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { giveConsentValidator, withdrawConsentValidator } from '../validators/consent.validator.js';

const router = express.Router();

router.post('/', authenticate, verifyRole(['patient', 'nurse']), giveConsentValidator, validateRequest, giveConsent);
router.patch('/withdraw', authenticate, verifyRole(['patient']), withdrawConsentValidator, validateRequest, withdrawConsent);
router.get('/history', authenticate, verifyRole(['patient', 'nurse']), getConsentHistory);

export default router;
