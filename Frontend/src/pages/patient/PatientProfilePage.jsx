import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { dataRequestService } from '../../services/dataRequestService.js';
import { dataDeletionCategories } from '../../data/mockDataDeletionCategories.js';
import NotificationSettingsLink from '../../components/notification/NotificationSettingsLink.jsx';
import { ROUTES } from '../../constants/routes.js';
import './PatientProfilePage.css';

export default function PatientProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { fontSize, setFontSize, theme, setTheme } = useAccessibility();

  const [availableNurses, setAvailableNurses] = useState([]);

  // State สำหรับคำขอเปลี่ยนพยาบาล
  const [showChangeNurseModal, setShowChangeNurseModal] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

  // State สำหรับคำขอลบข้อมูล
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionError, setDeletionError] = useState('');
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  const [pendingDeletionRequest, setPendingDeletionRequest] = useState(null);
  const rawAssignedNurse = user?.assignedNurseId;
  const isPopulatedNurse = rawAssignedNurse && typeof rawAssignedNurse === 'object';
  const assignedNurseIdStr = isPopulatedNurse ? rawAssignedNurse._id : rawAssignedNurse;
  const assignedNurse = isPopulatedNurse
    ? rawAssignedNurse
    : availableNurses.find((n) => n.id === assignedNurseIdStr) || null;

  useEffect(() => {
    assignmentService.getAvailableNurses().then(setAvailableNurses);
    if (user?.id) {
      assignmentService.getMyNurseChangeRequest().then(setPendingRequest);
      dataRequestService.getMyDataDeletionRequest().then(setPendingDeletionRequest);
    }
  }, [user]);

  // ฟังก์ชันจัดการคำขอเปลี่ยนพยาบาล
  const handleSubmitChangeRequest = async () => {
    setError('');
    if (!selectedNurseId) { setError('กรุณาเลือกพยาบาลที่ต้องการเปลี่ยน'); return; }
    setIsSubmitting(true);
    try {
      const req = await assignmentService.requestNurseChange({
        requestedNurseId: selectedNurseId,
        reason,
      });
      setPendingRequest(req);
      setShowChangeNurseModal(false);
      setSelectedNurseId('');
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันจัดการคำขอลบข้อมูล
  const toggleCategory = (key) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitDeletionRequest = async () => {
    setDeletionError('');
    if (selectedCategories.length === 0) {
      setDeletionError('กรุณาเลือกข้อมูลที่ต้องการลบอย่างน้อย 1 รายการ');
      return;
    }
    setIsSubmittingDeletion(true);
    try {
      const req = await dataRequestService.requestDataDeletion({
        categories: selectedCategories,
        reason: deletionReason,
      });
      setPendingDeletionRequest(req);
      setShowDeletionModal(false);
      setSelectedCategories([]);
      setDeletionReason('');
    } catch (err) {
      setDeletionError(err.message);
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  return (
    <div className="profile-page">
      <section className="profile-section">
        <h2>ข้อมูลส่วนตัว</h2>
        <p><strong>ชื่อ:</strong> {user?.name}</p>
        <p><strong>HN:</strong> {user?.hn || '-'}</p>
        <button className="btn-secondary" onClick={() => navigate('/patient/profile/personal-info')}>
          ดูข้อมูลเพิ่มเติม →
        </button>
      </section>

      <section className="profile-section">
        <h2>Your Care Team</h2>
        {assignedNurse ? (
          <>
            <p><strong>พยาบาลผู้ดูแล:</strong> {assignedNurse.firstName} {assignedNurse.lastName}</p>
            <p><strong>สถานพยาบาล:</strong> {assignedNurse.hospital} — {assignedNurse.department}</p>
          </>
        ) : (
          <p>ยังไม่มีพยาบาลผู้ดูแล</p>
        )}

        {pendingRequest?.status === 'PENDING' ? (
          <p className="pending-request-note" style={{ marginTop: 12, color: '#d97706' }}>
            ⏳ คำขอเปลี่ยนพยาบาลของท่านเป็น <strong>{pendingRequest.requestedNurseName}</strong> อยู่ระหว่างการพิจารณาโดยผู้ดูแลระบบ
          </p>
        ) : (
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setShowChangeNurseModal(true)}>
            ขอเปลี่ยนพยาบาล
          </button>
        )}
      </section>

      <NotificationSettingsLink to={ROUTES.PATIENT_NOTIFICATION_SETTINGS} />

      <section className="profile-section">
        <h2>การตั้งค่าการแสดงผล</h2>
        <div className="setting-row">
          <label className="form-label">ขนาดตัวอักษร</label>
          <div className="setting-options">
            <button className={`setting-btn ${fontSize === 'small' ? 'active' : ''}`} onClick={() => setFontSize('small')}>เล็ก</button>
            <button className={`setting-btn ${fontSize === 'medium' ? 'active' : ''}`} onClick={() => setFontSize('medium')}>กลาง</button>
            <button className={`setting-btn ${fontSize === 'large' ? 'active' : ''}`} onClick={() => setFontSize('large')}>ใหญ่</button>
          </div>
        </div>
        <div className="setting-row">
          <label className="form-label">ธีมสี</label>
          <div className="setting-options">
            <button className={`setting-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>☀️ สว่าง</button>
            <button className={`setting-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>🌙 มืด</button>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <h2>ความเป็นส่วนตัวและความยินยอม</h2>
        <p>สถานะ: <strong>{user?.consentStatus}</strong></p>
        <button className="btn-secondary" onClick={() => navigate('/patient/profile/consent')}>
          ดูหนังสือแสดงความยินยอม →
        </button>
      </section>

      <section className="profile-section">
        <h2>สิทธิ์ในการลบข้อมูล</h2>
        <p className="deletion-note">
          ท่านมีสิทธิ์ขอลบข้อมูลของท่านออกจากระบบเป็นรายหมวดหมู่ โดยคำขอจะถูกส่งให้ผู้ดูแลระบบ (Admin)
          ตรวจสอบและอนุมัติก่อนดำเนินการจริง
        </p>

        {pendingDeletionRequest?.status === 'PENDING' ? (
          <p className="pending-request-note" style={{ color: '#d97706', fontSize: 'var(--font-size-sm)' }}>
            ⏳ คำขอลบข้อมูลของท่านอยู่ระหว่างการพิจารณาโดยผู้ดูแลระบบ<br />
            หมวดที่ขอลบ: {pendingDeletionRequest.categories
              .map((k) => dataDeletionCategories.find((c) => c.key === k)?.label || k)
              .join(', ')}
          </p>
        ) : pendingDeletionRequest?.status === 'CONFIRMED' ? (
          <p className="deletion-success" style={{ color: 'var(--color-normal)', fontSize: 'var(--font-size-sm)' }}>
            ✅ คำขอลบข้อมูลของท่านได้รับการอนุมัติแล้ว
          </p>
        ) : (
          <button className="btn-danger-outline btn-full" onClick={() => setShowDeletionModal(true)}>
            ขอลบข้อมูลของฉัน
          </button>
        )}
      </section>

      <button className="btn-secondary btn-full" onClick={logout}>ออกจากระบบ</button>

      {/* Modal สำหรับขอเปลี่ยนพยาบาล */}
      {showChangeNurseModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>ขอเปลี่ยนพยาบาลผู้ดูแล</h2>
            {error && <div className="alert-error" role="alert">{error}</div>}

            <label className="form-label" htmlFor="new-nurse-select">เลือกพยาบาลที่ต้องการ</label>
            <select id="new-nurse-select" className="form-input" value={selectedNurseId} onChange={(e) => setSelectedNurseId(e.target.value)}>
              <option value="">-- เลือกพยาบาล --</option>
              {availableNurses
                .filter((n) => n.id !== assignedNurseIdStr)
                .map((n) => (
                  <option key={n.id} value={n.id}>{n.firstName} {n.lastName} ({n.hospital})</option>
                ))}
            </select>

            <label className="form-label" htmlFor="change-reason" style={{ marginTop: 12 }}>เหตุผล (ไม่บังคับ)</label>
            <textarea id="change-reason" className="form-input textarea" value={reason} onChange={(e) => setReason(e.target.value)} />

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowChangeNurseModal(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSubmitChangeRequest} disabled={isSubmitting}>
                {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal สำหรับขอลบข้อมูล */}
      {showDeletionModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>ขอลบข้อมูลของฉัน</h2>
            <p className="modal-warning-text" style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 16 }}>
              ⚠️ การลบข้อมูลอาจส่งผลให้พยาบาลไม่สามารถติดตามดูแลอาการของท่านในหมวดที่เลือกได้อย่างต่อเนื่อง
            </p>
            {deletionError && <div className="alert-error" role="alert">{deletionError}</div>}

            <label className="form-label">เลือกข้อมูลที่ต้องการขอลบ</label>
            <div className="category-checkbox-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {dataDeletionCategories.map((cat) => (
                <label key={cat.key} className="category-checkbox-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                  />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>

            <label className="form-label" htmlFor="deletion-reason">
              เหตุผล (ไม่บังคับ)
            </label>
            <textarea
              id="deletion-reason"
              className="form-input textarea"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
            />

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeletionModal(false)}>ยกเลิก</button>
              <button className="btn-danger" onClick={handleSubmitDeletionRequest} disabled={isSubmittingDeletion}>
                {isSubmittingDeletion ? 'กำลังส่งคำขอ...' : 'ส่งคำขอลบข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}