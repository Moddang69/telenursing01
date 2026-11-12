import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nurseService } from '../../services/nurseService.js';
import { ROUTES } from '../../constants/routes.js';
import ChatPanel from '../../components/common/ChatPanel.jsx';
import './NurseChatPage.css';

/**
 * NurseChatRoomPage — ห้องแชทของผู้ป่วยหนึ่งคน (แชทกลุ่ม ผู้ป่วย/ผู้ดูแล/พยาบาล) ใช้ ChatPanel ตัวเดียวกับหน้ารายละเอียดผู้ป่วย
 * ชื่อผู้ป่วยด้านบนกดเพื่อเปิดดูข้อมูลผู้ป่วยได้ (ไปหน้าเดียวกับปุ่ม "เปิดดู" ในหน้า Home)
 */
export default function NurseChatRoomPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    setPatient(null);
    nurseService
      .getPatientDetail(patientId)
      .then(setPatient)
      .catch(() => {}); // โหลดชื่อไม่สำเร็จไม่กระทบการแชท
  }, [patientId]);

  return (
    <div className="nurse-chat-room">
      <div className="nurse-chat-room-header">
        <button
          type="button"
          className="nurse-chat-back"
          onClick={() => navigate(ROUTES.NURSE_CHAT)}
          aria-label="กลับไปรายการแชท"
        >
          ←
        </button>
        <button
          type="button"
          className="nurse-chat-patient-link"
          onClick={() => navigate(`/nurse/patients/${patientId}`)}
          title="เปิดดูข้อมูลผู้ป่วย"
        >
          <span className="nurse-chat-patient-name">{patient?.name || 'ผู้ป่วย'}</span>
          {patient?.hn && <span className="nurse-chat-patient-hn">HN: {patient.hn}</span>}
          <span aria-hidden="true" className="nurse-chat-chevron">›</span>
        </button>
      </div>

      <ChatPanel patientId={patientId} currentRole="nurse" fullHeight />
    </div>
  );
}