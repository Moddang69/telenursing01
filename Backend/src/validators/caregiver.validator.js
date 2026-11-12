import { body, param } from 'express-validator';

export const caregiverIdParamValidator = [
  param('caregiverId').isMongoId().withMessage('caregiverId ไม่ถูกต้อง'),
];

export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const linkIdParamValidator = [
  param('linkId').isMongoId().withMessage('linkId ไม่ถูกต้อง'),
];

// ผู้ดูแลไม่ต้องรู้ HN — ระบุผู้ป่วยด้วย ชื่อ + นามสกุล + เบอร์โทรศัพท์ของผู้ป่วย (ต้องตรงทั้งหมด)
// และยังต้องรอพยาบาลผู้ดูแลอนุมัติก่อนเข้าถึงข้อมูลได้เสมอ
export const requestLinkValidator = [
  body('patientFirstName').trim().notEmpty().withMessage('กรุณาระบุชื่อผู้ป่วย'),
  body('patientLastName').trim().notEmpty().withMessage('กรุณาระบุนามสกุลผู้ป่วย'),
  body('patientPhone').trim().matches(/^0[0-9]{9}$/).withMessage('เบอร์โทรศัพท์ผู้ป่วยต้องเป็นตัวเลข 10 หลัก เริ่มด้วย 0'),
  body('relationship').notEmpty().withMessage('กรุณาระบุความสัมพันธ์'),
];

export const approveLinkValidator = [
  ...linkIdParamValidator,
  body('permissions').optional().isObject(),
];

export const updatePermissionsValidator = [
  ...linkIdParamValidator,
  body('permissions').isObject().withMessage('กรุณาระบุ permissions'),
];
