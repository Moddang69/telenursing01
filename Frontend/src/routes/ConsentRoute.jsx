import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CONSENT_STATUS } from '../constants/statuses.js';
import { ROUTES } from '../constants/routes.js';

export default function ConsentRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  if (!user.hasProfile) return <Navigate to={ROUTES.PATIENT_REGISTRATION} replace />;
  // ถอนความยินยอมแล้ว → ต้องกลับไปยินยอมใหม่ที่หน้า Consent ก่อนใช้งานต่อ
  // (เดิม redirect ไปหน้าเลือกพยาบาล ซึ่งไม่ได้แก้สถานะ consent ทำให้ผู้ป่วยติดสถานะถอนค้างตลอด)
  if (user.consentStatus === CONSENT_STATUS.CONSENT_WITHDRAWN) {
    return <Navigate to={ROUTES.PATIENT_CONSENT} replace />;
  }
  if (!user.hasAssignment) return <Navigate to={ROUTES.PATIENT_SELECT_NURSE} replace />;

  return children;
}