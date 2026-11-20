import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import { ROUTES } from '../../constants/routes.js';
import '../auth/AuthForm.css';
import { authService } from '../../services/authService.js';

export default function CaregiverRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    secondaryContact: '',
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
      phone: validators.required(form.phone, 'เบอร์โทรศัพท์') || validators.phone(form.phone),
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      // ตรงตาม Caregiver.js: firstName, lastName, phone (required) + address, secondaryContact (optional)
      await authService.register({
        email: form.email,
        password: form.password,
        role: 'caregiver',
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address || null,
        secondaryContact: form.secondaryContact || null,
      });

      await authService.requestOtp(form.email, 'REGISTER');

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
      <section className="auth-card auth-card-wide">
        <h1 className="auth-title">ลงทะเบียนผู้ดูแล</h1>
        <p className="auth-subtitle">สร้างบัญชีผู้ดูแล — หลังยืนยันตัวตนแล้วท่านจะเชื่อมต่อกับผู้ป่วยที่ดูแลได้ในขั้นตอนถัดไป</p>

        {submitError && <div className="alert-error" role="alert">{submitError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <h2 className="section-subheading">ข้อมูลบัญชีผู้ใช้งาน</h2>
          <div className="form-group">
            <label htmlFor="email" className="form-label">อีเมล</label>
            <input id="email" type="email" className={`form-input ${errors.email ? 'input-error' : ''}`}
              value={form.email} onChange={handleChange('email')} />
            {errors.email && <span className="form-error-message">{errors.email}</span>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password" className="form-label">รหัสผ่าน</label>
              <input id="password" type="password" className={`form-input ${errors.password ? 'input-error' : ''}`}
                value={form.password} onChange={handleChange('password')} />
              {errors.password && <span className="form-error-message">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">ยืนยันรหัสผ่าน</label>
              <input id="confirmPassword" type="password" className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                value={form.confirmPassword} onChange={handleChange('confirmPassword')} />
              {errors.confirmPassword && <span className="form-error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          <h2 className="section-subheading">ข้อมูลส่วนตัว</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">ชื่อ</label>
              <input id="firstName" className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                value={form.firstName} onChange={handleChange('firstName')} />
              {errors.firstName && <span className="form-error-message">{errors.firstName}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">นามสกุล</label>
              <input id="lastName" className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                value={form.lastName} onChange={handleChange('lastName')} />
              {errors.lastName && <span className="form-error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">เบอร์โทรศัพท์</label>
            <input id="phone" className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="0812345678" value={form.phone} onChange={handleChange('phone')} />
            {errors.phone && <span className="form-error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address" className="form-label">ที่อยู่ปัจจุบัน (ไม่บังคับ)</label>
            <textarea id="address" className="form-input textarea" value={form.address} onChange={handleChange('address')} />
          </div>

          <div className="form-group">
            <label htmlFor="secondaryContact" className="form-label">เบอร์ติดต่อสำรอง (ไม่บังคับ)</label>
            <input id="secondaryContact" className="form-input" value={form.secondaryContact} onChange={handleChange('secondaryContact')} />
          </div>

          <p className="verification-note">
            ⓘ หลังลงทะเบียนและยืนยัน OTP สำเร็จ ท่านจะสามารถส่งคำขอเชื่อมโยงกับผู้ป่วยที่ดูแล
            (ด้วยชื่อ นามสกุล และเบอร์โทรศัพท์ของผู้ป่วย ไม่ต้องใช้ HN)
            ได้ที่หน้า "เชื่อมต่อกับผู้ป่วย" ซึ่งต้องรอพยาบาลอนุมัติก่อนจึงจะเข้าถึงข้อมูลได้
          </p>

          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังบันทึก...' : 'ถัดไป: ยืนยัน OTP'}
          </button>
        </form>

        <p className="auth-footer-text">
          มีบัญชีอยู่แล้ว? <Link to={ROUTES.LOGIN} className="auth-link">เข้าสู่ระบบ</Link>
        </p>
      </section>
    </main>
  );
}
