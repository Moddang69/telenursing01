import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROUTES } from '../../constants/routes.js';
import ChatPanel from '../../components/common/ChatPanel.jsx';

/**
 * PatientChatPage — แชทข้อความ Realtime กับพยาบาลผู้ดูแล
 * thread key = Patient._id ของผู้ใช้ (roleRefId) — Backend ตรวจสิทธิ์ซ้ำทั้งฝั่ง REST และ Socket
 */
export default function PatientChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.hasAssignment) {
    return (
      <div className="state-page">
        <h2>ยังไม่มีพยาบาลผู้ดูแล</h2>
        <p>กรุณาเลือกพยาบาลผู้ดูแลก่อน จึงจะเริ่มแชทได้</p>
        <button className="btn-primary" onClick={() => navigate(ROUTES.PATIENT_SELECT_NURSE)}>
          เลือกพยาบาลผู้ดูแล
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>แชทกลุ่มดูแลสุขภาพ</h2>
      <p style={{ fontSize: 'var(--font-size-sm)' }}>
        สนทนากับพยาบาลผู้ดูแล (และผู้ดูแลของท่าน หากมีการเชื่อมโยงไว้) — หากมีอาการฉุกเฉินให้โทร 1669 หรือไปโรงพยาบาลทันที
      </p>
      <ChatPanel patientId={user.roleRefId} currentRole="patient" fullHeight />
    </div>
  );
}