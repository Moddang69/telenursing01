import React, { useEffect, useState } from 'react';
import { FileText, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { dataDeletionCategories } from '../../data/mockDataDeletionCategories.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './AdminDataRequestsPage.css';

const typeLabel = { DATA_DELETION: 'ขอลบข้อมูล', CONSENT_WITHDRAWAL: 'ถอนความยินยอม' };
const categoryLabelMap = Object.fromEntries(dataDeletionCategories.map((c) => [c.key, c.label]));

export default function AdminDataRequestsPage() {
  const [requests, setRequests] = useState(null);
  const [nurseChangeRequests, setNurseChangeRequests] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null); // { type: 'nurseChange'|'deletion', item }
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    adminService.getDataRequests().then(setRequests);
    adminService.getNurseChangeRequests().then(setNurseChangeRequests);
    adminService.getPatientDataDeletionRequests().then(setDeletionRequests);
  };
  useEffect(() => { load(); }, []);

  if (!requests || !nurseChangeRequests || !deletionRequests) return <LoadingState />;

  const handleProcess = async (id, action) => {
    await adminService.processDataRequest(id, action);
    load();
  };

  const handleApproveNurseChange = async (id) => {
    await adminService.approveNurseChangeRequest(id);
    load();
  };

  const handleApproveDeletion = async (id) => {
    await adminService.approvePatientDataDeletion(id);
    load();
  };

  const handleReject = async () => {
    if (rejectTarget.type === 'nurseChange') {
      await adminService.rejectNurseChangeRequest(rejectTarget.item.id, rejectReason);
    } else if (rejectTarget.type === 'deletion') {
      await adminService.rejectPatientDataDeletion(rejectTarget.item.id, rejectReason);
    }
    setRejectTarget(null);
    setRejectReason('');
    load();
  };

  const pendingNurseChangeRequests = nurseChangeRequests.filter((r) => r.status === 'PENDING');
  const pendingDeletionRequests = deletionRequests.filter((r) => r.status === 'REQUESTED');
  const processedDeletionRequests = deletionRequests.filter((r) => r.status !== 'REQUESTED');

  return (
    <div className="admin-data-requests-page">
      <h1>คำขอเกี่ยวกับข้อมูลส่วนบุคคล</h1>
      {requests.length === 0 ? (
        <EmptyState icon={FileText} title="ยังไม่มีคำขอ" />
      ) : (
        <div className="request-list">
          {requests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="request-header">
                <span className="request-type-tag">{typeLabel[r.type]}</span>
                <span className="request-status">{r.status}</span>
              </div>
              <p><strong>ผู้ป่วย:</strong> {r.patientName} ({r.patientHn})</p>
              <p><strong>วันที่ยื่นคำขอ:</strong> {r.requestedAt}</p>
              {r.reason && <p><strong>เหตุผล:</strong> {r.reason}</p>}
              {r.status === 'REQUESTED' || r.status === 'UNDER_REVIEW' ? (
                <div className="request-actions">
                  <button className="btn-primary" onClick={() => handleProcess(r.id, 'approve')}>อนุมัติดำเนินการ</button>
                  <button className="btn-danger-outline" onClick={() => handleProcess(r.id, 'reject')}>ปฏิเสธคำขอ</button>
                </div>
              ) : (
                <p className="request-processed-note"><CheckCircle size={14} className="inline-icon" /> ดำเนินการแล้ว</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============ คำขอลบข้อมูลแบบระบุหมวด (จากหน้า Profile ผู้ป่วย) ============ */}
      <h1 style={{ marginTop: 40 }}>คำขอลบข้อมูลเฉพาะส่วน (จากผู้ป่วย)</h1>
      {pendingDeletionRequests.length === 0 ? (
        <EmptyState icon={Trash2} title="ยังไม่มีคำขอลบข้อมูลที่รออนุมัติ" />
      ) : (
        <div className="request-list">
          {pendingDeletionRequests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="request-header">
                <span className="request-type-tag">ขอลบข้อมูลเฉพาะส่วน</span>
                <span className="request-status">{r.status}</span>
              </div>
              <p><strong>ผู้ป่วย:</strong> {r.patientName} ({r.patientHn})</p>
              <p><strong>วันที่ยื่นคำขอ:</strong> {r.requestedAt}</p>
              <p><strong>หมวดข้อมูลที่ขอลบ:</strong></p>
              <ul className="category-list">
                {r.categories.map((catKey) => (
                  <li key={catKey}>• {categoryLabelMap[catKey] || catKey}</li>
                ))}
              </ul>
              {r.reason && <p><strong>เหตุผล:</strong> {r.reason}</p>}
              <div className="request-actions">
                <button className="btn-primary" onClick={() => handleApproveDeletion(r.id)}>อนุมัติการลบข้อมูล</button>
                <button className="btn-danger-outline" onClick={() => setRejectTarget({ type: 'deletion', item: r })}>ปฏิเสธคำขอ</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {processedDeletionRequests.length > 0 && (
        <>
          <h2 className="section-subheading" style={{ marginTop: 24 }}>ประวัติคำขอลบข้อมูลที่ดำเนินการแล้ว</h2>
          <div className="request-list">
            {processedDeletionRequests.map((r) => (
              <div key={r.id} className="request-card">
                <div className="request-header">
                  <span className="request-type-tag">ขอลบข้อมูลเฉพาะส่วน</span>
                  <span className="request-status">{r.status}</span>
                </div>
                <p><strong>ผู้ป่วย:</strong> {r.patientName}</p>
                <p><strong>หมวดที่ขอ:</strong> {r.categories.map((c) => categoryLabelMap[c] || c).join(', ')}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============ คำขอเปลี่ยนพยาบาล (คงเดิมจากรอบก่อนหน้า) ============ */}
      <h1 style={{ marginTop: 40 }}>คำขอเปลี่ยนพยาบาลผู้ดูแล (จากผู้ป่วย)</h1>
      {pendingNurseChangeRequests.length === 0 ? (
        <EmptyState icon={RefreshCw} title="ยังไม่มีคำขอเปลี่ยนพยาบาลที่รออนุมัติ" />
      ) : (
        <div className="request-list">
          {pendingNurseChangeRequests.map((r) => (
            <div key={r.id} className="request-card">
              <div className="request-header">
                <span className="request-type-tag">ขอเปลี่ยนพยาบาล</span>
                <span className="request-status">{r.status}</span>
              </div>
              <p><strong>ผู้ป่วย:</strong> {r.patientName} ({r.patientHn})</p>
              <p><strong>พยาบาลปัจจุบัน:</strong> {r.currentNurseName}</p>
              <p><strong>ต้องการเปลี่ยนเป็น:</strong> {r.requestedNurseName}</p>
              <p><strong>วันที่ยื่นคำขอ:</strong> {r.requestedAt}</p>
              {r.reason && <p><strong>เหตุผล:</strong> {r.reason}</p>}
              <div className="request-actions">
                <button className="btn-primary" onClick={() => handleApproveNurseChange(r.id)}>อนุมัติเปลี่ยนพยาบาล</button>
                <button className="btn-danger-outline" onClick={() => setRejectTarget({ type: 'nurseChange', item: r })}>ปฏิเสธคำขอ</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>ปฏิเสธคำขอ</h2>
            <p>ผู้ป่วย: <strong>{rejectTarget.item.patientName}</strong></p>
            <label className="form-label" htmlFor="reject-reason">เหตุผล</label>
            <textarea id="reject-reason" className="form-input textarea" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setRejectTarget(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleReject}>ยืนยันปฏิเสธ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}