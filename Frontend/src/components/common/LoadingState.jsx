// src/components/common/LoadingState.jsx
import React from 'react';
import './States.css';

export default function LoadingState({ message = 'กำลังโหลดข้อมูล...' }) {
  return (
    <div className="ui-state-box" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}