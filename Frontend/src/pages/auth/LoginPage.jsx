import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';
import { ROUTES } from '../../constants/routes.js';
import './LoginPage.css';

const roleHomeMap = {
  [ROLES.PATIENT]: ROUTES.PATIENT_HOME,
  [ROLES.CAREGIVER]: ROUTES.CAREGIVER_HOME,
  [ROLES.NURSE]: ROUTES.NURSE_HOME,
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'กรุณากรอกอีเมล';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';

    if (!password) newErrors.password = 'กรุณากรอกรหัสผ่าน';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email, password });
      const from = location.state?.from?.pathname;
      const destination = from || roleHomeMap[loggedInUser.role] || ROUTES.LOGIN;
      navigate(destination, { replace: true });
    } catch (err) {
      setSubmitError(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <h1 id="login-heading" className="auth-title">
          เข้าสู่ระบบ
        </h1>
        <p className="auth-subtitle">Telenursing Prototype — Diabetes Self-Management</p>

        {submitError && (
          <div className="alert-error" role="alert">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="เช่น somchai@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span id="email-error" className="form-error-message">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              รหัสผ่าน
            </label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="กรอกรหัสผ่านของคุณ"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
            {errors.password && (
              <span id="password-error" className="form-error-message">
                {errors.password}
              </span>
            )}
          </div>

          <div className="auth-links-row">
            <Link to={ROUTES.FORGOT_PASSWORD} className="auth-link">
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="auth-footer-text">
          ยังไม่มีบัญชี?{' '}
          <Link to={ROUTES.REGISTER} className="auth-link">
            ลงทะเบียน
          </Link>
        </p>

      </section>
    </main>
  );
}