import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nurseService } from '../../services/nurseService.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './NurseHomePage.css';

export default function NurseHomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState(false);

  const load = React.useCallback(() => {
    setError(false);
    Promise.all([nurseService.getDashboardSummary(), nurseService.getAssignedPatients()])
      .then(([s, p]) => { setSummary(s); setPatients(p); })
      .catch((err) => {
        console.error('NurseHomePage load error:', err);
        setError(true);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลหน้าหลักได้" onRetry={load} />;
  if (!summary || !patients) return <LoadingState />;

  return (
    <div className="nurse-home">
      {/* 1. ภาพรวมด้านบน */}
      <div className="overview-grid">
        <div className="overview-card"><span className="overview-value">{summary.totalPatients}</span><span>ผู้ป่วยทั้งหมด</span></div>
        <div className="overview-card"><span className="overview-value">{summary.todaysAppointments}</span><span>นัดหมายวันนี้</span></div>
        <div className="overview-card warn"><span className="overview-value">{summary.activeAlerts}</span><span>Alert ที่ต้องติดตาม</span></div>
        <div className="overview-card critical"><span className="overview-value">{summary.criticalCases}</span><span>เคสวิกฤต</span></div>
      </div>

      {/* 2. รายการผู้ป่วย */}
      <section className="home-section">
        <h2>ผู้ป่วยในความดูแล</h2>
        {patients.length === 0 ? (
          <EmptyState icon="🧑‍⚕️" title="ยังไม่มีผู้ป่วยในความดูแล" />
        ) : (
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
                  <button className="btn-primary" onClick={() => navigate(`/nurse/patients/${p.patientId}`)}>เปิดดู</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}