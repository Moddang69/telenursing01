import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgoraCall } from '../../hooks/useAgoraCall.js';
import { nurseService } from '../../services/nurseService.js';
import videoCallService from '../../services/videoCallService.js';
import { VIDEO_CALL_STATE } from '../../constants/statuses.js';
import ChatPanel from '../../components/common/ChatPanel.jsx';
import './NurseVideoConsultationPage.css';

// ตัวแปลง Key ภาษาอังกฤษเป็นข้อความภาษาไทย
const symptomMap = {
  dry_mouth: 'ปากแห้ง / กระหายน้ำมาก',
  frequent_urination: 'ปัสสาวะบ่อย',
  numbness: 'มือ/เท้าชา',
  slow_healing_wound: 'แผลหายช้า',
  dizziness: 'เวียนหัว / หน้ามืด',
  none: 'ไม่มีอาการผิดปกติ',
  other: 'อื่นๆ',
};

const stateLabel = {
  WAITING_FOR_NURSE: 'กำลังรอผู้ป่วยเข้าร่วม...',
  NURSE_JOINED: 'กำลังเชื่อมต่อ...',
  CONNECTING: 'ผู้ป่วยเข้าห้องแล้ว กำลังเชื่อมต่อ...',
  CONNECTED: 'เชื่อมต่อสำเร็จ',
  RECONNECTING: 'กำลังเชื่อมต่อใหม่...',
  DISCONNECTED: 'การเชื่อมต่อขาดหาย — รอผู้ป่วยกลับเข้าห้อง',
  CALL_ENDED: 'สิ้นสุดการสนทนา',
};

// ฟังก์ชันสำหรับแปลงอาร์เรย์ของอาการให้ออกมาเป็น String ภาษาไทย
const getSymptomText = (symptoms, otherSymptom) => {
  if (!symptoms || symptoms.length === 0) return 'ไม่ระบุ';
  return symptoms.map(s => {
    if (s === 'other' && otherSymptom) {
      return `อื่นๆ (${otherSymptom})`;
    }
    return symptomMap[s] || s;
  }).join(', ');
};

