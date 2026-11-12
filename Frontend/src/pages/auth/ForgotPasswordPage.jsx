import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter.jsx';
import { authService } from '../../services/authService.js';
import { ROUTES } from '../../constants/routes.js';
import OtpVerificationPage from './OtpVerificationPage.jsx';
import './AuthForm.css';

function EnterEmailStep() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validators.required(email, 'อีเมล') || validators.email(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.requestOtp(email);
      navigate(ROUTES.FORGOT_PASSWORD + '/otp', { state: { email, flow: 'forgot-password' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">ลืมรหัสผ่าน</h1>
        <p className="auth-subtitle">กรอกอีเมลที่ลงทะเบียนไว้ เพื่อรับรหัส OTP สำหรับตั้งรหัสผ่านใหม่</p>
        {error && <div className="alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reset-email" className="form-label">อีเมลที่ลงทะเบียน</label>
            <input
              id="reset-email"
              type="email"
              className="form-input"
              placeholder="เช่น somchai@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งรหัส OTP'}
          </button>
        </form>
        <p className="auth-footer-text">
          <Link to={ROUTES.LOGIN} className="auth-link">กลับสู่หน้าเข้าสู่ระบบ</Link>
        </p>
      </section>
    </main>
  );
}

function ResetPasswordStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!email) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p>เซสชันไม่ถูกต้อง กรุณาเริ่มต้นใหม่</p>
          <button className="btn-primary" onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}>
            เริ่มใหม่
          </button>
        </section>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      password: validators.required(password, 'รหัสผ่านใหม่') || validators.password(password),
      confirmPassword:
        validators.required(confirmPassword, 'ยืนยันรหัสผ่าน') ||
        validators.confirmPassword(confirmPassword, password),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await authService.resetPassword(email, password);
      navigate(ROUTES.FORGOT_PASSWORD + '/success');
    } catch (err) {
      setErrors({ password: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">ตั้งรหัสผ่านใหม่</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="new-password" className="form-label">รหัสผ่านใหม่</label>
            <input
              id="new-password"
              type="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrengthMeter password={password} />
            {errors.password && <span className="form-error-message">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="confirm-new-password" className="form-label">ยืนยันรหัสผ่านใหม่</label>
            <input
              id="confirm-new-password"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirmPassword && (
              <span className="form-error-message">{errors.confirmPassword}</span>
            )}
          </div>
          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันรหัสผ่านใหม่'}
          </button>
        </form>
      </section>
    </main>
  );
}

function SuccessStep() {
  const navigate = useNavigate();
  return (
    <main className="auth-page">
      <section className="auth-card state-page">
        <h1>เปลี่ยนรหัสผ่านสำเร็จ</h1>
        <p>คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>
        <button className="btn-primary btn-large" onClick={() => navigate(ROUTES.LOGIN)}>
          กลับสู่หน้าเข้าสู่ระบบ
        </button>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Routes>
      <Route index element={<EnterEmailStep />} />
      <Route path="otp" element={<OtpVerificationPage />} />
      <Route path="reset" element={<ResetPasswordStep />} />
      <Route path="success" element={<SuccessStep />} />
    </Routes>
  );
}