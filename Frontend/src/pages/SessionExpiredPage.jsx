import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function SessionExpiredPage() {
  const navigate = useNavigate();
  const { clearSessionExpired } = useAuth();

  const handleBackToLogin = () => {
    clearSessionExpired();
    navigate('/login', { replace: true });
  };

  return (
    <div className="state-page" role="alert">
      <h1>Session หมดอายุ</h1>
      <p>Session หมดอายุ กรุณาเข้าสู่ระบบใหม่</p>
      <button className="btn-primary" onClick={handleBackToLogin}>
        เข้าสู่ระบบใหม่
      </button>
    </div>
  );
}