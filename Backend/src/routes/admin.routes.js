import express from 'express';
import {
  listUsers,
  listPendingNurses,
  listAllNurses,
  getDashboardSummary,
  processNurseApproval,
  listAllPatients,
  reassignPatientNurse,
  suspendUser,
  getAuditLogs,
} from '../controllers/admin.controller.js';
import {
  getPatientCaregiverLinks,
  listPendingCaregiverLinks,
} from '../controllers/caregiver.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  listUsersQueryValidator,
  nurseApprovalValidator,
  reassignNurseValidator,
} from '../validators/admin.validator.js';

const router = express.Router();

router.use(authenticate, verifyRole(['admin']));

router.get('/dashboard-summary', getDashboardSummary);

router.get('/users', listUsersQueryValidator, validateRequest, listUsers);
router.patch('/users/:userId/suspend', suspendUser);

router.get('/nurses/pending', listPendingNurses);
router.get('/nurses', listAllNurses);
router.patch('/nurses/:nurseId/approval', nurseApprovalValidator, validateRequest, processNurseApproval);

router.get('/patients', listAllPatients);
router.patch('/patients/:patientId/reassign', reassignNurseValidator, validateRequest, reassignPatientNurse);
router.get('/patients/:patientId/caregiver-links', getPatientCaregiverLinks);
router.get('/caregiver-links/pending', listPendingCaregiverLinks);

router.get('/audit-logs', getAuditLogs);

export default router;
