import React from 'react';
import './StatusBadge.css';

const STATUS_CONFIG = {
  NORMAL: { icon: '✓', label: 'ปกติ', className: 'badge-normal' },
  WARNING: { icon: '⚠', label: 'เฝ้าระวัง', className: 'badge-warning' },
  HIGH: { icon: '▲', label: 'สูง', className: 'badge-high' },
  CRITICAL: { icon: '✕', label: 'วิกฤต', className: 'badge-critical' },
};

export default function StatusBadge({ status = 'NORMAL', text }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NORMAL;
  return (
    <span className={`status-badge ${config.className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {text || config.label}
    </span>
  );
}