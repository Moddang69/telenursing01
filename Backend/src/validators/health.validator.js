import { body, param, query } from 'express-validator';
import { HEALTH_RANGES } from '../constants/healthRanges.js';

const keysOf = (metric) => HEALTH_RANGES[metric].map((r) => r.key);

/**
 * health.validator.js
 * ครอบคลุม healthrecords, meallogs, exerciselogs (Phase 7 Models)
 */

export const patientIdParamValidator = [
  param('patientId').isMongoId().withMessage('patientId ไม่ถูกต้อง'),
];

export const listQueryValidator = [
  query('type').optional().isIn(['SMBG', 'BLOOD_PRESSURE', 'HBA1C', 'LDL']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
];

export const createHealthRecordValidator = [
  ...patientIdParamValidator,
  body('type').isIn(['SMBG', 'BLOOD_PRESSURE', 'HBA1C', 'LDL']).withMessage('type ไม่ถูกต้อง'),
  body('date').isISO8601().withMessage('date ไม่ถูกต้อง'),
  body('time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('time ต้องอยู่ในรูปแบบ HH:mm'),
  body('unit').notEmpty().withMessage('กรุณาระบุหน่วย'),

  // ผู้ใช้เลือก "ช่วงค่า" (rangeKey) — ค่าตัวเลขถูกกำหนดที่ Backend จากค่ากลางของช่วง
  body('smbg.rangeKey')
    .if(body('type').equals('SMBG'))
    .isIn(keysOf('smbg'))
    .withMessage('กรุณาเลือกช่วงระดับน้ำตาลในเลือด'),
  body('smbg.measurementType')
    .if(body('type').equals('SMBG'))
    .isIn(['fasting', 'before_meal', 'after_meal', 'bedtime', 'other']),

  body('bloodPressure.systolicRangeKey')
    .if(body('type').equals('BLOOD_PRESSURE'))
    .isIn(keysOf('systolic'))
    .withMessage('กรุณาเลือกช่วงค่า Systolic'),
  body('bloodPressure.diastolicRangeKey')
    .if(body('type').equals('BLOOD_PRESSURE'))
    .isIn(keysOf('diastolic'))
    .withMessage('กรุณาเลือกช่วงค่า Diastolic'),
  body('bloodPressure.pulseRangeKey')
    .if(body('type').equals('BLOOD_PRESSURE'))
    .optional({ nullable: true, checkFalsy: true })
    .isIn(keysOf('pulse'))
    .withMessage('ช่วงชีพจรไม่ถูกต้อง'),

  body('hba1c.rangeKey')
    .if(body('type').equals('HBA1C'))
    .isIn(keysOf('hba1c'))
    .withMessage('กรุณาเลือกช่วงค่า HbA1c'),
  body('ldl.rangeKey')
    .if(body('type').equals('LDL'))
    .isIn(keysOf('ldl'))
    .withMessage('กรุณาเลือกช่วงค่า LDL'),
];

export const createMealLogValidator = [
  ...patientIdParamValidator,
  body('meal').isIn(['เช้า', 'กลางวัน', 'เย็น']).withMessage('meal ไม่ถูกต้อง'),
  body('description').notEmpty().withMessage('กรุณาระบุรายละเอียดอาหาร'),
  body('date').isISO8601().withMessage('date ไม่ถูกต้อง'),
  body('time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
];

export const createExerciseLogValidator = [
  ...patientIdParamValidator,
  body('activity').notEmpty().withMessage('กรุณาระบุกิจกรรม'),
  body('duration').isFloat({ min: 0 }).withMessage('duration ไม่ถูกต้อง'),
  body('distance').optional().isFloat({ min: 0 }),
  body('date').isISO8601().withMessage('date ไม่ถูกต้อง'),
  body('time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
];
