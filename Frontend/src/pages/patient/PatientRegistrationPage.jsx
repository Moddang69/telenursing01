import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import { ROUTES } from '../../constants/routes.js';
import { authService } from '../../services/authService.js';
import { patientConsentFullText } from '../../data/mockPatientConsentFullText.js';
import AvailabilityHint from '../../components/common/AvailabilityHint.jsx';
import { useAvailabilityCheck } from '../../hooks/useAvailabilityCheck.js';
import '../auth/AuthForm.css';
import './PatientRegistrationPage.css';
import { Link } from 'react-router-dom';

export default function PatientRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // accountData = { firstName, lastName, email, password, role } มาจาก RegisterPage.jsx
  const { accountData } = location.state || {};

  const [form, setForm] = useState({
    firstName: accountData?.firstName || '',
    lastName: accountData?.lastName || '',
    dob: '',
    gender: '',
    hn: '',
    phone: accountData?.phone || '',
    secondaryContact: '',
    caregiverName: '',
    caregiverRelationship: '',
    caregiverRelationshipOther: '',
    address: '',
    comorbidities: '',
    drugAllergies: '',
    // ฟิลด์ที่ฟอร์มใช้แต่เดิมไม่มีค่าเริ่มต้น (ทำให้ React เตือน uncontrolled → controlled)
    hospital: '',
    emergencyContact: '',
    secondaryContactNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [agreedConsent, setAgreedConsent] = useState(false);
  const [consentError, setConsentError] = useState('');

  const [touched, setTouched] = useState({});
  const hnCheck = useAvailabilityCheck('hn');

  // กฎตรวจแต่ละช่อง — ใช้ทั้งตอนกรอกเสร็จ (blur) และตอนกดถัดไป
  const RULES = {
    firstName: (f) => validators.required(f.firstName, 'ชื่อ'),
    lastName: (f) => validators.required(f.lastName, 'นามสกุล'),
    dob: (f) =>
      validators.required(f.dob, 'วันเดือนปีเกิด') ||
      validators.date(f.dob) ||
      (new Date(f.dob) > new Date() ? 'วันเดือนปีเกิดต้องไม่เป็นวันในอนาคต' : ''),
    gender: (f) => validators.required(f.gender, 'เพศ'),
    hn: (f) => validators.required(f.hn, 'HN'),
    phone: (f) => validators.required(f.phone, 'เบอร์โทรศัพท์') || validators.phone(f.phone.trim()),
    secondaryContactNumber: (f) => (f.secondaryContactNumber ? validators.phone(f.secondaryContactNumber.trim()) : ''),
  };

  // อัปเดตค่า แล้วตรวจซ้ำทันทีถ้าช่องนั้นเคยกรอกเสร็จแล้ว (ข้อความผิดพลาดจะหายเองเมื่อแก้ถูก)
  const handleChange = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (touched[field] && RULES[field]) setErrors((prev) => ({ ...prev, [field]: RULES[field](next) }));
    if (field === 'hn') hnCheck.reset();
  };

  // กรอกช่องนั้นเสร็จ (ออกจากช่อง) → ตรวจและแสดงผลทันที (HN ตรวจว่าซ้ำในระบบด้วย)
  const handleBlur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    const message = RULES[field](form);
    setErrors((prev) => ({ ...prev, [field]: message }));
    if (field === 'hn' && !message) hnCheck.check(form.hn.trim());
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(RULES).forEach((k) => {
      newErrors[k] = RULES[k](form);
    });
    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(RULES).map((k) => [k, true])));
    return Object.values(newErrors).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateAll()) return;
    // HN นี้ถูกลงทะเบียนไปแล้วหรือไม่ (ข้อความแสดงใต้ช่อง HN)
    const hnStatus = await hnCheck.ensure(form.hn.trim());
    if (hnStatus === 'taken') {
      document.getElementById('hn')?.focus();
      return;
    }
    if (!agreedConsent) {
      setConsentError('ท่านต้องยินยอมตามนโยบายก่อนดำเนินการต่อ');
      return;
    }
    if (!accountData?.email || !accountData?.password) {
      setSubmitError('ไม่พบข้อมูลบัญชีผู้ใช้งาน กรุณาเริ่มลงทะเบียนใหม่อีกครั้ง');
      return;
    }
    setConsentError('');
    setIsSubmitting(true);
    try {
      // ยิง register() "ครั้งเดียว" พร้อม profile ครบทุกฟิลด์ตามที่ auth.controller.js ต้องการ
      // -> ป้องกัน "Patient validation failed: phone/gender/dob/hn required" ที่เจอเดิม
      await authService.register({
        email: accountData.email,
        password: accountData.password,
        role: 'patient',
        // ส่งผลการยินยอมไปให้ backend บันทึกลง collection consents + Patient.consentStatus
        consent: { accepted: true, version: patientConsentFullText.version },
        profile: {
          firstName: form.firstName,
          lastName: form.lastName,
          dob: form.dob,
          gender: form.gender,
          hn: form.hn,
          phone: form.phone,
          hospital: form.hospital,
          emergencyContact: form.emergencyContact,
          secondaryContactNumber: form.secondaryContactNumber || null,
          // ชื่อ field ใน Patient.js คือ caregiverRelationship / caregiverRelationshipOther
          // (ไม่ใช่ caregiverName / caregiverOther) — ถ้าส่งผิดชื่อ mongoose จะทิ้งเงียบ ๆ ไม่บันทึก
          caregiverName: form.caregiverName || null,
          caregiverRelationship: form.caregiverRelationship || null,
          caregiverRelationshipOther: form.caregiverRelationshipOther || null,
          address: form.address || null,
          comorbidities: form.comorbidities || null,
          drugAllergies: form.drugAllergies || null,
        },
      });

      await authService.requestOtp(accountData.email, 'REGISTER');

      navigate(ROUTES.REGISTER + '/otp', {
        state: {
          email: accountData.email,
          flow: 'register',
          // registerUser() ไม่คืน token กลับมา (ไม่ auto-login) -> ต้องไปหน้า Login หลัง verify OTP เสมอ
          postVerifyRoute: ROUTES.LOGIN,
        },
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
        <h1 className="auth-title">ข้อมูลผู้ป่วย</h1>
        <p className="auth-subtitle">กรุณากรอกข้อมูลเพื่อสร้างโปรไฟล์ผู้ป่วย</p>

        {submitError && <div className="alert-error" role="alert">{submitError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">ชื่อ</label>
              <input id="firstName" className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                placeholder="ชื่อจริง" value={form.firstName} onChange={handleChange('firstName')} onBlur={handleBlur('firstName')} />
              {errors.firstName && <span className="form-error-message">{errors.firstName}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">นามสกุล</label>
              <input id="lastName" className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                placeholder="นามสกุล" value={form.lastName} onChange={handleChange('lastName')} onBlur={handleBlur('lastName')} />
              {errors.lastName && <span className="form-error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dob" className="form-label">วันเดือนปีเกิด</label>
              <input id="dob" type="date" className={`form-input ${errors.dob ? 'input-error' : ''}`}
                value={form.dob} onChange={handleChange('dob')} onBlur={handleBlur('dob')} />
              {errors.dob && <span className="form-error-message">{errors.dob}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gender">เพศ</label>
              <select id="gender" className={`form-input ${errors.gender ? 'input-error' : ''}`}
                value={form.gender} onChange={handleChange('gender')} onBlur={handleBlur('gender')}>
                <option value="">-- เลือกเพศ --</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </select>
              {errors.gender && <span className="form-error-message">{errors.gender}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hn" className="form-label">HN (Hospital Number)</label>
            <input id="hn" className={`form-input ${errors.hn || hnCheck.status === 'taken' ? 'input-error' : ''}`}
              placeholder="เช่น HN-00123" value={form.hn} onChange={handleChange('hn')} onBlur={handleBlur('hn')} />
            {errors.hn ? (
              <span className="form-error-message">{errors.hn}</span>
            ) : (
              <AvailabilityHint
                check={hnCheck}
                availableText="HN นี้ยังไม่เคยลงทะเบียน"
                takenText="HN นี้ถูกลงทะเบียนในระบบแล้ว หากเป็น HN ของท่านกรุณาเข้าสู่ระบบ หรือติดต่อเจ้าหน้าที่"
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor='hospital' className="form-label">หน่วยบริการต้นสังกัด</label>
            <input id="hospital" className={`form-input ${errors.hospital ? 'input-error' : ''}`}
              placeholder="โรงพยาบาลสงขลานครินทร์" value={form.hospital} onChange={handleChange('hospital')} /> 
            {errors.hospital && <span className="form-error-message">{errors.hospital}</span>}  
             </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">เบอร์โทรศัพท์</label>
              <input id="phone" className={`form-input ${errors.phone ? 'input-error' : ''}`}
                placeholder="กรุณาระบุเบอร์โทรศัพท์ของคุณ" value={form.phone} onChange={handleChange('phone')} onBlur={handleBlur('phone')} />
              {errors.phone && <span className="form-error-message">{errors.phone}</span>}
            </div>

            
        <div className="form-row">
            <div className="form-group">
            <label htmlFor="emergencyContact" className="form-label">ผู้ติดต่อฉุกเฉิน</label>
            <input id="emergencyContact" className="form-input"
              placeholder="กรุณาระบุผู้ติดต่อฉุกเฉินของคุณ" value={form.emergencyContact} onChange={handleChange('emergencyContact')} />
              
            </div>
            <div className="form-group">
            <label htmlFor="secondaryContactNumber" className="form-label">เบอร์โทรศัพท์ผู้ติดต่อฉุกเฉิน</label>
            <input id="secondaryContactNumber" className={`form-input ${errors.secondaryContactNumber ? 'input-error' : ''}`}
              placeholder="กรุณาระบุเบอร์โทรศัพท์ผู้ติดต่อฉุกเฉินของคุณ" value={form.secondaryContactNumber} onChange={handleChange('secondaryContactNumber')} onBlur={handleBlur('secondaryContactNumber')} />
            {errors.secondaryContactNumber && <span className="form-error-message">{errors.secondaryContactNumber}</span>}
            </div>
        </div>

          <div className="form-group">
            <label htmlFor="caregiverName" className="form-label">ชื่อ-นามสกุล ผู้ดูแล(ถ้ามี)</label>
            <input id="caregiverName" className="form-input"
              placeholder="ชื่อ-นามสกุล" value={form.caregiverName} onChange={handleChange('caregiverName')} />
          </div>

          {form.caregiverName && (
            <div className="form-group">
              <label htmlFor="caregiverRelationship" className="form-label">ความสัมพันธ์กับผู้ดูแล</label>
              <select id="caregiverRelationship" className="form-input" value={form.caregiverRelationship} onChange={handleChange('caregiverRelationship')}>
                <option value="">-- เลือกความสัมพันธ์ --</option>
                <option value="father">พ่อ</option>
                <option value="mother">แม่</option>
                <option value="spouse">คู่สมรส</option>
                <option value="daughter">บุตรสาว</option>
                <option value="son">บุตรชาย</option>
                <option value="sibling">พี่น้อง</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </div>
          )}

          {form.caregiverRelationship === 'other' && (
            <div className="form-group">
              <label htmlFor="caregiverRelationshipOther" className="form-label">ระบุความสัมพันธ์</label>
              <input id="caregiverRelationshipOther" className="form-input"
                placeholder="เช่น หลาน, เพื่อน" value={form.caregiverRelationshipOther} onChange={handleChange('caregiverRelationshipOther')} />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="address" className="form-label">ที่อยู่ปัจจุบัน</label>
            <textarea id="address" className="form-input textarea"
              placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด" value={form.address} onChange={handleChange('address')} />
          </div>

          <div className="form-group">
            <label htmlFor="comorbidities" className="form-label">โรคประจำตัวร่วม (ถ้ามี)</label>
            <textarea id="comorbidities" className="form-input textarea"
              placeholder="เช่น ความดันโลหิตสูง, ไขมันในเลือดสูง" value={form.comorbidities} onChange={handleChange('comorbidities')} />
          </div>

          <div className="form-group">
            <label htmlFor="drugAllergies" className="form-label">ประวัติการแพ้ยา (ถ้ามี)</label>
            <textarea id="drugAllergies" className="form-input textarea"
              placeholder="ระบุชื่อยาที่แพ้ หรือ 'ไม่มี'" value={form.drugAllergies} onChange={handleChange('drugAllergies')} />
          </div>
          {consentError && <div className="alert-error" role="alert">{consentError}</div>}

          <label className="consent-checkbox-row">
            <input
              type="checkbox"
              checked={agreedConsent}
              onChange={(e) => { setAgreedConsent(e.target.checked); if (e.target.checked) setConsentError(''); }}
            />
            <span>
              ข้าพเจ้ายินยอมให้จัดเก็บและใช้ข้อมูลสุขภาพ รวมถึงให้พยาบาลเข้าถึงข้อมูลเพื่อการดูแลรักษา
              ตามเงื่อนไขใน{' '}
              <Link to="/patient/consent-policy" target="_blank" className="policy-link-strong">
                [นโยบายความเป็นส่วนตัวและหนังสือแสดงความยินยอม]
              </Link>
            </span>
          </label>

          <button type="submit" className="btn-primary btn-large" disabled={isSubmitting || !agreedConsent}>
            {isSubmitting ? 'กำลังบันทึก...' : 'ถัดไป: ยืนยัน OTP'}
          </button>
        </form>
      </section>
    </main>
  );
}