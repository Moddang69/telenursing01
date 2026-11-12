import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

import { validators } from '../../utils/validators.js';
import { ROUTES } from '../../constants/routes.js';
import { authService } from '../../services/authService.js';
import { CONFIDENTIALITY_VERSION } from '../../data/mockConfidentialityContent.js';

import '../auth/AuthForm.css';

export default function NurseRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // ข้อมูลบัญชีที่ส่งมาจาก RegisterPage
  // เช่น email และ password
  const { accountData } = location.state || {};

  const [form, setForm] = useState({
    firstName:accountData?.firstName || '',
    lastName:accountData?.lastName || '',
    phone:accountData?.phone || '',
    licenseNumber: '',
    position: '',
    expertise: '',
    hospital: '',
    department: '',
    ward: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ยืนยันการยอมรับนโยบายรักษาความลับ
  const [agreedConfidentiality, setAgreedConfidentiality] = useState(false);
  const [confidentialityError, setConfidentialityError] = useState('');

  // Error จาก Backend
  const [submitError, setSubmitError] = useState('');

  const handleChange = (field) => (e) => {
    setForm((f) => ({
      ...f,
      [field]: e.target.value,
    }));

    // ล้าง error ของ field นั้นเมื่อผู้ใช้แก้ไข
    setErrors((prev) => ({
      ...prev,
      [field]: '',
    }));

    setSubmitError('');
  };

  const validateAll = () => {
    const newErrors = {
      firstName: validators.required(form.firstName, 'ชื่อ'),

      lastName: validators.required(form.lastName, 'นามสกุล'),

      phone:
        validators.required(form.phone, 'เบอร์โทรศัพท์') ||
        validators.phone(form.phone),

      licenseNumber: validators.required(
        form.licenseNumber,
        'เลขที่ใบอนุญาตประกอบวิชาชีพ'
      ),

      hospital: validators.required(
        form.hospital,
        'โรงพยาบาล/สถานพยาบาล'
      ),
    };

    setErrors(newErrors);

    return Object.values(newErrors).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitError('');
    setConfidentialityError('');

    // ----------------------------------------
    // 1. ตรวจสอบว่ามีข้อมูลบัญชีจาก RegisterPage
    // ----------------------------------------
    if (!accountData?.email || !accountData?.password) {
      setSubmitError(
        'ไม่พบข้อมูลบัญชี กรุณากลับไปหน้าสมัครสมาชิกและดำเนินการใหม่'
      );
      return;
    }

    // ----------------------------------------
    // 2. ตรวจสอบข้อมูลในฟอร์ม
    // ----------------------------------------
    if (!validateAll()) {
      return;
    }

    // ----------------------------------------
    // 3. ตรวจสอบการยอมรับนโยบาย
    // ----------------------------------------
    if (!agreedConfidentiality) {
      setConfidentialityError(
        'ท่านต้องยอมรับนโยบายการรักษาความลับข้อมูลผู้ป่วยก่อนดำเนินการต่อ'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // ----------------------------------------
      // 4. สร้างบัญชี Nurse ใน Backend
      //    Backend จะบันทึก User + Nurse ลง MongoDB
      // ----------------------------------------
      await authService.register({
        email: accountData.email,
        password: accountData.password,
        role: 'nurse',

        // ส่งผลการยอมรับนโยบายไปให้ backend บันทึกลง collection consents
        consent: { accepted: true, version: CONFIDENTIALITY_VERSION },

        profile: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,

          licenseNumber: form.licenseNumber,
          position: form.position,
          expertise: form.expertise,

          hospital: form.hospital,
          department: form.department,
          ward: form.ward,
        },
      });

      // ----------------------------------------
      // 5. ขอ OTP สำหรับยืนยัน Email
      // ----------------------------------------
      await authService.requestOtp(
        accountData.email,
        'REGISTER'
      );

      // ----------------------------------------
      // 6. ไปหน้า OTP
      // ----------------------------------------
      navigate(`${ROUTES.REGISTER}/otp`, {
        state: {
          email: accountData.email,
          flow: 'register',

          // หลัง Verify OTP ให้กลับไป Login
          postVerifyRoute: ROUTES.LOGIN,
        },
      });
    } catch (error) {
      console.error('Nurse registration error:', error);

      // พยายามอ่านข้อความ error จาก Backend
      const message =
        error?.message ||
        error?.response?.data?.message ||
        'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง';

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">

        <h1 className="auth-title">
          ข้อมูลพยาบาล
        </h1>

        {/* Error จาก Backend */}
        {submitError && (
          <div
            className="alert-error"
            role="alert"
            style={{ marginBottom: '16px' }}
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* ==================================================
              ข้อมูลส่วนตัว
          ================================================== */}

          <h2 className="section-subheading">
            ข้อมูลส่วนตัว
          </h2>

          <div className="form-row">

            <div className="form-group">
              <label
                htmlFor="firstName"
                className="form-label"
              >
                ชื่อ
              </label>

              <input
                id="firstName"
                className={`form-input ${
                  errors.firstName ? 'input-error' : ''
                }`}
                value={form.firstName}
                onChange={handleChange('firstName')}
              />

              {errors.firstName && (
                <span className="form-error-message">
                  {errors.firstName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label
                htmlFor="lastName"
                className="form-label"
              >
                นามสกุล
              </label>

              <input
                id="lastName"
                className={`form-input ${
                  errors.lastName ? 'input-error' : ''
                }`}
                value={form.lastName}
                onChange={handleChange('lastName')}
              />

              {errors.lastName && (
                <span className="form-error-message">
                  {errors.lastName}
                </span>
              )}
            </div>

          </div>

          <div className="form-group">

            <label
              htmlFor="phone"
              className="form-label"
            >
              เบอร์โทรศัพท์
            </label>

            <input
              id="phone"
              className={`form-input ${
                errors.phone ? 'input-error' : ''
              }`}
              placeholder="0812345678"
              value={form.phone}
              onChange={handleChange('phone')}
            />

            {errors.phone && (
              <span className="form-error-message">
                {errors.phone}
              </span>
            )}

          </div>


          {/* ==================================================
              ข้อมูลวิชาชีพ
          ================================================== */}

          <h2 className="section-subheading">
            ข้อมูลวิชาชีพ
          </h2>

          <div className="form-group">

            <label
              htmlFor="licenseNumber"
              className="form-label"
            >
              เลขที่ใบอนุญาตประกอบวิชาชีพการพยาบาล
            </label>

            <input
              id="licenseNumber"
              className={`form-input ${
                errors.licenseNumber ? 'input-error' : ''
              }`}
              placeholder="เช่น NUR-00001"
              value={form.licenseNumber}
              onChange={handleChange('licenseNumber')}
            />

            {errors.licenseNumber && (
              <span className="form-error-message">
                {errors.licenseNumber}
              </span>
            )}

          </div>


          <div className="form-row">

            <div className="form-group">

              <label
                htmlFor="position"
                className="form-label"
              >
                ตำแหน่ง
              </label>

              <input
                id="position"
                className="form-input"
                placeholder="เช่น พยาบาลวิชาชีพ"
                value={form.position}
                onChange={handleChange('position')}
              />

            </div>


            <div className="form-group">

              <label
                htmlFor="expertise"
                className="form-label"
              >
                ความเชี่ยวชาญ
              </label>

              <input
                id="expertise"
                className="form-input"
                placeholder="เช่น การพยาบาลผู้ป่วยเบาหวาน"
                value={form.expertise}
                onChange={handleChange('expertise')}
              />

            </div>

          </div>


          {/* ==================================================
              ข้อมูลหน่วยงาน
          ================================================== */}

          <h2 className="section-subheading">
            ข้อมูลหน่วยงาน
          </h2>

          <div className="form-group">

            <label
              htmlFor="hospital"
              className="form-label"
            >
              โรงพยาบาล/สถานพยาบาล
            </label>

            <input
              id="hospital"
              className={`form-input ${
                errors.hospital ? 'input-error' : ''
              }`}
              value={form.hospital}
              onChange={handleChange('hospital')}
            />

            {errors.hospital && (
              <span className="form-error-message">
                {errors.hospital}
              </span>
            )}

          </div>


          <div className="form-row">

            <div className="form-group">

              <label
                htmlFor="department"
                className="form-label"
              >
                แผนก
              </label>

              <input
                id="department"
                className="form-input"
                value={form.department}
                onChange={handleChange('department')}
              />

            </div>


            <div className="form-group">

              <label
                htmlFor="ward"
                className="form-label"
              >
                หอผู้ป่วย (Ward)
              </label>

              <input
                id="ward"
                className="form-input"
                value={form.ward}
                onChange={handleChange('ward')}
              />

            </div>

          </div>


          {/* ==================================================
              นโยบายการรักษาความลับ
          ================================================== */}

          {confidentialityError && (
            <div
              className="alert-error"
              role="alert"
            >
              {confidentialityError}
            </div>
          )}


          <label className="consent-checkbox-row">

            <input
              type="checkbox"
              checked={agreedConfidentiality}
              onChange={(e) => {
                const checked = e.target.checked;

                setAgreedConfidentiality(checked);

                if (checked) {
                  setConfidentialityError('');
                }
              }}
            />

            <span>
              ข้าพเจ้ารับทราบและตกลงจะปฏิบัติตาม{' '}

              <Link
                to="/nurse/confidentiality-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="policy-link-strong"
              >
                [นโยบายการรักษาความลับข้อมูลผู้ป่วย]
              </Link>

              {' '}

              โดยจะเข้าถึงและประมวลผลข้อมูลสุขภาพของผู้ป่วย
              เฉพาะเพื่อประโยชน์ในการรักษาพยาบาลตามหน้าที่เท่านั้น
              และจะไม่เปิดเผย คัดลอก หรือส่งต่อข้อมูลสุขภาพ
              แก่บุคคลภายนอกโดยมิชอบด้วยกฎหมาย
            </span>

          </label>


          {/* ==================================================
              Submit
          ================================================== */}

          <button
            type="submit"
            className="btn-primary btn-large"
            disabled={isSubmitting || !agreedConfidentiality}
          >
            {isSubmitting
              ? 'กำลังสร้างบัญชี...'
              : 'บันทึกข้อมูลและยืนยันอีเมล'}
          </button>

        </form>

      </section>
    </main>
  );
}