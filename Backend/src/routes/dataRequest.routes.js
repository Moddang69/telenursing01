import express from 'express';
import {
  createDataRequest,
  getMyDataRequests,
  getAllDataRequests,
  processDataRequest,
} from '../controllers/dataRequest.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createDataRequestValidator,
  processDataRequestValidator,
} from '../validators/dataRequest.validator.js';

const router = express.Router();

router.post('/', authenticate, verifyRole(['patient']), createDataRequestValidator, validateRequest, createDataRequest);
router.get('/my', authenticate, verifyRole(['patient']), getMyDataRequests);
router.get('/', authenticate, verifyRole(['admin']), getAllDataRequests);
router.patch(
  '/:requestId/process',
  authenticate,
  verifyRole(['admin']),
  processDataRequestValidator,
  validateRequest,
  processDataRequest
);

export default router;
