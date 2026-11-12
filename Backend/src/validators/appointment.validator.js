import { body, param } from 'express-validator';

export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const appointmentIdParamValidator = [
  param('appointmentId').isMongoId().withMessage('appointmentId ไม่ถูกต้อง'),
];

export const createAppointmentValidator = [
  ...patientIdParamValidator,
  body('date').isISO8601().withMessage('date ไม่ถูกต้อง'),
  body('dueDateTime').optional().isISO8601().withMessage('dueDateTime ไม่ถูกต้อง'),
  body('note').optional({ nullable: true }).isString(),
  body('time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('time ต้องอยู่ในรูปแบบ HH:mm'),
  body('reason').optional().isString(),
];

export const updateAppointmentStatusValidator = [
  ...appointmentIdParamValidator,
  body('status')
    .isIn([
      'SCHEDULED',
      'WAITING',
      'PATIENT_JOINED',
      'NURSE_JOINED',
      'IN_CONSULTATION',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
      'RESCHEDULED',
    ])
    .withMessage('status ไม่ถูกต้อง'),
];

export const submitPreConsultValidator = [
  ...appointmentIdParamValidator,
  body('location').optional().isString(),
  body('gpsCoordinates.lat').optional().isFloat(),
  body('gpsCoordinates.lng').optional().isFloat(),
  body('emergencyContact').optional().isString(),
  body('latestGlucose').optional().isString(),
  body('latestBP').optional().isString(),
  body('painLevel').optional().isInt({ min: 0, max: 10 }),
  body('symptoms').optional().isArray(),
  body('otherSymptom').optional().isString(),
  body('hospitalizedLastMonth').optional().isBoolean(),
];
