import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Header from '../components/common/Header.jsx';
import BottomNav from '../components/common/BottomNav.jsx';
import { caregiverService } from '../services/caregiverService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ROUTES } from '../constants/routes.js';
import LoadingState from '../components/common/LoadingState.jsx';
import './CaregiverLayout.css';

const navItems = [
  { to: ROUTES.CAREGIVER_HOME, label: 'หน้าหลัก', icon: '🏠' },
  { to: ROUTES.CAREGIVER_HEALTH_LOG, label: 'บันทึกสุขภาพ', icon: '📝' },
  { to: ROUTES.CAREGIVER_MY_CARE, label: 'การดูแลของฉัน', icon: '❤️' },
  { to: ROUTES.CAREGIVER_PROFILE, label: 'โปรไฟล์', icon: '👤' },
];

export default function CaregiverLayout() {
  const { user } = useAuth();
  const [link, setLink] = useState(undefined);

  useEffect(() => {
    if (!user?.roleRefId) return;
    caregiverService.getLinkedPatient(user.roleRefId).then(setLink);
  }, [user]);

  if (link === undefined) return <LoadingState />;
  if (link === null) return <Navigate to={ROUTES.CAREGIVER_LINK_PATIENT} replace />;

  // แชทกลุ่ม (ผู้ป่วย/ผู้ดูแล/พยาบาล) — ผู้ดูแลที่เชื่อมโยงแล้วใช้ได้เสมอ ไม่ต้องรอสิทธิ์เพิ่ม
  const chat = { to: ROUTES.CAREGIVER_CHAT, patientId: link.patientId };

  return (
    <div className="caregiver-layout">
      <Header title="Telenursing — ผู้ดูแล" chat={chat} />
      <div className="patient-context-banner" role="status">
        กำลังดูข้อมูลของผู้ป่วย: <strong>{link.patientName}</strong>
      </div>
      <main className="caregiver-layout-content">
        <Outlet context={{ link }} />
      </main>
      <BottomNav items={navItems} />
    </div>
  );
}