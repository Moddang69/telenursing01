import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nurseService } from '../../services/nurseService.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './NursePatientListPage.css';

export default function NursePatientListPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState(false);

  const load = React.useCallback(() => {
    setError(false);
    nurseService.getAssignedPatients().then(setPatients).catch((err) => {
      console.error('NursePatientListPage load error:', err);
      setError(true);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message="ไม่สามารถโหลดรายชื่อผู้ป่วยได้" onRetry={load} />;
  if (!patients) return <LoadingState />;
  if (patients.length === 0) return <EmptyState icon="🧑‍⚕️" title="ยังไม่มีผู้ป่วยในความดูแล" />;

  return (
    <div className="patient-list-page">
      <h1>ผู้ป่วยในความดูแล</h1>
      <div className="patient-card-list">
        {patients.map((p) => (
          <div key={p.patientId} className="patient-list-card">
            <div className="patient-list-info">
              <StatusBadge status={p.alertSeverity} />
              <div>
                <strong>{p.name}</strong>
                <p className="patient-hn">HN: {p.hn}</p>
                <p className="patient-abnormal">
                  {p.latestAbnormal
                    ? `${p.latestAbnormal.metric}: ${p.latestAbnormal.value} ${p.latestAbnormal.unit}`
                    : 'ไม่มีค่าผิดปกติ'}
                </p>
              </div>
            </div>
            <div className="patient-list-actions">
              <button className="btn-secondary" onClick={() => navigate(`/nurse/patients/${p.patientId}/chat`)}>💬</button>
              <button className="btn-primary" onClick={() => navigate(`/nurse/patients/${p.patientId}`)}>เปิดดู</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}