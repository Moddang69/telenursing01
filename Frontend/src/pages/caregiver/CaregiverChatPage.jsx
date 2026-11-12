import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ChatPanel from '../../components/common/ChatPanel.jsx';

/**
 * CaregiverChatPage — แชทกลุ่ม 3 ฝ่าย (ผู้ป่วย / ผู้ดูแล / พยาบาล) ของผู้ป่วยที่ผูกอยู่
 * ผู้ดูแลที่เชื่อมโยงกับผู้ป่วยแล้ว (ACTIVE) ส่งข้อความได้เสมอ — Backend ตรวจการเชื่อมโยงซ้ำทั้งฝั่ง REST และ Socket
 */
export default function CaregiverChatPage() {
  const { link } = useOutletContext();

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>แชทกลุ่มดูแลผู้ป่วย</h2>
      <p style={{ fontSize: 'var(--font-size-sm)' }}>
        สนทนากับพยาบาลและ <strong>{link.patientName}</strong> — หากมีอาการฉุกเฉินให้โทร 1669 หรือไปโรงพยาบาลทันที
      </p>
      <ChatPanel patientId={link.patientId} currentRole="caregiver" fullHeight />
    </div>
  );
}