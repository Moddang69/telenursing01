import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Accordion from '../../components/common/Accordion.jsx';
import { patientConsentFullText } from '../../data/mockPatientConsentFullText.js';
import ConsentWithdrawalDialog from './ConsentWithdrawalDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { CONSENT_STATUS } from '../../constants/statuses.js';
import { ROUTES } from '../../constants/routes.js';
import '../auth/AuthForm.css';
import './ConsentPage.css';

/**
 * @param {boolean} showWithdrawOption - แสดงปุ่ม "ขอถอนความยินยอม" หรือไม่
 * - false: ใช้ตอนเปิดอ่านจากหน้าลงทะเบียน (ยังไม่ได้ใช้งานระบบจริง ไม่ควรถอนได้จากจุดนี้)
 * - true: ใช้ตอนเปิดจากหน้า Profile (ผู้ป่วยใช้งานระบบแล้ว)
 */
export default function PatientConsentDetailPage({ showWithdrawOption = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);

  const accordionItems = patientConsentFullText.sections.map((s) => ({
    title: s.title,
    content: <p>{s.content}</p>,
  }));

  const handleWithdrawSuccess = () => {
    setShowWithdraw(false);
    navigate(ROUTES.PATIENT_CONSENT, { replace: true });
  };

  return (
    <div className="consent-detail-page">
      <h1>{patientConsentFullText.title}</h1>
      <p className="consent-intro">{patientConsentFullText.intro}</p>

      <Accordion items={accordionItems} />

      {showWithdrawOption && (
        <>
          <p className="consent-status-note">
            สถานะความยินยอมปัจจุบันของท่าน: <strong>{user?.consentStatus}</strong>
            {' '}(เวอร์ชันนโยบาย: {patientConsentFullText.version})
          </p>

          {user?.consentStatus !== CONSENT_STATUS.CONSENT_WITHDRAWN && (
            <button className="btn-danger-outline btn-full" onClick={() => setShowWithdraw(true)}>
              ขอถอนความยินยอม
            </button>
          )}

          {showWithdraw && (
            <ConsentWithdrawalDialog
              onClose={() => setShowWithdraw(false)}
              onWithdrawn={handleWithdrawSuccess}
            />
          )}
        </>
      )}
    </div>
  );
}