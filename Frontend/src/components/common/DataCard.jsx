import React from 'react';
import StatusBadge from './StatusBadge.jsx';
import './DataCard.css';

export default function DataCard({ title, value, unit, dateTime, status, trendSummary, onClick }) {
  return (
    <button className="data-card" onClick={onClick} type="button">
      <div className="data-card-header">
        <span className="data-card-title">{title}</span>
        <StatusBadge status={status} />
      </div>
      <div className="data-card-value">
        {value ?? '--'} <span className="data-card-unit">{unit}</span>
      </div>
      <div className="data-card-footer">
        <span>{dateTime || 'ยังไม่มีข้อมูล'}</span>
        {trendSummary && <span className="data-card-trend">{trendSummary}</span>}
      </div>
    </button>
  );
}