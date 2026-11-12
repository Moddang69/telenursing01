import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAgoraCall } from '../../hooks/useAgoraCall.js';
import { VIDEO_CALL_STATE } from '../../constants/statuses.js';
import ChatPanel from '../../components/common/ChatPanel.jsx';
import videoCallService from '../../services/videoCallService.js';
import './VideoConsultationPage.css';

const stateLabel = {
  WAITING_FOR_NURSE: 'กำลังรอพยาบาล...',
  NURSE_JOINED: 'พยาบาลเข้าร่วมแล้ว กำลังเชื่อมต่อ...',
  CONNECTING: 'กำลังเชื่อมต่อ...',
  CONNECTED: 'เชื่อมต่อสำเร็จ',
  RECONNECTING: 'กำลังเชื่อมต่อใหม่...',
  DISCONNECTED: 'การเชื่อมต่อขาดหาย',
  CALL_ENDED: 'สิ้นสุดการสนทนา',
};

export default function VideoConsultationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // หานัดหมายที่เข้าห้องได้ตอนนี้ (กฎเดียวกับฝั่งพยาบาล → ได้ห้อง Agora เดียวกัน)
  useEffect(() => {
    videoCallService
      .findJoinableAppointment()
      .then((apt) => setAppointmentId(apt?.id || null))
      .catch((e) => setLookupError(e?.message || 'ไม่สามารถตรวจสอบนัดหมายได้'))
      .finally(() => setLookupDone(true));
  }, []);

  const call = useAgoraCall({ appointmentId });

  const handleEndCall = () => {
    call.endCall();
  };

  if (!lookupDone) {
    return (
      <div className="state-page">
        <div className="spinner-lg" aria-hidden="true" />
        <p>กำลังตรวจสอบนัดหมาย...</p>
      </div>
    );
  }

  if (!appointmentId) {
    return (
      <div className="state-page">
        <h1>ไม่พบนัดหมายที่เข้าร่วมได้</h1>
        <p>{lookupError || 'ท่านยังไม่มีนัดหมายที่ถึงเวลา กรุณาตรวจสอบหน้านัดหมาย'}</p>
        <button className="btn-primary btn-large" onClick={() => navigate('/patient/home')}>
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  if (call.state === VIDEO_CALL_STATE.CALL_ENDED) {
    return (
      <div className="state-page">
        <h1>สิ้นสุดการปรึกษาแล้ว</h1>
        <p>ขอบคุณที่ใช้บริการ ท่านสามารถดูสรุปผลได้ที่หน้าประวัติการปรึกษา</p>
        <button className="btn-primary btn-large" onClick={() => navigate('/patient/home')}>
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  const showWaiting = call.state === VIDEO_CALL_STATE.WAITING_FOR_NURSE;

  return (
    <div className="video-page">
      <div className="video-status-bar" aria-live="polite">
        <span className={`video-state-dot state-${call.state.toLowerCase()}`} aria-hidden="true" />
        {stateLabel[call.state]}
      </div>

      <div className="agora-stage">
        {/* ภาพของพยาบาล (Agora เล่นวิดีโอลงใน container นี้) */}
        <div className="agora-remote" ref={call.remoteRef} />

        {call.error ? (
          <div className="agora-overlay">
            <div className="wait-timeout-box">
              <p>⚠️ {call.error}</p>
              <button className="btn-secondary" onClick={() => navigate('/patient/home')}>
                กลับสู่หน้าหลัก
              </button>
            </div>
          </div>
        ) : (
          showWaiting && (
            <div className="agora-overlay">
              <div className="waiting-room-box">
                <div className="spinner-lg" aria-hidden="true" />
                <p>กำลังรอพยาบาลเข้าร่วม... ({call.waitSeconds} วินาที)</p>
                {call.waitTimedOut && (
                  <div className="wait-timeout-box">
                    <p>การรอใช้เวลานานกว่าที่คาด ท่านสามารถ:</p>
                    <button className="btn-secondary" onClick={() => setShowChat(true)}>
                      ติดต่อพยาบาล
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/patient/home')}>
                      ขอเลื่อนนัดหมาย
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {call.mediaWarning && <div className="agora-warning">{call.mediaWarning}</div>}

        {/* ภาพของตัวเอง */}
        <div className="agora-local" ref={call.localRef} />
      </div>

      {showChat && (
        <div className="video-chat-overlay">
          <ChatPanel patientId={user?.roleRefId} currentRole="patient" />
        </div>
      )}

      <div className="video-controls">
        <button className={`control-btn ${!call.cameraOn ? 'off' : ''}`} onClick={call.toggleCamera}>
          {call.cameraOn ? '📷 กล้อง' : '📷 ปิดกล้อง'}
        </button>
        <button className={`control-btn ${!call.micOn ? 'off' : ''}`} onClick={call.toggleMic}>
          {call.micOn ? '🎙️ ไมค์' : '🎙️ ปิดไมค์'}
        </button>
        <button className="control-btn" onClick={() => setShowChat((s) => !s)}>💬 แชท</button>
        <button className="control-btn danger" onClick={handleEndCall}>📴 วางสาย</button>
      </div>
    </div>
  );
}