import React from 'react';
import { Outlet } from 'react-router-dom';
import { Home, Calendar, BarChart3, User } from 'lucide-react';
import Header from '../components/common/Header.jsx';
import BottomNav from '../components/common/BottomNav.jsx';
import { ROUTES } from '../constants/routes.js';
import './NurseLayout.css';

const navItems = [
  { to: ROUTES.NURSE_HOME, label: 'หน้าหลัก', icon: Home },
  { to: ROUTES.NURSE_APPOINTMENTS, label: 'นัดหมาย', icon: Calendar },
  { to: ROUTES.NURSE_HISTORY, label: 'History', icon: BarChart3 },
  { to: ROUTES.NURSE_PROFILE, label: 'โปรไฟล์', icon: User },
];

export default function NurseLayout() {
  // ปุ่มแชทบน Header ของพยาบาล: เข้ารายการแชทของผู้ป่วยหลายคน + badge ข้อความที่ยังไม่อ่านรวม
  const chat = { to: ROUTES.NURSE_CHAT, mode: 'nurse' };

  return (
    <div className="nurse-layout">
      <Header title="Telenursing — พยาบาล" chat={chat} />
      <main className="nurse-layout-content">
        <Outlet />
      </main>
      <BottomNav items={navItems} />
    </div>
  );
}