import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOtpTimer } from '../../hooks/useOtpTimer.js';
import { authService } from '../../services/authService.js';
import { ROUTES } from '../../constants/routes.js';
import './AuthForm.css';

/**
 * OtpVerificationPage
 * ใช้ร่วมกัน 2 flow:
 * - flow === 'register'         -> account + profile ถูกสร้างไว้ครบแล้วตั้งแต่ก่อนหน้านี้
 *                                   (RegisterPage -> [Patient/Nurse/Caregiver]RegistrationPage -> register() -> ที่นี่)
 *                                   หลังยืนยัน OTP ผ่าน ไปที่ location.state.postVerifyRoute (หรือ LOGIN ถ้าไม่ระบุ)
 * - flow === 'forgot-password'  -> หลังยืนยัน ไปหน้าตั้งรหัสผ่านใหม่
 */
export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, flow, postVerifyRoute } = location.state || {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const otpTimer = useOtpTimer();

  React.useEffect(() => {
    otpTimer.registerSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!email) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>ไม่พบข้อมูลสำหรับยืนยัน OTP กรุณาเริ่มต้นใหม่</p>
          <button className="btn-primary" onClick={() => navigate(ROUTES.LOGIN)}>
            กลับสู่หน้าเข้าสู่ระบบ
          </button>
        </section>
      </main>
    );
  }

  const purpose = flow === 'forgot-password' ? 'FORGOT_PASSWORD' : 'REGISTER';

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (otpTimer.isExpired) {
      setError('OTP หมดอายุแล้ว กรุณาขอรหัสใหม่');
      return;
    }
    if (otpTimer.attemptsLimitReached) {
      setError('กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอ OTP ใหม่');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }

    setIsVerifying(true);
    try {
      await authService.verifyOtp(email, otp, purpose);

      if (flow === 'register') {
        // profile ถูกสร้างเสร็จไปแล้วตั้งแต่หน้าก่อนหน้า (authService.register ครั้งเดียวพร้อม profile)
        // registerUser() ไม่คืน token มาด้วย จึงยัง "ไม่ login" ให้อัตโนมัติ -> ต้องไปหน้า Login เพื่อรับ token จริง
        navigate(postVerifyRoute || ROUTES.LOGIN, { state: { justRegistered: true, email } });
      } else if (flow === 'forgot-password') {
        navigate(ROUTES.FORGOT_PASSWORD + '/reset', { state: { email } });
      } else {
        navigate(ROUTES.LOGIN);
      }
    } catch (err) {
      otpTimer.registerWrongAttempt();
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await authService.requestOtp(email, purpose);
      otpTimer.registerSend();
      setOtp('');
    } catch (err) {
      setError(err.message);
    }
  };

  const minutes = Math.floor(otpTimer.secondsLeft / 60);
  const seconds = String(otpTimer.secondsLeft % 60).padStart(2, '0');

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="otp-heading">
        <h1 id="otp-heading" className="auth-title">ยืนยันรหัส OTP</h1>
        <p className="auth-subtitle">
          เราได้ส่งรหัสยืนยัน 6 หลักไปยังอีเมล <strong>{email}</strong>
        </p>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form onSubmit={handleVerify} noValidate>
          <div className="form-group">
            <label htmlFor="otp" className="form-label">รหัส OTP</label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              className="form-input otp-input"
              placeholder="กรอกรหัส 6 หลัก"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <p className="otp-timer" aria-live="polite">
            {otpTimer.isExpired ? (
              <span className="text-danger">รหัส OTP หมดอายุแล้ว</span>
            ) : (
              <>รหัสจะหมดอายุใน {minutes}:{seconds} นาที</>
            )}
          </p>

          <button
            type="submit"
            className="btn-primary btn-large"
            disabled={isVerifying || otpTimer.isExpired}
          >
            {isVerifying ? 'กำลังตรวจสอบ...' : 'ยืนยัน OTP'}
          </button>

          <button
            type="button"
            className="btn-secondary btn-full"
            onClick={handleResend}
            disabled={!otpTimer.canResend}
          >
            {otpTimer.canResend
              ? 'ส่งรหัส OTP อีกครั้ง'
              : otpTimer.resendLimitReached
              ? 'ขอรหัสใหม่ครบจำนวนที่กำหนดแล้ว'
              : `ส่งรหัสใหม่ได้ในอีก ${otpTimer.cooldown} วินาที`}
          </button>
        </form>
      </section>
    </main>
  );
}