export default function NurseVideoConsultationPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [preConsult, setPreConsult] = useState(null);
  const [note, setNote] = useState('');
  const [showSidebar, setShowSidebar] = useState('info'); // info | chat
  const [appointmentId, setAppointmentId] = useState(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    nurseService.getPatientDetail(patientId).then(setPatient);
    nurseService.getPreConsultAnswers(patientId).then(setPreConsult);
  }, [patientId]);

  // หานัดหมายของผู้ป่วยรายนี้ที่ผูกกับพยาบาลคนนี้ → ใช้เป็นห้อง Agora (ตรงกับที่ฝั่งผู้ป่วยเลือก)
  useEffect(() => {
    videoCallService
      .findJoinableAppointment(patientId)
      .then((apt) => setAppointmentId(apt?.id || null))
      .catch(() => {})
      .finally(() => setLookupDone(true));
  }, [patientId]);

  const call = useAgoraCall({ appointmentId });

  // พยาบาลกดจบการปรึกษา: บันทึก Note ลง Backend → แจ้งผู้ป่วยให้วางสาย → กลับหน้าผู้ป่วย
  const handleEndCall = async () => {
    setFinishing(true);
    if (appointmentId) {
      await videoCallService.endSession(appointmentId, note || undefined).catch(() => {});
    }
    await call.endCall(note || undefined);
    navigate(`/nurse/patients/${patientId}`);
  };

  // ผู้ป่วยวางสายก่อน: ยังต้องให้พยาบาลบันทึก Note ได้ก่อนออกจากหน้า
  const handleSaveAndLeave = async () => {
    setFinishing(true);
    if (appointmentId) {
      await videoCallService.endSession(appointmentId, note || undefined).catch(() => {});
    }
    navigate(`/nurse/patients/${patientId}`);
  };

  const remoteEnded = call.state === VIDEO_CALL_STATE.CALL_ENDED && !finishing;
  const showWaiting = call.state === VIDEO_CALL_STATE.WAITING_FOR_NURSE;

  return (
    <div className="nurse-video-page">
      <div className="nurse-video-main">
        <div className="video-status-bar-nurse" aria-live="polite">
          {patient?.name ? `${patient.name} — ` : ''}{stateLabel[call.state]}
        </div>

        <div className="agora-stage">
          <div className="agora-remote" ref={call.remoteRef} />

          {lookupDone && !appointmentId ? (
            <div className="agora-overlay">
              <p>⚠️ ไม่พบนัดหมายของผู้ป่วยรายนี้ที่เข้าห้องได้ตอนนี้ กรุณาสร้างนัดหมายก่อนเริ่มวิดีโอคอล</p>
            </div>
          ) : call.error ? (
            <div className="agora-overlay"><p>⚠️ {call.error}</p></div>
          ) : remoteEnded ? (
            <div className="agora-overlay">
              <div>
                <p>ผู้ป่วยวางสายแล้ว</p>
                <p className="video-mock-note">บันทึกการปรึกษาทางด้านขวา แล้วกด “บันทึกและกลับ”</p>
                <button className="btn-primary" onClick={handleSaveAndLeave}>บันทึกและกลับ</button>
              </div>
            </div>
          ) : (
            showWaiting && (
              <div className="agora-overlay">
                <div>
                  <p>กำลังรอผู้ป่วยเข้าร่วม... ({call.waitSeconds} วินาที)</p>
                </div>
              </div>
            )
          )}

          {call.mediaWarning && <div className="agora-warning">{call.mediaWarning}</div>}
          <div className="agora-local" ref={call.localRef} />
        </div>

        <div className="video-controls">
          <button className={`control-btn ${!call.cameraOn ? 'off' : ''}`} onClick={call.toggleCamera}>{call.cameraOn ? '📷' : '📷 ปิด'}</button>
          <button className={`control-btn ${!call.micOn ? 'off' : ''}`} onClick={call.toggleMic}>{call.micOn ? '🎙️' : '🎙️ ปิด'}</button>
          <button className="control-btn danger" onClick={handleEndCall} disabled={finishing}>📴 จบการปรึกษา</button>
        </div>
      </div>

      <div className="nurse-video-sidebar">
        <div className="sidebar-tabs">
          <button className={showSidebar === 'info' ? 'active' : ''} onClick={() => setShowSidebar('info')}>ข้อมูลผู้ป่วย</button>
          <button className={showSidebar === 'chat' ? 'active' : ''} onClick={() => setShowSidebar('chat')}>แชท</button>
        </div>

        {showSidebar === 'info' && patient && (
          <div className="sidebar-content">
            <h3>{patient.name}</h3>
            <p>HN: {patient.hn}</p>

            <h4>แบบสอบถามก่อนพบพยาบาล</h4>
            {preConsult ? (
              <ul className="preconsult-list">
                <li><strong>ตำแหน่ง:</strong> {preConsult.location}</li>
                <li><strong>เบอร์ฉุกเฉิน:</strong> {preConsult.emergencyContact}</li>
                <li><strong>น้ำตาลล่าสุด:</strong> {preConsult.latestGlucose}</li>
                <li><strong>ความดันล่าสุด:</strong> {preConsult.latestBP}</li>
                <li><strong>ระดับความเจ็บปวด:</strong> {preConsult.painLevel}/10</li>
                <li><strong>อาการ:</strong> {getSymptomText(preConsult.symptoms, preConsult.otherSymptom)}</li>
              </ul>
            ) : (
              <p>ผู้ป่วยยังไม่ได้กรอกแบบสอบถาม</p>
            )}

            <h4>บันทึกการปรึกษา (Consultation Note)</h4>
            <textarea
              className="form-input textarea"
              placeholder="บันทึกการประเมิน/คำแนะนำ (ห้ามระบุการวินิจฉัยโรคโดยอัตโนมัติ)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        {showSidebar === 'chat' && <ChatPanel patientId={patientId} currentRole="nurse" />}
      </div>
    </div>
  );
}