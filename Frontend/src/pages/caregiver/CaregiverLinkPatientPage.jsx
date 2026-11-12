import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import { caregiverService } from '../../services/caregiverService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROUTES } from '../../constants/routes.js';
import '../auth/AuthForm.css';

const RELATIONSHIP_OPTIONS = [
  { value: '', label: '-- เลือกความสัมพันธ์ --' },
  { value: 'parent', label: 'พ่อ/แม่' },
  { value: 'spouse', label: 'คู่สมรส' },
  { value: 'child', label: 'บุตร' },
  { value: 'sibling', label: 'พี่น้อง' },
  { value: 'other', label: 'อื่น ๆ' },
];

// ผู้ดูแลไม่จำเป็นต้องรู้ HN ของผู้ป่วย — ระบุตัวตนผู้ป่วยด้วย ชื่อ + นามสกุล + เบอร์โทรศัพท์แทน
// (ต้องตรงกับข้อมูลที่ผู้ป่วยลงทะเบียนไว้ครบทั้ง 3 ค่า และยังต้องรอพยาบาลอนุมัติก่อนเข้าถึงข้อมูลได้เสมอ)
export default function CaregiverLinkPatientPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', relationship: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errs = [
      validators.required(form.firstName, 'ชื่อผู้ป่วย'),
      validators.required(form.lastName, 'นามสกุลผู้ป่วย'),
      validators.required(form.phone, 'เบอร์โทรศัพท์ผู้ป่วย'),
      form.phone && !/^0[0-9]{9}$/.test(form.phone.trim())
        ? 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก เริ่มด้วย 0'
        : '',
      validators.required(form.relationship, 'ความสัมพันธ์'),
    ].filter(Boolean);

    if (errs.length) {
      setError(errs[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      await caregiverService.requestLink(user.roleRefId, {
        patientFirstName: form.firstName.trim(),
        patientLastName: form.lastName.trim(),
        patientPhone: form.phone.trim(),
        relationship: form.relationship,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'ไม่พบข้อมูลผู้ป่วยที่ตรงกัน กรุณาตรวจสอบชื่อ นามสกุล และเบอร์โทรศัพท์อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">ส่งคำขอเชื่อมต่อสำเร็จ</h1>
          <p className="auth-subtitle">
            คำขอเชื่อมต่อกับผู้ป่วยของท่านถูกส่งเรียบร้อยแล้ว กรุณารอพยาบาลผู้ดูแลผู้ป่วยอนุมัติคำขอก่อนจึงจะเข้าถึงข้อมูลได้
          </p>
          <button className="btn-primary btn-large" onClick={() => navigate(ROUTES.LOGIN)}>
            กลับสู่หน้าเข้าสู่ระบบ
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">เชื่อมต่อกับผู้ป่วย</h1>
        <p className="auth-subtitle">
          กรุณากรอกชื่อ นามสกุล และเบอร์โทรศัพท์ของผู้ป่วยที่ท่านดูแล เพื่อส่งคำขอเชื่อมโยง (ต้องรอพยาบาลอนุมัติ)
        </p>
        {error && <div className="alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="patient-firstname" className="form-label">ชื่อผู้ป่วย</label>
            <input id="patient-firstname" className="form-input" placeholder="เช่น สมชาย"
              value={form.firstName} onChange={handleChange('firstName')} />
          </div>
          <div className="form-group">
            <label htmlFor="patient-lastname" className="form-label">นามสกุลผู้ป่วย</label>
            <input id="patient-lastname" className="form-input" placeholder="เช่น ใจดี"
              value={form.lastName} onChange={handleChange('lastName')} />
          </div>
          <div className="form-group">
            <label htmlFor="patient-phone" className="form-label">เบอร์โทรศัพท์ของผู้ป่วย</label>
            <input id="patient-phone" className="form-input" placeholder="0812345678" inputMode="numeric"
              value={form.phone} onChange={handleChange('phone')} />
          </div>
          <div className="form-group">
            <label htmlFor="relationship" className="form-label">ความสัมพันธ์กับผู้ป่วย</label>
            <select id="relationship" className="form-input" value={form.relationship} onChange={handleChange('relationship')}>
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเชื่อมต่อ'}
          </button>
        </form>
      </section>
    </main>
  );
}
