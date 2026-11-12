import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter.jsx';
import { authService } from '../../services/authService.js';
import { ROLES } from '../../constants/roles.js';
import { ROUTES } from '../../constants/routes.js';
import './AuthForm.css';

const roleOptions = [
  { value: ROLES.PATIENT, label: 'ผู้ป่วย' },
  { value: ROLES.CAREGIVER, label: 'ผู้ดูแลผู้ป่วย' },
  { value: ROLES.NURSE, label: 'พยาบาล' },
];

/**
 * Step 1 ของการลงทะเบียน — เก็บเฉพาะข้อมูลบัญชี (ไม่รวม HN/วันเกิด/เพศ หรือเลขใบประกอบวิชาชีพ/
 * โรงพยาบาล) แล้วส่งต่อไปหน้าลงทะเบียนเฉพาะ Role (Step 2) ที่จะกรอกข้อมูลโปรไฟล์ให้ครบ +
 * ให้ยืนยันยินยอมนโยบาย/รักษาความลับ ก่อนจึงเรียก authService.register() จริง (ที่หน้านั้น)
 *
 * 🔧 (แก้ครั้งก่อนหน้า): เคยลองให้หน้านี้ navigate ไป /patient/registration แล้วพังเพราะ Route ปลายทาง
 * ถูกครอบ ProtectedRoute (ต้อง login ก่อนถึงเข้าได้ ทั้งที่ตอนนั้นยังไม่มีบัญชีเลย) — ตอนนี้แก้ที่ต้นตอ
 * แล้วใน AppRoutes.jsx (เอา ProtectedRoute ออกจาก Route นั้น ให้เป็นสาธารณะเหมือนฝั่งพยาบาลที่ถูกต้อง
 * อยู่แล้ว) จึง navigate มาที่นี่ได้อย่างปลอดภัยแล้ว
 *
 * Flow เต็ม: RegisterPage (บัญชี+เลือก Role) → [Patient/Nurse]RegistrationPage (โปรไฟล์ครบ+consent)
 *   → register() จริง → OTP → Login → (ผู้ป่วย: เลือกพยาบาล / พยาบาล: รอ Admin อนุมัติ) → ใช้งานได้
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    role: '', phone: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validateAll = () => {
    const newErrors = {
      firstName: validators.required(form.firstName, 'ชื่อ'),
      lastName: validators.required(form.lastName, 'นามสกุล'),
      email: validators.required(form.email, 'อีเมล') || validators.email(form.email),
      password: validators.required(form.password, 'รหัสผ่าน') || validators.password(form.password),
      confirmPassword:
        validators.required(form.confirmPassword, 'ยืนยันรหัสผ่าน') ||
        validators.confirmPassword(form.confirmPassword, form.password),
      role: validators.required(form.role, 'ประเภทผู้ใช้งาน'),
      phone: validators.required(form.phone, 'เบอร์โทรศัพท์'),
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateAll()) return;

    const accountData = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      phone: form.phone,
      role: form.role,
    };

    // ผู้ป่วย/พยาบาล ต้องกรอกโปรไฟล์เฉพาะทาง + ยอมรับนโยบายก่อน จึงจะสร้างบัญชีจริงได้ (Step 2)
    if (form.role === ROLES.PATIENT) {
      navigate(ROUTES.PATIENT_REGISTRATION, { state: { accountData } });
      return;
    }
    if (form.role === ROLES.NURSE) {
      navigate('/nurse/registration', { state: { accountData } });
      return;
    }

    // ผู้ดูแล (Caregiver) — Caregiver model ไม่มี field บังคับเพิ่มเติมนอกจากที่กรอกครบแล้วในหน้านี้
    // จึง register() ได้ทันที ไม่ต้องมีหน้าโปรไฟล์แยก
    setIsSubmitting(true);
    try {
      await authService.register(accountData);
      await authService.requestOtp(form.email);
      navigate(ROUTES.REGISTER + '/otp', {
        state: { email: form.email, flow: 'register', postVerifyRoute: ROUTES.LOGIN },
      });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide" aria-labelledby="register-heading">
        <h1 id="register-heading" className="auth-title">ลงทะเบียนใช้งาน</h1>
        <p className="auth-subtitle">กรอกข้อมูลพื้นฐานเพื่อสร้างบัญชีผู้ใช้งาน</p>

        {submitError && <div className="alert-error" role="alert">{submitError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">ชื่อ</label>
              <input
                id="firstName"
                className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                placeholder="เช่น สมชาย"
                value={form.firstName}
                onChange={handleChange('firstName')}
              />
              {errors.firstName && <span className="form-error-message">{errors.firstName}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">นามสกุล</label>
              <input
                id="lastName"
                className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                placeholder="เช่น ใจดี"
                value={form.lastName}
                onChange={handleChange('lastName')}
              />
              {errors.lastName && <span className="form-error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">อีเมล</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="เช่น somchai@example.com"
              value={form.email}
              onChange={handleChange('email')}
            />
            {errors.email && <span className="form-error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">เบอร์โทรศัพท์</label>
            <input
              id="phone"
              type="tel"
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="เช่น 0812345678"
              value={form.phone}
              onChange={handleChange('phone')}
            />
            {errors.phone && <span className="form-error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder="อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่และตัวเลข"
              value={form.password}
              onChange={handleChange('password')}
            />
            <PasswordStrengthMeter password={form.password} />
            {errors.password && <span className="form-error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">ยืนยันรหัสผ่าน</label>
            <input
              id="confirmPassword"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
            />
            {errors.confirmPassword && <span className="form-error-message">{errors.confirmPassword}</span>}
          </div>

          <fieldset className="form-group role-fieldset">
            <legend className="form-label">ประเภทผู้ใช้งาน</legend>
            <div className="role-options">
              {roleOptions.map((opt) => (
                <label key={opt.value} className={`role-option ${form.role === opt.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={form.role === opt.value}
                    onChange={handleChange('role')}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {errors.role && <span className="form-error-message">{errors.role}</span>}
          </fieldset>

          {(form.role === ROLES.PATIENT || form.role === ROLES.NURSE) && (
            <p className="verification-note">
              ⓘ ขั้นตอนถัดไปจะให้กรอกข้อมูล{form.role === ROLES.PATIENT ? 'ผู้ป่วย' : 'พยาบาล'}เพิ่มเติม
              พร้อมยอมรับนโยบาย{form.role === ROLES.PATIENT ? 'ความยินยอม' : 'การรักษาความลับข้อมูลผู้ป่วย'}
              ก่อนสร้างบัญชีจริงและยืนยัน OTP
            </p>
          )}

          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting
              ? 'กำลังดำเนินการ...'
              : form.role === ROLES.PATIENT || form.role === ROLES.NURSE
              ? 'ถัดไป: กรอกข้อมูลเพิ่มเติม'
              : 'ถัดไป: ยืนยัน OTP'}
          </button>
        </form>

        <p className="auth-footer-text">
          มีบัญชีอยู่แล้ว? <Link to={ROUTES.LOGIN} className="auth-link">เข้าสู่ระบบ</Link>
        </p>
      </section>
    </main>
  );
}