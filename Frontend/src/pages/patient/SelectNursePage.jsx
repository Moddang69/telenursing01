import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROUTES } from '../../constants/routes.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import '../auth/AuthForm.css';

export default function SelectNursePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [nurses, setNurses] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedNurse, setConfirmedNurse] = useState(null);

  useEffect(() => { assignmentService.getAvailableNurses().then(setNurses); }, []);

  if (!nurses) return <LoadingState />;

  const selectedNurse = nurses.find((n) => n.id === selectedId);

  const handleConfirm = async () => {
    if (!selectedId) { setError('กรุณาเลือกพยาบาลที่ต้องการให้ดูแล'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      await assignmentService.selectNurse({ patientId: user.roleRefId, nurseId: selectedId });
      updateUser({ hasAssignment: true, assignedNurseId: selectedId });
      setConfirmedNurse(selectedNurse);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedNurse) {
    return (
      <main className="auth-page">
        <section className="auth-card state-page">
          <h1>เชื่อมต่อสำเร็จ!</h1>
          <div className="care-team-box">
            <h2>ทีมดูแลของคุณ (Your Care Team)</h2>
            <p><strong>พยาบาล:</strong> {confirmedNurse.firstName} {confirmedNurse.lastName}</p>
            <p><strong>สถานพยาบาล:</strong> {confirmedNurse.hospital} {confirmedNurse.department ? `— ${confirmedNurse.department}` : ''}</p>
          </div>
          <button className="btn-primary btn-large" onClick={() => navigate(ROUTES.PATIENT_HOME)}>
            เข้าสู่หน้าหลัก
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">เลือกพยาบาลผู้ดูแล</h1>
        <p className="auth-subtitle">กรุณาเลือกพยาบาลที่ท่านต้องการให้ติดตามและดูแลอาการของท่าน</p>
        {error && <div className="alert-error" role="alert">{error}</div>}

        {nurses.length === 0 ? (
          <p>ขณะนี้ยังไม่มีพยาบาลที่พร้อมให้บริการ กรุณาลองใหม่ภายหลัง</p>
        ) : (
          <div className="nurse-select-list">
            {nurses.map((n) => (
              <label key={n.id} className={`nurse-select-option ${selectedId === n.id ? 'selected' : ''}`}>
                <input type="radio" name="nurse" value={n.id}
                  checked={selectedId === n.id} onChange={(e) => setSelectedId(e.target.value)} />
                <div>
                  <strong>{n.firstName} {n.lastName}</strong>
                  <p>{n.hospital} {n.department ? `— ${n.department}` : ''}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <button className="btn-primary btn-large" onClick={handleConfirm} disabled={isSubmitting || nurses.length === 0} style={{ marginTop: 16 }}>
          {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการเลือกพยาบาล'}
        </button>
      </section>
    </main>
  );
}
