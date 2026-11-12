import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import NotificationSettingsLink from '../../components/notification/NotificationSettingsLink.jsx';
import { ROUTES } from '../../constants/routes.js';
import '../patient/PatientProfilePage.css';

const relationshipMap = {
  parent: 'พ่อ/แม่',
  child: 'บุตร',
  spouse: 'คู่สมรส',
  sibling: 'พี่น้อง',
  other: 'อื่นๆ',
};

export default function CaregiverProfilePage() {
  const { user, logout } = useAuth();
  const { link } = useOutletContext();
  const { fontSize, setFontSize, theme, setTheme, FONT_SIZE_OPTIONS, THEME_OPTIONS } = useAccessibility();

  
  
  return (
    <div className="profile-page">
      <section className="profile-section">
        <h2>ข้อมูลผู้ดูแล</h2>
        <p><strong>ชื่อ:</strong> {user?.name}</p>
        <p><strong>ความสัมพันธ์กับผู้ป่วย:</strong> {relationshipMap[link?.relationship?.toLowerCase()] || link?.relationship || '-'}</p>
      </section>

      <section className="profile-section">
        <h2>ผู้ป่วยที่ดูแล</h2>
        <p><strong>ชื่อผู้ป่วย:</strong> {link?.patientName}</p>
      </section>

      <NotificationSettingsLink to={ROUTES.CAREGIVER_NOTIFICATION_SETTINGS} />

      <section className="profile-section">
        <h2>การตั้งค่าการแสดงผล</h2>
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