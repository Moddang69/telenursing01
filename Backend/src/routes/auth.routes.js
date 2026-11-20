import express from 'express';
import {
  register,
  login,
  logout,
  restoreSessionHandler,
  requestOtp,
  verifyOtp,
  resetPasswordHandler,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { checkAvailability } from '../controllers/availability.controller.js';
import { availabilityValidator } from '../validators/availability.validator.js';
import {
  registerValidator,
  loginValidator,
  requestOtpValidator,
  verifyOtpValidator,
  resetPasswordValidator,
} from '../validators/auth.validator.js';

/**
 * auth.routes.js
 * Map ตรงกับ Frontend authService.js ทุก method (Phase 1.1 Service Mapping Table)
 */
const router = express.Router();

// ตรวจอีเมล/HN/เลขใบอนุญาตว่าถูกใช้แล้วหรือยัง (ให้ฟอร์มลงทะเบียนแจ้งทันทีหลังกรอกช่องนั้นเสร็จ)
// จำกัดอัตราต่อ IP เพื่อกันการไล่เดาข้อมูล (user enumeration)
const availabilityLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
router.get('/check-availability', availabilityLimiter, availabilityValidator, validateRequest, checkAvailability);

router.post('/register', registerValidator, validateRequest, register);
router.post('/login', loginValidator, validateRequest, login);
router.post('/logout', authenticate, logout);
router.get('/restore-session', authenticate, restoreSessionHandler);
router.post('/otp/request', requestOtpValidator, validateRequest, requestOtp);
router.post('/otp/verify', verifyOtpValidator, validateRequest, verifyOtp);
router.post('/reset-password', resetPasswordValidator, validateRequest, resetPasswordHandler);

export default router;
