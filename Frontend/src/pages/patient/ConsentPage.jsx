import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Accordion from '../../components/common/Accordion.jsx';
import { consentSections, CONSENT_VERSION, withdrawConsentImpacts } from '../../data/mockConsentContent.js';
import { consentService } from '../../services/consentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CONSENT_STATUS } from '../../constants/statuses.js';
import { ROUTES } from '../../constants/routes.js';
import './ConsentPage.css';

export default function ConsentPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ยินยอมอยู่แล้ว ไม่ต้องเข้าหน้านี้ (ป้องกันการเข้า URL ตรง)
  if (user?.consentStatus === CONSENT_STATUS.GIVEN) {
    return <Navigate to={user.hasAssignment ? ROUTES.PATIENT_HOME : ROUTES.PATIENT_SELECT_NURSE} replace />;
  }

  const handleContinue = async () => {
    if (!agreed) {
      setError('กรุณายอมรับข้อตกลงก่อนดำเนินการต่อ');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await consentService.giveConsent({ type: 'PATIENT_DATA_CONSENT', version: CONSENT_VERSION });
      updateUser({ consentStatus: CONSENT_STATUS.GIVEN });
      // เคยเลือกพยาบาลไว้แล้ว (กรณียินยอมใหม่หลังถอน) → กลับหน้าหลัก, ถ้ายังไม่เคย → ไปเลือกพยาบาล
      navigate(user?.hasAssignment ? ROUTES.PATIENT_HOME : ROUTES.PATIENT_SELECT_NURSE, { replace: true });
    } catch (err) {
      setError(err?.message || 'ไม่สามารถบันทึกความยินยอมได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const accordionItems = consentSections.map((s) => ({ title: s.title, content: <p>{s.content}</p> }));

  return (
    <main className="consent-page">
      <section className="consent-card">
        <h1 className="auth-title">นโยบายความเป็นส่วนตัวและความยินยอม</h1>
        <p className="auth-subtitle">
          ระบบนี้เป็น <strong>ต้นแบบเพื่อการวิจัย (Research Prototype)</strong> ไม่ใช่ระบบวินิจฉัยโรค
          และยังไม่ได้รับการรับรองมาตรฐานใดๆ กรุณาอ่านรายละเอียดก่อนดำเนินการต่อ
        </p>

        <Accordion items={accordionItems} />

        {error && <div className="alert-error" role="alert" style={{ marginTop: 16 }}>{error}</div>}

        <label className="consent-checkbox-row">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setError('');
            }}
          />
          <span>
            ข้าพเจ้าได้อ่านและเข้าใจนโยบายความเป็นส่วนตัวข้างต้น และยินยอมให้จัดเก็บ/ใช้ข้อมูลของข้าพเจ้า
            เพื่อวัตถุประสงค์ของโครงการวิจัยนี้ (เวอร์ชันนโยบาย: {CONSENT_VERSION})
          </span>
        </label>

        <button className="btn-primary btn-large" onClick={handleContinue} disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก...' : 'ยินยอมและดำเนินการต่อ'}
        </button>

        <details className="withdraw-info">
          <summary>ผลกระทบหากไม่ยินยอมหรือถอนความยินยอมในอนาคต</summary>
          <ul>
            {withdrawConsentImpacts.map((impact, i) => (
              <li key={i}>{impact}</li>
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}