import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter.jsx';
import AvailabilityHint from '../../components/common/AvailabilityHint.jsx';
import { useAvailabilityCheck } from '../../hooks/useAvailabilityCheck.js';
import { authService } from '../../services/authService.js';
import { ROLES } from '../../constants/roles.js';
import { ROUTES } from '../../constants/routes.js';
import './AuthForm.css';

const roleOptions = [
  { value: ROLES.PATIENT, label: 'ผู้ป่วย' },
  { value: ROLES.CAREGIVER, label: 'ผู้ดูแลผู้ป่วย' },
  { value: ROLES.NURSE, label: 'พยาบาล' },
];

// กฎตรวจแต่ละช่อง — ใช้ทั้งตอนกรอกเสร็จ (blur) และตอนกดถัดไป
const RULES = {
  firstName: (f) => validators.required(f.firstName, 'ชื่อ'),
  lastName: (f) => validators.required(f.lastName, 'นามสกุล'),
  email: (f) => validators.required(f.email, 'อีเมล') || validators.email(f.email.trim()),
  phone: (f) => validators.required(f.phone, 'เบอร์โทรศัพท์') || validators.phone(f.phone.trim()),
  password: (f) => validators.required(f.password, 'รหัสผ่าน') || validators.password(f.password),
  confirmPassword: (f) =>
    validators.required(f.confirmPassword, 'ยืนยันรหัสผ่าน') || validators.confirmPassword(f.confirmPassword, f.password),
  role: (f) => validators.required(f.role, 'ประเภทผู้ใช้งาน'),
};

/**
 * Step 1 ของการลงทะเบียน — เก็บเฉพาะข้อมูลบัญชี (ไม่รวม HN/วันเกิด/เพศ หรือเลขใบประกอบวิชาชีพ/
 * โรงพยาบาล) แล้วส่งต่อไปหน้าลงทะเบียนเฉพาะ Role (Step 2) ที่จะกรอกข้อมูลโปรไฟล์ให้ครบ +
 * ให้ยืนยันยินยอมนโยบาย/รักษาความลับ ก่อนจึงเรียก authService.register() จริง (ที่หน้านั้น)
 *
 * ตรวจแต่ละช่องทันทีเมื่อกรอกเสร็จ (blur): รูปแบบไม่ถูกต้อง / อีเมลถูกใช้งานแล้ว ฯลฯ — ไม่ต้องรอกดถัดไป
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
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailCheck = useAvailabilityCheck('email');

  // อัปเดตค่า แล้วตรวจซ้ำทันทีถ้าช่องนั้นเคยกรอกเสร็จแล้ว (ข้อความผิดพลาดจะหายเองเมื่อแก้ถูก)
  const setField = (field, value, validateNow = false) => {
    const next = { ...form, [field]: value };
    setForm(next);
    setErrors((prev) => {
      const upd = { ...prev };
      if (validateNow || touched[field]) upd[field] = RULES[field](next);
      if (field === 'password' && touched.confirmPassword) upd.confirmPassword = RULES.confirmPassword(next);
      return upd;
    });
    if (field === 'email') emailCheck.reset();
  };

  const handleChange = (field) => (e) => setField(field, e.target.value);

  // กรอกช่องนั้นเสร็จ (ออกจากช่อง) → ตรวจและแสดงผลทันที
  const handleBlur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    const message = RULES[field](form);
    setErrors((prev) => ({ ...prev, [field]: message }));
    if (field === 'email' && !message) emailCheck.check(form.email.trim());
  };

  const validateAll = () => {
    const all = {};
    Object.keys(RULES).forEach((k) => {
      all[k] = RULES[k](form);
    });
    setErrors(all);
    setTouched(Object.fromEntries(Object.keys(RULES).map((k) => [k, true])));
    return Object.values(all).every((v) => !v);
  };

  // อีเมลเคยลงทะเบียนแต่ยังไม่ยืนยัน OTP → ไปยืนยันต่อได้เลย
  const handleResumeOtp = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await authService.requestOtp(form.email.trim(), 'REGISTER');
      navigate(ROUTES.REGISTER + '/otp', {
        state: { email: form.email.trim(), flow: 'register', postVerifyRoute: ROUTES.LOGIN },
      });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      // กันกรณีกดถัดไปเร็วก่อนตรวจอีเมลเสร็จ / อีเมลถูกใช้ไปแล้ว (ข้อความแสดงใต้ช่องอีเมล)
      const emailStatus = await emailCheck.ensure(form.email.trim());
      if (emailStatus === 'taken') {
        document.getElementById('email')?.focus();
        return;
      }

      const accountData = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
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
      await authService.register(accountData);
      await authService.requestOtp(accountData.email);
      navigate(ROUTES.REGISTER + '/otp', {
        state: { email: accountData.email, flow: 'register', postVerifyRoute: ROUTES.LOGIN },
      });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailInvalid = errors.email || emailCheck.status === 'taken';

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
                onBlur={handleBlur('firstName')}
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
                onBlur={handleBlur('lastName')}
              />
              {errors.lastName && <span className="form-error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">อีเมล</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`form-input ${emailInvalid ? 'input-error' : ''}`}
              placeholder="เช่น somchai@example.com"
              value={form.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
            />
            {errors.email ? (
              <span className="form-error-message">{errors.email}</span>
            ) : (
              <AvailabilityHint
                check={emailCheck}
                availableText="อีเมลนี้ใช้ลงทะเบียนได้"
                takenText="อีเมลนี้ถูกใช้งานแล้ว"
                takenAction={<Link to={ROUTES.LOGIN} className="auth-link">เข้าสู่ระบบ</Link>}
                unverifiedText="อีเมลนี้เคยลงทะเบียนไว้แล้วแต่ยังไม่ได้ยืนยัน OTP"
                unverifiedAction={
                  <button type="button" className="field-link-btn" onClick={handleResumeOtp} disabled={isSubmitting}>
                    ยืนยัน OTP ตอนนี้
                  </button>
                }
              />
            )}
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
              onBlur={handleBlur('phone')}
            />
            {errors.phone && <span className="form-error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder="อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่และตัวเลข"
              value={form.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
            />
            <PasswordStrengthMeter password={form.password} />
            {errors.password && <span className="form-error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">ยืนยันรหัสผ่าน</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
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
                    onChange={(e) => {
                      setTouched((t) => ({ ...t, role: true }));
                      setField('role', e.target.value, true);
                    }}
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
