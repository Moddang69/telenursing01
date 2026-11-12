import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NURSE_APPROVAL_STATUS } from '../constants/statuses.js';
import { ROUTES } from '../constants/routes.js';

export default function ApprovalRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  if (user.approvalStatus !== NURSE_APPROVAL_STATUS.APPROVED) {
    return <Navigate to={ROUTES.NURSE_PENDING_APPROVAL} replace />;
  }
  return children;
}