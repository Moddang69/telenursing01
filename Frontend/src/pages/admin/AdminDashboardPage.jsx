import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import './AdminDashboardPage.css';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => { adminService.getDashboardSummary().then(setSummary); }, []);

  if (!summary) return <LoadingState />;

  const cards = [
    { label: 'ผู้ป่วยทั้งหมด', value: summary.totalPatients },
    { label: 'พยาบาลทั้งหมด', value: summary.totalNurses },
    { label: 'รออนุมัติพยาบาล', value: summary.pendingApproval, warn: true },
    { label: 'Assignment ที่ใช้งาน', value: summary.activeAssignments },
    { label: 'คำขอข้อมูล', value: summary.dataDeletionRequests, warn: true },
    { label: 'System Alerts', value: summary.systemAlerts, danger: true },
  ];

  return (
    <div className="admin-dashboard">
      <h1>แดชบอร์ดผู้ดูแลระบบ</h1>
      <div className="admin-overview-grid">
        {cards.map((c) => (
          <div key={c.label} className={`admin-overview-card ${c.warn ? 'warn' : ''} ${c.danger ? 'danger' : ''}`}>
            <span className="overview-value">{c.value}</span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}