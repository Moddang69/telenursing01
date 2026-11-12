import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationSettings.css';

/**
 * NotificationSettingsLink — เมนู "การแจ้งเตือน" ในหน้าโปรไฟล์ (กดเพื่อเข้าหน้าตั้งค่าการแจ้งเตือน)
 */
export default function NotificationSettingsLink({ to }) {
  const navigate = useNavigate();
  return (
    <section className="profile-section">
      <h2>การแจ้งเตือน</h2>
      <button type="button" className="ns-menu-row" onClick={() => navigate(to)}>
        <span>🔔 ตั้งค่าการแจ้งเตือน</span>
        <span aria-hidden="true">›</span>
      </button>
    </section>
  );
}