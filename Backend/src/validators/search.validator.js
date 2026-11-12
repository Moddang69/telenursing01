import { query } from 'express-validator';
import { MIN_QUERY_LENGTH, MAX_QUERY_LENGTH } from '../services/search.service.js';

export const searchValidator = [
  query('q')
    .isString()
    .withMessage('กรุณาระบุคำค้นหา')
    .bail()
    .trim()
    .isLength({ min: MIN_QUERY_LENGTH, max: MAX_QUERY_LENGTH })
    .withMessage(`คำค้นหาต้องยาว ${MIN_QUERY_LENGTH} – ${MAX_QUERY_LENGTH} ตัวอักษร`),
];