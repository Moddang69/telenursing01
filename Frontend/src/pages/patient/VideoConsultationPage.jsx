import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Camera, Mic, MessageCircle, PhoneOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAgoraCall } from '../../hooks/useAgoraCall.js';
import { useChatUnread } from '../../hooks/useChatUnread.js';
import { VIDEO_CALL_STATE } from '../../constants/statuses.js';
import ChatPanel from '../../components/common/ChatPanel.jsx';
import VideoStage from '../../components/video/VideoStage.jsx';
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
  const [ending, setEnding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // หานัดหมายที่เข้าห้องได้ตอนนี้ (กฎเดียวกับฝั่งพยาบาล → ได้ห้อง Agora เดียวกัน)
  // re-fetch เมื่อ refreshKey เปลี่ยน (หลัง rejoin) เพื่อให้ได้นัดหมายที่ valid
  useEffect(() => {
    setLookupDone(false);
    setLookupError('');
    videoCallService
      .findJoinableAppointment()
      .then((apt) => setAppointmentId(apt?.id || null))
      .catch((e) => setLookupError(e?.message || 'ไม่สามารถตรวจสอบนัดหมายได้'))
      .finally(() => setLookupDone(true));
  }, [refreshKey]);

  // callback สำหรับ useAgoraCall → trigger re-fetch appointmentId เมื่อ rejoin
  const handleRejoin = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const call = useAgoraCall({ appointmentId, onRejoin: handleRejoin });
  const chatUnread = useChatUnread({ patientId: user?.roleRefId, userId: user?.id, onChatPage: showChat });

  const handleEndCall = async () => {
    setEnding(true);
    try {
      const result = await call.endCall();
      // ถ้าวิดีโอคอลเสร็จสิ้น → redirect ไปหน้าให้คะแนนความพึงพอใจ
      if (result.completed && appointmentId) {
        navigate(`/patient/satisfaction-rating?appointmentId=${appointmentId}`);
        return;
      }
    } finally {
      setEnding(false);
    }
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

  // วางสายก่อนพยาบาลเข้า/ก่อนได้คุยกัน: นัดหมายยังไม่เสร็จสิ้น เข้าร่วมใหม่ได้
  if (call.leftEarly) {
    return (
      <div className="state-page">
        <h1>ออกจากห้องวิดีโอคอลแล้ว</h1>
        <p>การปรึกษายังไม่เริ่ม (พยาบาลยังไม่ได้เข้าร่วม) นัดหมายของท่านยังไม่เสร็จสิ้น ท่านสามารถเข้าร่วมวิดีโอคอลใหม่ได้</p>
        <button className="btn-primary btn-large" onClick={call.rejoin}>
          <Video size={18} className="inline-icon" /> เข้าร่วมวิดีโอคอลอีกครั้ง
        </button>
        <button className="btn-secondary" onClick={() => navigate('/patient/home')}>
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

      <VideoStage call={call} remoteLabel="พยาบาล">
        {call.error ? (
          <div className="agora-overlay">
            <div className="wait-timeout-box">
              <p><AlertTriangle size={16} className="inline-icon" /> {call.error}</p>
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
      </VideoStage>

      {showChat && (
        <div className="video-chat-overlay">
          <ChatPanel patientId={user?.roleRefId} currentRole="patient" />
        </div>
      )}

      <div className="video-controls">
        <button className={`control-btn ${!call.cameraOn ? 'off' : ''}`} onClick={call.toggleCamera}>
          {call.cameraOn ? <><Camera size={18} /> กล้อง</> : <><Camera size={18} /> ปิดกล้อง</>}
        </button>
        <button className={`control-btn ${!call.micOn ? 'off' : ''}`} onClick={call.toggleMic}>
          {call.micOn ? <><Mic size={18} /> ไมค์</> : <><Mic size={18} /> ปิดไมค์</>}
        </button>
        <button className="control-btn control-btn-badge" onClick={() => setShowChat((s) => !s)}>
          <MessageCircle size={18} /> แชท
          {chatUnread > 0 && !showChat && <span className="control-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>}
        </button>
        <button className="control-btn danger" onClick={handleEndCall} disabled={ending}>
          <PhoneOff size={18} /> วางสาย
        </button>
      </div>
    </div>
  );
}
