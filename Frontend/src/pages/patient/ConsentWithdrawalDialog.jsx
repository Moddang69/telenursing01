import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { withdrawConsentImpacts } from '../../data/mockConsentContent.js';
import { consentService } from '../../services/consentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CONSENT_STATUS } from '../../constants/statuses.js';
import './ConsentPage.css';

export default function ConsentWithdrawalDialog({ onClose, onWithdrawn }) {
  const { user, updateUser } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await consentService.withdrawConsent({ userId: user.id, reason });
      // อัปเดตเฉพาะ consentStatus ให้ตรงกับ backend (backend ไม่ได้ล้าง profile/assignment)
      // เดิมตั้ง hasProfile=false แค่ฝั่ง UI → redirect ไปหน้าสมัครที่ไม่มี accountData และพอ refresh ค่าก็กลับมาไม่ตรงกัน
      updateUser({ consentStatus: CONSENT_STATUS.CONSENT_WITHDRAWN });
      if (onWithdrawn) {
        onWithdrawn();
      } else {
        onClose();
      }
    } catch (err) {
      // เดิมไม่มี catch → ถ้า backend ปฏิเสธ ปุ่มกดแล้วเงียบ ไม่มีอะไรเกิดขึ้น
      setError(err?.message || 'ไม่สามารถถอนความยินยอมได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
      <div className="modal-content">
        <h2 id="withdraw-title">ยืนยันการถอนความยินยอม</h2>
        <p>การถอนความยินยอมจะส่งผลดังนี้:</p>
        <ul>
          {withdrawConsentImpacts.map((impact, i) => (
            <li key={i}>{impact}</li>
          ))}
        </ul>
        <p style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
          <AlertTriangle size={16} className="inline-icon" /> หลังถอนความยินยอม ท่านจะไม่สามารถบันทึกข้อมูลใหม่ได้ และต้องยินยอมใหม่อีกครั้งหากต้องการใช้งานระบบต่อ
        </p>
        <label className="form-label" htmlFor="withdraw-reason">เหตุผล (ไม่บังคับ)</label>
        <textarea
          id="withdraw-reason"
          className="form-input textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <div className="alert-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button className="btn-danger" onClick={handleWithdraw} disabled={isSubmitting}>
            {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันถอนความยินยอม'}
          </button>
        </div>
      </div>
    </div>
  );
}