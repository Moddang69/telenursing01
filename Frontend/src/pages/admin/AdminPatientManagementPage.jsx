import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
import { getCareTeamHistory } from '../../services/patientService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import './AdminPatientManagementPage.css';

export default function AdminPatientManagementPage() {
  const [patients, setPatients] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [query, setQuery] = useState('');
  const [reassignTarget, setReassignTarget] = useState(null);
  const [newNurseId, setNewNurseId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [historyView, setHistoryView] = useState(null);
  const [historyList, setHistoryList] = useState(null);

  const load = (q = '') => adminService.searchPatients(q).then(setPatients);
  useEffect(() => {
    load();
    adminService.getNurses().then(setNurses);
  }, []);

  if (!patients) return <LoadingState />;

  const handleSearch = (e) => {
    e.preventDefault();
    load(query);
  };

  const handleReassign = async () => {
    setError('');
    const nurse = nurses.find((n) => n.id === newNurseId);
    if (!nurse) { setError('กรุณาเลือกพยาบาล'); return; }
    try {
      await adminService.reassignNurse({
        patientId: reassignTarget.id,
        newNurseId: nurse.id,
        reason,
      });
      setReassignTarget(null);
      setReason('');
      setNewNurseId('');
      load(query);
    } catch (err) {
      setError(err.message);
    }
  };

  const openHistory = async (p) => {
    setHistoryView(p);
    setHistoryList(null);
    const history = await getCareTeamHistory(p.id);
    setHistoryList(history || []);
  };

  return (
    <div className="admin-patient-page">
      <h1>จัดการผู้ป่วย</h1>
      <form className="search-row" onSubmit={handleSearch}>
        <input className="form-input" placeholder="ค้นหาด้วยชื่อหรือ HN" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className="btn-primary">ค้นหา</button>
      </form>

      <table className="admin-table">
        <thead>
          <tr><th>ชื่อผู้ป่วย</th><th>HN</th><th>พยาบาลที่ดูแล</th><th>การจัดการ</th></tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.hn}</td>
              <td>{p.assignedNurseName || '-'}</td>
              <td className="action-cell">
                <button className="btn-secondary" onClick={() => openHistory(p)}>ดูประวัติ</button>
                <button className="btn-primary" onClick={() => setReassignTarget(p)}>เปลี่ยนพยาบาล</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {reassignTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>เปลี่ยนพยาบาลผู้ดูแล</h2>
            <p>ผู้ป่วย: <strong>{reassignTarget.name}</strong> (HN: {reassignTarget.hn})</p>
            {error && <div className="alert-error" role="alert">{error}</div>}
            <label className="form-label" htmlFor="new-nurse">เลือกพยาบาลใหม่</label>
            <select id="new-nurse" className="form-input" value={newNurseId} onChange={(e) => setNewNurseId(e.target.value)}>
              <option value="">-- เลือกพยาบาล --</option>
              {nurses.map((n) => (
                <option key={n.id} value={n.id}>{n.name} ({n.hospital})</option>
              ))}
            </select>
            <label className="form-label" htmlFor="reassign-reason" style={{ marginTop: 12 }}>เหตุผล (บังคับ)</label>
            <textarea id="reassign-reason" className="form-input textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setReassignTarget(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleReassign}>ยืนยันเปลี่ยนพยาบาล</button>
            </div>
          </div>
        </div>
      )}

      {historyView && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>ประวัติการมอบหมาย — {historyView.name}</h2>
            {historyList === null ? (
              <LoadingState />
            ) : historyList.length === 0 ? (
              <p>ยังไม่มีประวัติการมอบหมาย</p>
            ) : (
              <ul className="assignment-history-list">
                {historyList.map((h, i) => (
                  <li key={h.id || h._id || i}>
                    <strong>{new Date(h.assignedAt).toLocaleDateString('th-TH')}</strong>
                    {' — '}
                    {h.nurseId ? `${h.nurseId.firstName || ''} ${h.nurseId.lastName || ''}`.trim() : '-'}
                    {h.reason ? ` (${h.reason})` : ''}
                    {' · '}
                    <span className="history-status-tag">{h.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn-secondary" onClick={() => { setHistoryView(null); setHistoryList(null); }}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}
