// src/components/common/OfflineState.jsx
import React from 'react';
import { WifiOff } from 'lucide-react';
import './States.css';

export default function OfflineState() {
  return (
    <div className="ui-state-box" role="alert">
      <div className="ui-state-icon" aria-hidden="true"><WifiOff size={48} /></div>
      <p>ไม่พบการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบสัญญาณและลองใหม่</p>
    </div>
  );
}