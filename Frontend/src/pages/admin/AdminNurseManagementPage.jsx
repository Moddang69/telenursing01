import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
import { NURSE_APPROVAL_STATUS } from '../../constants/statuses.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import './AdminNurseManagementPage.css';

const statusFilters = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: NURSE_APPROVAL_STATUS.PENDING_APPROVAL, label: 'รออนุมัติ' },
  { key: NURSE_APPROVAL_STATUS.APPROVED, label: 'อนุมัติแล้ว' },
  { key: NURSE_APPROVAL_STATUS.REJECTED, label: 'ถูกปฏิเสธ' },
  { key: NURSE_APPROVAL_STATUS.SUSPENDED, label: 'ถูกระงับ' },
];

export default function AdminNurseManagementPage() {
  const [nurses, setNurses] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [confirmAction, setConfirmAction] = useState(null); // { nurse, action }
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    adminService.getNurses()
      .then(setNurses)
      .catch((err) => {
        console.error('AdminNurseManagementPage load error:', err);
        setError(true);
      });
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message="ไม่สามารถโหลดรายชื่อพยาบาลได้" onRetry={load} />;
  if (!nurses) return <LoadingState />;

  const filtered = filter === 'ALL' ? nurses : nurses.filter((n) => n.approvalStatus === filter);

  const runAction = async () => {
    const { nurse, action } = confirmAction;
    try {
      if (action === 'approve') await adminService.approveNurse(nurse.id);
      if (action === 'reject') await adminService.rejectNurse(nurse.id, reason);
      if (action === 'suspend') await adminService.suspendNurse(nurse.id, reason);
      if (action === 'reactivate') await adminService.reactivateNurse(nurse.id);
      setConfirmAction(null);
      setReason('');
      load();
    } catch (err) {
      console.error('Admin action failed:', err);
      alert(`การดำเนินการล้มเหลว: ${err.message}`);
    }
  };

  return (
    <div className="admin-nurse-page">
      <h1>จัดการพยาบาล</h1>
      <div className="filter-tabs">
        {statusFilters.map((f) => (
          <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>ชื่อ</th><th>เลขที่ใบอนุญาต</th><th>โรงพยาบาล</th><th>สถานะ</th><th>การจัดการ</th></tr>
        </thead>
        <tbody>
          {filtered.map((n) => (
            <tr key={n.id}>
              <td>{n.name}</td>
              <td>{n.licenseNumber}</td>
              <td>{n.hospital}</td>
              <td><span className={`status-pill status-${n.approvalStatus.toLowerCase()}`}>{n.approvalStatus}</span></td>
              <td className="action-cell">
                {n.approvalStatus === NURSE_APPROVAL_STATUS.PENDING_APPROVAL && (
                  <>
                    <button className="btn-primary" onClick={() => setConfirmAction({ nurse: n, action: 'approve' })}>อนุมัติ</button>
                    <button className="btn-danger-outline" onClick={() => setConfirmAction({ nurse: n, action: 'reject' })}>ปฏิเสธ</button>
                  </>
                )}
                {n.approvalStatus === NURSE_APPROVAL_STATUS.APPROVED && (
                  <button className="btn-danger-outline" onClick={() => setConfirmAction({ nurse: n, action: 'suspend' })}>ระงับการใช้งาน</button>
                )}
                {n.approvalStatus === NURSE_APPROVAL_STATUS.SUSPENDED && (
                  <button className="btn-primary" onClick={() => setConfirmAction({ nurse: n, action: 'reactivate' })}>เปิดใช้งานอีกครั้ง</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirmAction && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>ยืนยันการดำเนินการ</h2>
            <p>
              คุณต้องการ <strong>{confirmAction.action}</strong> พยาบาล <strong>{confirmAction.nurse.name}</strong> ใช่หรือไม่?
            </p>
            {(confirmAction.action === 'reject' || confirmAction.action === 'suspend') && (
              <>
                <label className="form-label" htmlFor="reason">เหตุผล</label>
                <textarea id="reason" className="form-input textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
              </>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmAction(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={runAction}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}