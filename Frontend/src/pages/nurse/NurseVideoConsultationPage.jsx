import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAgoraCall } from '../../hooks/useAgoraCall.js';
import { useChatUnread } from '../../hooks/useChatUnread.js';
import { nurseService } from '../../services/nurseService.js';
import videoCallService from '../../services/videoCallService.js';
import { VIDEO_CALL_STATE } from '../../constants/statuses.js';
import { mapsUrl } from '../../utils/geolocation.js';
import ChatPanel from '../../components/common/ChatPanel.jsx';
import VideoStage from '../../components/video/VideoStage.jsx';
import {
  CameraIcon,
  CameraOffIcon,
  MicIcon,
  MicOffIcon,
  ChatIcon,
  PhoneOffIcon,
  ClipboardIcon,
} from '../../components/video/VideoIcons.jsx';
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

const INFO_TITLE = 'แบบสอบถามก่อนพบพยาบาล และบันทึกการปรึกษา';

// ฟังก์ชันสำหรับแปลงอาร์เรย์ของอาการให้ออกมาเป็น String ภาษาไทย
const getSymptomText = (symptoms, otherSymptom) => {
  if (!symptoms || symptoms.length === 0) return 'ไม่ระบุ';
  return symptoms
    .map((s) => (s === 'other' && otherSymptom ? `อื่นๆ (${otherSymptom})` : symptomMap[s] || s))
    .join(', ');
};

