import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Globe, Check, X } from 'lucide-react';
import { DEVICE_CHECK_STATUS } from '../../constants/statuses.js';
import './PreConsultCheckPage.css';

function DeviceCheckRow({ label, status, onRetry }) {
  const statusText = {
    CHECKING: 'กำลังตรวจสอบ...',
    READY: 'พร้อมใช้งาน',
    FAILED: 'ตรวจไม่พบ',
  };
  return (
    <div className={`device-check-row status-${status.toLowerCase()}`}>
      <span>{label}</span>
      <span className="device-status-text">
        {statusText[status]}
        {status === 'READY' && <Check size={16} className="inline-icon" />}
        {status === 'FAILED' && <X size={16} className="inline-icon" />}
      </span>
      {status === 'FAILED' && (
        <button className="btn-secondary" onClick={onRetry}>ลองใหม่</button>
      )}
    </div>
  );
}

export default function PreConsultCheckPage() {
  const navigate = useNavigate();
  const [camera, setCamera] = useState(DEVICE_CHECK_STATUS.CHECKING);
  const [mic, setMic] = useState(DEVICE_CHECK_STATUS.CHECKING);
  const [internet, setInternet] = useState(DEVICE_CHECK_STATUS.CHECKING);

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCamera(DEVICE_CHECK_STATUS.READY);
      return true;
    } catch (err) {
      console.error('Camera check failed:', err.name, err.message);
      setCamera(DEVICE_CHECK_STATUS.FAILED);
      return false;
    }
  };

  const checkMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMic(DEVICE_CHECK_STATUS.READY);
      return true;
    } catch (err) {
      console.error('Microphone check failed:', err.name, err.message);
      setMic(DEVICE_CHECK_STATUS.FAILED);
      return false;
    }
  };

  const checkInternet = () => {
    setInternet(navigator.onLine ? DEVICE_CHECK_STATUS.READY : DEVICE_CHECK_STATUS.FAILED);
    return navigator.onLine;
  };

  const runCheck = async () => {
    setCamera(DEVICE_CHECK_STATUS.CHECKING);
    setMic(DEVICE_CHECK_STATUS.CHECKING);
    setInternet(DEVICE_CHECK_STATUS.CHECKING);
    
    await Promise.all([
      checkCamera(),
      checkMic(),
      Promise.resolve(checkInternet())
    ]);
  };

  const retryCamera = async () => {
    setCamera(DEVICE_CHECK_STATUS.CHECKING);
    await checkCamera();
  };

  const retryMic = async () => {
    setMic(DEVICE_CHECK_STATUS.CHECKING);
    await checkMic();
  };

  const retryInternet = () => {
    setInternet(DEVICE_CHECK_STATUS.CHECKING);
    checkInternet();
  };

  useEffect(() => { runCheck(); }, []);

  const allReady = camera === 'READY' && mic === 'READY' && internet === 'READY';

  return (
    <main className="precheck-page">
      <section className="precheck-card">
        <h1>ตรวจสอบอุปกรณ์ก่อนเข้าพบพยาบาล</h1>
        <DeviceCheckRow label={<><Camera size={18} className="inline-icon" /> กล้อง</>} status={camera} onRetry={retryCamera} />
        <DeviceCheckRow label={<><Mic size={18} className="inline-icon" /> ไมโครโฟน</>} status={mic} onRetry={retryMic} />
        <DeviceCheckRow label={<><Globe size={18} className="inline-icon" /> อินเทอร์เน็ต</>} status={internet} onRetry={retryInternet} />

        <button
          className="btn-primary btn-large"
          disabled={!allReady}
          onClick={() => navigate('/patient/pre-consult-questionnaire')}
        >
          {allReady ? 'ถัดไป: กรอกแบบสอบถามก่อนพบพยาบาล' : 'กำลังตรวจสอบอุปกรณ์...'}
        </button>
      </section>
    </main>
  );
}