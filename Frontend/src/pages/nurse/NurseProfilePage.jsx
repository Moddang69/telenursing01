import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import NotificationSettingsLink from '../../components/notification/NotificationSettingsLink.jsx';
import { ROUTES } from '../../constants/routes.js';
import './NurseProfilePage.css';

export default function NurseProfilePage() {
  const { user, logout } = useAuth();
  const { fontSize, setFontSize, theme, setTheme } = useAccessibility();

  return (
    <div className="nurse-profile-page">
      <section className="profile-section">
        <h2>ข้อมูลพยาบาล</h2>
        <p><strong>ชื่อ:</strong> {user?.name}</p>
        <p><strong>โรงพยาบาล:</strong> {user?.hospital}</p>
        <p><strong>เลขที่ใบอนุญาต:</strong> {user?.licenseNumber}</p>
        <p><strong>ตำแหน่ง:</strong> {user?.position || '-'}</p>
      </section>

      <NotificationSettingsLink to={ROUTES.NURSE_NOTIFICATION_SETTINGS} />

      <section className="profile-section">
        <h2>การตั้งค่า</h2>
        <div className="setting-row">
          <label className="form-label">ขนาดตัวอักษร</label>
          <div className="setting-options">
            <button className={`setting-btn ${fontSize === 'small' ? 'active' : ''}`} onClick={() => setFontSize('small')}>เล็ก</button>
            <button className={`setting-btn ${fontSize === 'medium' ? 'active' : ''}`} onClick={() => setFontSize('medium')}>กลาง</button>
            <button className={`setting-btn ${fontSize === 'large' ? 'active' : ''}`} onClick={() => setFontSize('large')}>ใหญ่</button>
          </div>
        </div>
        <div className="setting-row">
          <label className="form-label">ธีมสี</label>
          <div className="setting-options">
            <button className={`setting-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>☀️ สว่าง</button>
            <button className={`setting-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>🌙 มืด</button>
          </div>
        </div>
      </section>

      <button className="btn-secondary btn-full" onClick={logout}>ออกจากระบบ</button>
    </div>
  );
}