import React from 'react';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import './AvailabilityHint.css';

/**
 * AvailabilityHint — ข้อความใต้ช่องกรอก แสดงผลตรวจค่าซ้ำจาก useAvailabilityCheck
 * @param check  ค่าที่ได้จาก useAvailabilityCheck
 */
export default function AvailabilityHint({
  check,
  availableText,
  takenText,
  unverifiedText,
  takenAction = null,
  unverifiedAction = null,
}) {
  if (check.status === 'checking') {
    return <span className="field-hint" role="status"><Clock size={14} className="inline-icon" /> กำลังตรวจสอบ...</span>;
  }
  if (check.status === 'available') {
    return <span className="field-hint ok" role="status"><CheckCircle size={14} className="inline-icon" /> {availableText}</span>;
  }
  if (check.status === 'taken') {
    const unverified = check.verified === false && unverifiedText;
    return (
      <span className="form-error-message" role="alert">
        <AlertTriangle size={14} className="inline-icon" /> {unverified ? unverifiedText : takenText} {unverified ? unverifiedAction : takenAction}
      </span>
    );
  }
  return null;
}
