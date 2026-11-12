import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { NURSE_APPROVAL_STATUS } from '../../constants/statuses.js';

const statusMessages = {
  [NURSE_APPROVAL_STATUS.PENDING_APPROVAL]: {
    title: 'บัญชีของท่านอยู่ระหว่างการตรวจสอบ',
    detail: 'ทีมผู้ดูแลระบบกำลังตรวจสอบใบอนุญาตประกอบวิชาชีพของท่าน กรุณารอการอนุมัติ',
  },
  [NURSE_APPROVAL_STATUS.REJECTED]: {
    title: 'คำขอลงทะเบียนของท่านไม่ได้รับการอนุมัติ',
    detail: 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอข้อมูลเพิ่มเติม',
  },
  [NURSE_APPROVAL_STATUS.SUSPENDED]: {
    title: 'บัญชีของท่านถูกระงับการใช้งานชั่วคราว',
    detail: 'กรุณาติดต่อผู้ดูแลระบบเพื่อขอทราบรายละเอียด',
  },
};

export default function NursePendingApprovalPage() {
  const { user, logout } = useAuth();
  const info = statusMessages[user?.approvalStatus] || statusMessages[NURSE_APPROVAL_STATUS.PENDING_APPROVAL];

  return (
    <div className="state-page" role="status">
      <h1>{info.title}</h1>
      <p>{info.detail}</p>
      <button className="btn-secondary" onClick={logout}>ออกจากระบบ</button>
    </div>
  );
}