import express from 'express';
import {
  getCaregiverProfile,
  updateCaregiverProfile,
  requestCaregiverLink,
  getCaregiverLinks,
  getPatientCaregiverLinks,
  approveCaregiverLink,
  revokeCaregiverLink,
  updateCaregiverPermissions,
} from '../controllers/caregiver.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyRole } from '../middleware/verifyRole.js';
import { verifyCaregiverLinkOwnerOrCareTeam } from '../middleware/verifyCaregiverLinkOwnerOrCareTeam.js';
import { verifyCareTeamAccess } from '../middleware/verifyCareTeamAccess.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  caregiverIdParamValidator,
  requestLinkValidator,
  approveLinkValidator,
  updatePermissionsValidator,
  linkIdParamValidator,
  patientIdParamValidator,
} from '../validators/caregiver.validator.js';

const router = express.Router();

// ผู้ดูแลเข้าถึงได้เฉพาะข้อมูลของตนเอง (Admin ผ่านได้)
const verifyCaregiverSelf = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.user.roleRefId || req.user.roleRefId !== req.params.caregiverId) {
    return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลของผู้ดูแลท่านอื่น' });
  }
  return next();
};

// Nurse ดูรายการผู้ดูแลที่ขอเชื่อมโยงกับผู้ป่วยใน Care Team ของตน (ใช้อนุมัติคำขอ)
router.get(
  '/patient/:patientId/links',
  authenticate,
  verifyRole(['nurse']),
  patientIdParamValidator,
  validateRequest,
  verifyCareTeamAccess,
  getPatientCaregiverLinks
);

router.get('/:caregiverId', authenticate, verifyRole(['caregiver', 'admin']), caregiverIdParamValidator, validateRequest, verifyCaregiverSelf, getCaregiverProfile);
router.patch('/:caregiverId', authenticate, verifyRole(['caregiver']), caregiverIdParamValidator, validateRequest, verifyCaregiverSelf, updateCaregiverProfile);

router.post(
  '/:caregiverId/links',
  authenticate,
  verifyRole(['caregiver']),
  caregiverIdParamValidator,
  requestLinkValidator,
  validateRequest,
  requestCaregiverLink
);

router.get('/:caregiverId/links', authenticate, verifyRole(['caregiver']), caregiverIdParamValidator, validateRequest, verifyCaregiverSelf, getCaregiverLinks);

router.patch(
  '/links/:linkId/approve',
  authenticate,
  verifyRole(['nurse', 'admin']),
  linkIdParamValidator,
  approveLinkValidator,
  validateRequest,
  verifyCaregiverLinkOwnerOrCareTeam,
  approveCaregiverLink
);

router.patch(
  '/links/:linkId/revoke',
  authenticate,
  verifyRole(['nurse', 'admin']),
  linkIdParamValidator,
  validateRequest,
  verifyCaregiverLinkOwnerOrCareTeam,
  revokeCaregiverLink
);

router.patch(
  '/links/:linkId/permissions',
  authenticate,
  verifyRole(['nurse', 'admin']),
  updatePermissionsValidator,
  validateRequest,
  verifyCaregiverLinkOwnerOrCareTeam,
  updateCaregiverPermissions
);

export default router;
