import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function PlaceholderPage({ title }) {
  const { user, logout } = useAuth();
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>
        หน้านี้เป็น Placeholder — จะถูกพัฒนาเต็มรูปแบบใน Phase ถัดไปตามแผนที่ยืนยันไว้
      </p>
      {user && (
        <div className="placeholder-user-info">
          <p>เข้าสู่ระบบในนามะ: {user.name} ({user.role})</p>
          <button onClick={logout} className="btn-secondary">
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}