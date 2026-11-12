import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header.jsx';
import BottomNav from '../components/common/BottomNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROUTES } from '../constants/routes.js';
import './PatientLayout.css';

const navItems = [
  { to: ROUTES.PATIENT_HOME, label: 'หน้าหลัก', icon: '🏠' },
  { to: ROUTES.PATIENT_HEALTH_LOG, label: 'บันทึกสุขภาพ', icon: '📝' },
  { to: ROUTES.PATIENT_MY_CARE, label: 'การดูแลของฉัน', icon: '❤️' },
  { to: ROUTES.PATIENT_PROFILE, label: 'โปรไฟล์', icon: '👤' },
];

export default function PatientLayout({ title }) {
  const { user } = useAuth();

  // แชทอยู่ที่ไอคอนบน Header (พร้อม badge ข้อความที่ยังไม่ได้อ่าน) — เปิดได้เมื่อมีพยาบาลผู้ดูแลแล้วเท่านั้น
  const chat = user?.hasAssignment
    ? { to: ROUTES.PATIENT_CHAT, patientId: user.roleRefId }
    : null;

  return (
    <div className="patient-layout">
      <Header title={title} chat={chat} />
      <main className="patient-layout-content">
        <Outlet />
      </main>
      <BottomNav items={navItems} />
    </div>
  );
}