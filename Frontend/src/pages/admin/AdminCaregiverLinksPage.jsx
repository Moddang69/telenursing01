import React, { useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { caregiverService } from '../../services/caregiverService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import './AdminCaregiverLinksPage.css';

/**
 * AdminCaregiverLinksPage — Admin อนุมัติ/ปฏิเสธคำขอเชื่อมโยงผู้ดูแล <-> ผู้ป่วย
 *
 * เดิมระบบรอให้ "พยาบาลผู้ดูแล Care Team ของผู้ป่วยรายนั้น" เป็นคนกดอนุมัติเท่านั้น
 * (ผ่าน GET /caregivers/patient/:patientId/links ทีละคน) แต่ไม่มีหน้าจอให้ใครกดอนุมัติจริง
 * ทำให้คำขอค้างอยู่ที่ PENDING_VERIFICATION ตลอดไป
 *
 * หน้านี้ให้ Admin เห็นคำขอที่รออนุมัติ "ทั้งหมดในระบบ" ในที่เดียว แล้วกดอนุมัติ/ปฏิเสธได้เลย
 * โดยเรียก endpoint เดิมที่ Backend รองรับ Admin อยู่แล้ว
 * (PATCH /caregivers/links/:linkId/approve และ /revoke — verifyRole(['nurse','admin']))
 */
export default function AdminCaregiverLinksPage() {
  const { showToast } = useNotification();
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = React.useCallback(() => {
    setError(false);
    adminService.getPendingCaregiverLinks().then(setLinks).catch((err) => {
      console.error('AdminCaregiverLinksPage load error:', err);
      setError(true);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message="ไม่สามารถโหลดรายการคำขอเชื่อมโยงได้" onRetry={load} />;
  if (!links) return <LoadingState />;

  const handleApprove = async (link) => {
    setProcessingId(link.id);
    try {
      await caregiverService.approveLink(link.id, link.permissions);
      showToast(`อนุมัติให้ ${link.caregiverName} เชื่อมโยงกับ ${link.patientName} สำเร็จ`, 'success');
      load();
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถอนุมัติคำขอได้', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    setProcessingId(rejectTarget.id);
    try {
      await caregiverService.revokeLink(rejectTarget.id);
      showToast('ปฏิเสธคำขอเรียบร้อยแล้ว', 'success');
      setRejectTarget(null);
      load();
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถปฏิเสธคำขอได้', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-caregiver-links-page">
      <h1>คำขอเชื่อมโยงผู้ดูแลผู้ป่วย</h1>
      <p className="page-subtitle">อนุมัติหรือปฏิเสธคำขอเชื่อมโยงระหว่างผู้ดูแลและผู้ป่วยที่รออยู่</p>

      {links.length === 0 ? (
        <EmptyState icon={Handshake} title="ไม่มีคำขอเชื่อมโยงที่รออนุมัติ" />
      ) : (
        <div className="link-request-list">
          {links.map((l) => (
            <div key={l.id} className="link-request-card">
              <div className="link-request-header">
                <span className="link-request-type-tag">รอการอนุมัติ</span>
                <span className="link-request-date">{l.requestedAt}</span>
              </div>

              <div className="link-request-body">
                <div className="link-request-party">
                  <span className="link-request-label">ผู้ดูแล</span>
                  <strong>{l.caregiverName}</strong>
                  <span>โทร: {l.caregiverPhone}</span>
                </div>
                <div className="link-request-arrow">→</div>
                <div className="link-request-party">
                  <span className="link-request-label">ผู้ป่วย</span>
                  <strong>{l.patientName}</strong>
                  <span>HN: {l.patientHn}</span>
                </div>
              </div>

              <p><strong>ความสัมพันธ์:</strong> {l.relationshipLabel}</p>

              <div className="link-request-actions">
                <button
                  className="btn-primary"
                  disabled={processingId === l.id}
                  onClick={() => handleApprove(l)}
                >
                  {processingId === l.id ? 'กำลังดำเนินการ...' : '✓ อนุมัติ'}
                </button>
                <button
                  className="btn-danger-outline"
                  disabled={processingId === l.id}
                  onClick={() => setRejectTarget(l)}
                >
                  ✕ ปฏิเสธ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setRejectTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>ปฏิเสธคำขอเชื่อมโยง</h2>
            <p>
              ผู้ดูแล <strong>{rejectTarget.caregiverName}</strong> ขอเชื่อมโยงกับผู้ป่วย{' '}
              <strong>{rejectTarget.patientName}</strong>
            </p>
            <p className="reject-confirm-note">คำขอนี้จะถูกปฏิเสธและผู้ดูแลจะไม่สามารถเข้าถึงข้อมูลผู้ป่วยรายนี้ได้</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setRejectTarget(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleReject} disabled={processingId === rejectTarget.id}>
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}