export default function NurseVideoConsultationPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [preConsult, setPreConsult] = useState(null);
  const [note, setNote] = useState(''); // เก็บไว้ที่หน้านี้ ปิด/เปิดแผงแล้วข้อความไม่หาย
  const [panel, setPanel] = useState(null); // null | 'info' | 'chat'
  const [appointmentId, setAppointmentId] = useState(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
  const chatUnread = useChatUnread({ patientId, userId: user?.id, onChatPage: panel === 'chat' });

  const remoteEnded = call.state === VIDEO_CALL_STATE.CALL_ENDED && !finishing;
  const showWaiting = call.state === VIDEO_CALL_STATE.WAITING_FOR_NURSE;

  // ผู้ป่วยวางสายหลังคุยกันแล้ว → เปิดแผงบันทึกการปรึกษาให้อัตโนมัติ เพื่อให้พยาบาลบันทึกก่อนออก
  useEffect(() => {
    if (remoteEnded) setPanel('info');
  }, [remoteEnded]);

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

  // พยาบาลกดปุ่มวางสาย
  //  - คุยกันแล้ว: บันทึก Note ลง Backend → แจ้งผู้ป่วยให้วางสาย → กลับหน้าผู้ป่วย (นัดหมายเป็น "เสร็จสิ้น")
  //  - ผู้ป่วยยังไม่เข้า/ยังไม่เคยคุยกัน: แค่ออกจากห้อง นัดหมายยังไม่เสร็จสิ้น และเข้าร่วมใหม่ได้
  const handleEndCall = async () => {
    if (!call.wasConnected) {
      setLeaving(true);
      try {
        await call.endCall();
      } finally {
        setLeaving(false);
      }
      return;
    }
    setFinishing(true);
    if (appointmentId) {
      await videoCallService.endSession(appointmentId, note || undefined, true).catch(() => {});
    }
    await call.endCall(note || undefined);
    navigate(`/nurse/patients/${patientId}`);
  };

  // ผู้ป่วยวางสายก่อน: ยังต้องให้พยาบาลบันทึก Note ได้ก่อนออกจากหน้า
  const handleSaveAndLeave = async () => {
    setFinishing(true);
    if (appointmentId) {
      await videoCallService.endSession(appointmentId, note || undefined, true).catch(() => {});
    }
    navigate(`/nurse/patients/${patientId}`);
  };

  // วางสายก่อนผู้ป่วยเข้า: นัดหมายยังไม่เสร็จสิ้น เข้าร่วมใหม่ได้
  if (call.leftEarly) {
    return (
      <div className="nurse-video-left">
        <h1>ออกจากห้องวิดีโอคอลแล้ว</h1>
        <p>ยังไม่ได้เริ่มการปรึกษากับผู้ป่วย (ผู้ป่วยยังไม่ได้เข้าร่วม) นัดหมายยังไม่เสร็จสิ้น ท่านสามารถเข้าร่วมวิดีโอคอลใหม่ได้</p>
        <button className="btn-primary btn-large" onClick={call.rejoin}>
          🎥 เข้าร่วมวิดีโอคอลอีกครั้ง
        </button>
        <button className="btn-secondary" onClick={() => navigate(`/nurse/patients/${patientId}`)}>
          กลับหน้าผู้ป่วย
        </button>
      </div>
    );
  }

  const hasCoords = preConsult?.gpsCoordinates?.lat != null && preConsult?.gpsCoordinates?.lng != null;

  // เนื้อหาแผงลอย - ใช้ทั้งโหมดปกติและโหมดเต็มจอ
  const panelContent = panel && (
    <div className="nurse-video-panel-content">
      <div className="nurse-video-panel-head">
        <span>{panel === 'info' ? INFO_TITLE : '💬 แชทกับผู้ป่วย'}</span>
        <button
          type="button"
          className="nurse-video-panel-close"
          aria-label="ปิดแผง"
          onClick={() => setPanel(null)}
        >
          ✕
        </button>
      </div>

      <div className="nurse-video-panel-body">
        {panel === 'info' && (
          <>
            {patient && (
              <>
                <h3>{patient.name}</h3>
                <p>HN: {patient.hn}</p>
              </>
            )}

            <h4>แบบสอบถามก่อนพบพยาบาล</h4>
            {preConsult ? (
              <ul className="preconsult-list">
                <li>
                  <strong>ตำแหน่ง:</strong> {preConsult.location}
                  {hasCoords && (
                    <>
                      {' '}
                      <a
                        href={mapsUrl(preConsult.gpsCoordinates.lat, preConsult.gpsCoordinates.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📍 เปิดแผนที่
                      </a>
                    </>
                  )}
                </li>
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
          </>
        )}

        {panel === 'chat' && <ChatPanel patientId={patientId} currentRole="nurse" />}
      </div>
    </div>
  );

  // ปุ่มควบคุมวิดีโอคอล - ใช้ทั้งโหมดปกติและโหมดเต็มจอ
  const videoControls = (
    <>
      <button
        className={`control-btn ${!call.cameraOn ? 'off' : ''}`}
        onClick={call.toggleCamera}
        aria-label={call.cameraOn ? 'ปิดกล้อง' : 'เปิดกล้อง'}
      >
        {call.cameraOn ? <CameraIcon size={24} /> : <CameraOffIcon size={24} />}
        <span className="control-btn-text">{call.cameraOn ? 'กล้อง' : 'ปิดกล้อง'}</span>
      </button>
      <button
        className={`control-btn ${!call.micOn ? 'off' : ''}`}
        onClick={call.toggleMic}
        aria-label={call.micOn ? 'ปิดไมค์' : 'เปิดไมค์'}
      >
        {call.micOn ? <MicIcon size={24} /> : <MicOffIcon size={24} />}
        <span className="control-btn-text">{call.micOn ? 'ไมค์' : 'ปิดไมค์'}</span>
      </button>
      <button
        className={`control-btn ${panel === 'info' ? 'active' : ''}`}
        onClick={() => togglePanel('info')}
        aria-expanded={panel === 'info'}
        aria-label={INFO_TITLE}
        title={INFO_TITLE}
      >
        <ClipboardIcon size={24} />
        <span className="control-btn-text">แบบสอบถาม/บันทึก</span>
      </button>
      <button
        className={`control-btn control-btn-badge ${panel === 'chat' ? 'active' : ''}`}
        onClick={() => togglePanel('chat')}
        aria-expanded={panel === 'chat'}
        aria-label={chatUnread > 0 ? `แชท (${chatUnread} ข้อความที่ยังไม่ได้อ่าน)` : 'แชท'}
      >
        <ChatIcon size={24} />
        <span className="control-btn-text">แชท</span>
        {chatUnread > 0 && panel !== 'chat' && (
          <span className="control-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>
        )}
      </button>
      <button className="control-btn danger" onClick={handleEndCall} disabled={finishing || leaving}>
        <PhoneOffIcon size={24} />
        <span className="control-btn-text">{call.wasConnected ? 'จบการปรึกษา' : 'ออกจากห้อง'}</span>
      </button>
    </>
  );

  return (
    <div className="nurse-video-page">
      <div className="nurse-video-main">
        <div className="video-status-bar-nurse" aria-live="polite">
          {patient?.name ? `${patient.name} — ` : ''}
          {stateLabel[call.state]}
        </div>

        <VideoStage call={call} remoteLabel={patient?.name || 'ผู้ป่วย'} controls={videoControls} panel={panelContent}>
          {lookupDone && !appointmentId ? (
            <div className="agora-overlay">
              <p>⚠️ ไม่พบนัดหมายของผู้ป่วยรายนี้ที่เข้าห้องได้ตอนนี้ กรุณาสร้างนัดหมายก่อนเริ่มวิดีโอคอล</p>
            </div>
          ) : call.error ? (
            <div className="agora-overlay">
              <p>⚠️ {call.error}</p>
            </div>
          ) : remoteEnded ? (
            <div className="agora-overlay">
              <div>
                <p>ผู้ป่วยวางสายแล้ว</p>
                <p className="video-mock-note">บันทึกการปรึกษาในแผงที่เปิดอยู่ แล้วกด “บันทึกและกลับ”</p>
                <button className="btn-primary" onClick={handleSaveAndLeave}>
                  บันทึกและกลับ
                </button>
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
        </VideoStage>

        <div className="video-controls">
          {videoControls}
        </div>
      </div>
    </div>
  );
}
