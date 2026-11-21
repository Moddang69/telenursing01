import React, { useEffect, useState, useCallback } from 'react';
import { Archive } from 'lucide-react';
import { nurseService } from '../../services/nurseService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import SatisfactionCommentsModal from '../../components/nurse/SatisfactionCommentsModal.jsx';
import './NurseHistoryPage.css';

export default function NurseHistoryPage() {
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(false);
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([nurseService.getAnalyticsSummary(), nurseService.getConsultationHistory()])
      .then(([a, h]) => { setAnalytics(a); setHistory(h); })
      .catch((err) => {
        console.error('NurseHistoryPage load error:', err);
        setError(true);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลประวัติได้" onRetry={load} />;
  if (!analytics || !history) return <LoadingState />;

  const cards = [
    { label: 'จำนวนการคอลสำเร็จ', value: analytics.completedCalls ?? '-', clickable: false },
    { label: 'ระยะเวลารอคอยเฉลี่ย (นาที)', value: analytics.avgWaitingTimeMinutes ?? '-', clickable: false },
    { label: 'Patient Satisfaction (/5)', value: analytics.patientSatisfactionScore ?? '-', clickable: true, onClick: () => setShowSatisfactionModal(true) },
    { label: 'Nurse Workload วันนี้ (เคส)', value: analytics.nurseWorkloadToday ?? '-', clickable: false },
    { label: 'จำนวนเคสที่ปิดไป', value: analytics.closedCases ?? '-', clickable: false },
  ];

  return (
    <div className="nurse-history-page">
      <h1>History — ข้อมูลสรุปการดำเนินงาน</h1>

      <div className="analytics-grid">
        {cards.map((c) => (
          <div 
            key={c.label} 
            className={`analytics-card ${c.clickable ? 'clickable' : ''}`}
            onClick={c.onClick}
          >
            <span className="analytics-value">{c.value}</span>
            <span className="analytics-label">{c.label}</span>
          </div>
        ))}
      </div>

      <h2 className="section-subheading">รายละเอียดประวัติการปรึกษา</h2>
      {history.length === 0 ? (
        <EmptyState icon={Archive} title="ยังไม่มีประวัติการปรึกษาที่เสร็จสิ้น" />
      ) : (
        <div className="history-list">
          {history.map((h) => (
            <div key={h.id} className="history-card">
              <div className="history-header">
                <strong>{h.patient}</strong>
                <span>{h.date} · {h.type}</span>
              </div>
              <p><strong>HN:</strong> {h.hn}</p>
              {h.reason && <p><strong>สาเหตุ:</strong> {h.reason}</p>}
              <div className="consultation-note-section">
                <strong>บันทึกการปรึกษา:</strong>
                <p className="consultation-note-text">{h.note || 'ไม่มีบันทึก'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <SatisfactionCommentsModal 
        isOpen={showSatisfactionModal} 
        onClose={() => setShowSatisfactionModal(false)} 
      />
    </div>
  );
}
