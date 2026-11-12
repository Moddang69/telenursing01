// src/components/common/OfflineState.jsx
import React from 'react';
import './States.css';

export default function OfflineState() {
  return (
    <div className="ui-state-box" role="alert">
      <div className="ui-state-icon" aria-hidden="true">📡</div>
      <p>ไม่พบการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบสัญญาณและลองใหม่</p>
    </div>
  );
}