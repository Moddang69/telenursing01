// src/components/common/ErrorState.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './States.css';

export default function ErrorState({ message = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง', onRetry }) {
  return (
    <div className="ui-state-box" role="alert">
      <div className="ui-state-icon" aria-hidden="true"><AlertTriangle size={48} /></div>
      <p>{message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>ลองใหม่อีกครั้ง</button>
      )}
    </div>
  );
}