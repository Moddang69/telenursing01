import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { nurseService } from '../../services/nurseService.js';
import './CaseClosureModal.css';

const CLOSURE_REASONS = [
  { value: 'disease_remission', label: 'ผู้ป่วยเข้าสู่ระยะสงบของโรค' },
  { value: 'lost_contact', label: 'ขาดการติดต่อ' },
  { value: 'patient_deceased', label: 'ผู้ป่วยเสียชีวิต' },
  { value: 'transferred', label: 'ส่งต่อสถานพยาบาลอื่น' },
  { value: 'patient_request', label: 'ผู้ป่วยขอออกจากระบบ' },
  { value: 'other', label: 'อื่นๆ' },
];

/**
 * CaseClosureModal - Modal สำหรับพยาบาลปิดเคสผู้ป่วย
 * @param {boolean} isOpen - สถานะการเปิด/ปิด Modal
 * @param {function} onClose - ฟังก์ชันสำหรับปิด Modal
 * @param {string} patientId - ID ของผู้ป่วย
 * @param {function} onSuccess - ฟังก์ชันเรียกหลังปิดเคสสำเร็จ
 */
export default function CaseClosureModal({ isOpen, onClose, patientId, onSuccess }) {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      setError('กรุณาเลือกเหตุผล');
      return;
    }

    if (reason === 'other' && !otherReason.trim()) {
      setError('กรุณาระบุเหตุผล');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await nurseService.closeCase({
        patientId,
        closureReason: reason,
        otherReason: reason === 'other' ? otherReason : undefined,
      });

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'ไม่สามารถปิดเคสได้');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setOtherReason('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container case-closure-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <AlertCircle size={24} />
            ปิดเคสผู้ป่วย
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="warning-box">
              <AlertCircle size={20} />
              <p>การปิดเคสจะไม่สามารถย้อนกลับได้ กรุณาตรวจสอบข้อมูลก่อนยืนยัน</p>
            </div>

            <div className="form-group">
              <label className="form-label">
                เหตุผลที่ปิดเคส <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
              >
                <option value="">-- เลือกเหตุผล --</option>
                {CLOSURE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {reason === 'other' && (
              <div className="form-group">
                <label className="form-label">
                  ระบุเหตุผล <span className="required">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="กรุณาระบุเหตุผล..."
                  maxLength={500}
                  rows={3}
                  disabled={loading}
                />
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-danger" disabled={loading}>
              {loading ? 'กำลังปิดเคส...' : 'ยืนยันปิดเคส'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
