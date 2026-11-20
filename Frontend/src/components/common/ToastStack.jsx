import React from 'react';
import './ToastStack.css';

/**
 * ToastStack — แสดงข้อความแจ้งผล (toast) จาก useNotification().showToast(message, 'success' | 'error' | 'info')
 * เดิม NotificationContext เก็บรายการ toast ไว้แต่ไม่มีคอมโพเนนต์ใดแสดงผล ข้อความทั้งแอปจึงไม่เคยปรากฏบนหน้าจอ
 * ถูกวางไว้ใน NotificationProvider จึงทำงานทุกหน้าโดยไม่ต้องแก้ App.jsx
 */
export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
          <span className="toast-message">{t.message}</span>
          <button type="button" className="toast-close" aria-label="ปิดข้อความ" onClick={() => onDismiss(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
