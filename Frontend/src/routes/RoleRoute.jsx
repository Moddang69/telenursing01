import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROUTES } from '../constants/routes.js';

/**
 * RoleRoute
 * @param {string[]} allow - รายการ role ที่อนุญาตให้เข้าถึง
 */
export default function RoleRoute({ allow = [], children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  if (!allow.includes(user.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
}