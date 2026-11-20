import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { BarChart3, Stethoscope, Users, Handshake, FileText, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROUTES } from '../constants/routes.js';
import './AdminLayout.css';

const navItems = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'แดชบอร์ด', icon: BarChart3 },
  { to: ROUTES.ADMIN_NURSES, label: 'จัดการพยาบาล', icon: Stethoscope },
  { to: ROUTES.ADMIN_PATIENTS, label: 'จัดการผู้ป่วย', icon: Users },
  { to: ROUTES.ADMIN_CAREGIVER_LINKS, label: 'อนุมัติผู้ดูแล', icon: Handshake },
  { to: ROUTES.ADMIN_DATA_REQUESTS, label: 'คำขอข้อมูล', icon: FileText },
  { to: ROUTES.ADMIN_AUDIT_LOGS, label: 'Audit Log', icon: ScrollText },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Telenursing Admin</h2>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <p>{user?.name}</p>
          <button 
            className="btn-secondary" 
            onClick={logout}
            style={{ backgroundColor: '#ffffff', color: 'var(--color-primary-dark)', border: 'none' }}
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}