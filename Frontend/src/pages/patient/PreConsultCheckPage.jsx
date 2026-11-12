import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEVICE_CHECK_STATUS } from '../../constants/statuses.js';
import './PreConsultCheckPage.css';

function DeviceCheckRow({ label, status, onRetry }) {
  const statusText = {
    CHECKING: 'กำลังตรวจสอบ...',
    READY: 'พร้อมใช้งาน ✓',
    FAILED: 'ตรวจไม่พบ ✕',
  };
  return (
    <div className={`device-check-row status-${status.toLowerCase()}`}>
      <span>{label}</span>
      <span className="device-status-text">{statusText[status]}</span>
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

  const runCheck = () => {
    // MOCK: จำลองผลตรวจอุปกรณ์ — จริงต้องใช้ navigator.mediaDevices ผ่าน HTTPS
    setCamera(DEVICE_CHECK_STATUS.CHECKING);
    setMic(DEVICE_CHECK_STATUS.CHECKING);
    setInternet(DEVICE_CHECK_STATUS.CHECKING);
    setTimeout(() => setCamera(DEVICE_CHECK_STATUS.READY), 800);
    setTimeout(() => setMic(DEVICE_CHECK_STATUS.READY), 1100);
    setTimeout(() => setInternet(navigator.onLine ? DEVICE_CHECK_STATUS.READY : DEVICE_CHECK_STATUS.FAILED), 1400);
  };

  useEffect(() => { runCheck(); }, []);

  const allReady = camera === 'READY' && mic === 'READY' && internet === 'READY';

  return (
    <main className="precheck-page">
      <section className="precheck-card">
        <h1>ตรวจสอบอุปกรณ์ก่อนเข้าพบพยาบาล</h1>
        <DeviceCheckRow label="📷 กล้อง" status={camera} onRetry={runCheck} />
        <DeviceCheckRow label="🎙️ ไมโครโฟน" status={mic} onRetry={runCheck} />
        <DeviceCheckRow label="🌐 อินเทอร์เน็ต" status={internet} onRetry={runCheck} />

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