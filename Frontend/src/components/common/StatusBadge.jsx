import React from 'react';
import { Check, AlertTriangle, TrendingUp, X } from 'lucide-react';
import './StatusBadge.css';

const STATUS_CONFIG = {
  NORMAL: { icon: Check, label: 'ปกติ', className: 'badge-normal' },
  WARNING: { icon: AlertTriangle, label: 'เฝ้าระวัง', className: 'badge-warning' },
  HIGH: { icon: TrendingUp, label: 'สูง', className: 'badge-high' },
  CRITICAL: { icon: X, label: 'วิกฤต', className: 'badge-critical' },
};

export default function StatusBadge({ status = 'NORMAL', text }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NORMAL;
  const Icon = config.icon;
  return (
    <span className={`status-badge ${config.className}`}>
      <span aria-hidden="true"><Icon size={14} /></span>
      {text || config.label}
    </span>
  );
}