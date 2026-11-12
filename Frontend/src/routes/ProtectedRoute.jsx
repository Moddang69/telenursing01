import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROUTES } from '../constants/routes.js';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, sessionExpired } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">กำลังตรวจสอบสถานะผู้ใช้...</div>;

  if (sessionExpired) {
    return <Navigate to={ROUTES.SESSION_EXPIRED} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children;
}