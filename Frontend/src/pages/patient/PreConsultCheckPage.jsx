import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../config/apiClient.js';
import { DEVICE_CHECK_STATUS } from '../../constants/statuses.js';
import { requestDeviceStream, stopStream, deviceHint } from '../../utils/deviceCheck.js';
import './PreConsultCheckPage.css';

const SLOW_MS = 3000; // ตอบช้ากว่านี้ถือว่าสัญญาณช้า (ยังไปต่อได้ แต่เตือน)

function DeviceCheckRow({ label, result, onRetry }) {
  const statusText = {
    CHECKING: 'กำลังตรวจสอบ...',
    READY: 'พร้อมใช้งาน ✓',
    FAILED: 'ตรวจไม่พบ ✕',
  };
  return (
    <div className={`device-check-block status-${result.status.toLowerCase()}`}>
      <div className="device-check-row">
        <span>{label}</span>
        <span className="device-status-text">{statusText[result.status]}</span>
        {result.status === 'FAILED' && onRetry && (
          <button type="button" className="btn-secondary" onClick={onRetry}>ลองใหม่</button>
        )}
      </div>
      {result.status === 'CHECKING' && result.waitingPrompt && (
        <p className="device-detail">กรุณากด “อนุญาต” ที่หน้าต่างของเบราว์เซอร์</p>
      )}
      {result.status === 'READY' && result.detail && <p className="device-detail">{result.detail}</p>}
      {result.status === 'FAILED' && result.hint && <p className="device-hint" role="alert">{result.hint}</p>}
    </div>
  );
}

// ภาพจากกล้องจริง — ให้ผู้ป่วยเห็นว่ากล้องใช้ได้และมุมกล้องเหมาะสม
function CameraPreview({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  if (!stream) return null;
  return <video ref={ref} className="camera-preview" autoPlay muted playsInline aria-label="ภาพตัวอย่างจากกล้องของท่าน" />;
}

// แถบระดับเสียงไมค์จริง — พูดแล้วแถบต้องขยับ (อัปเดตผ่าน ref ไม่ re-render ทั้งหน้า)
function MicMeter({ stream }) {
  const barRef = useRef(null);
  useEffect(() => {
    if (!stream) return undefined;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return undefined;
    let raf = 0;
    const ctx = new AudioCtx();
    ctx.resume?.().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i] - 128));
      if (barRef.current) barRef.current.style.width = `${Math.min(100, Math.round((peak / 128) * 160))}%`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ctx.close?.().catch(() => {});
    };
  }, [stream]);
  if (!stream) return null;
  return (
    <div className="mic-meter" aria-hidden="true">
      <div ref={barRef} className="mic-meter-bar" />
    </div>
  );
}

export default function PreConsultCheckPage() {
  const navigate = useNavigate();
  const [camera, setCamera] = useState({ status: DEVICE_CHECK_STATUS.CHECKING });
  const [mic, setMic] = useState({ status: DEVICE_CHECK_STATUS.CHECKING });
  const [internet, setInternet] = useState({ status: DEVICE_CHECK_STATUS.CHECKING });
  const [camStream, setCamStream] = useState(null);
  const [micStream, setMicStream] = useState(null);
  const camRef = useRef(null);
  const micRef = useRef(null);
  const mountedRef = useRef(true);

  const checkDevice = useCallback(async (kind) => {
    const isVideo = kind === 'video';
    const streamRef = isVideo ? camRef : micRef;
    const setStream = isVideo ? setCamStream : setMicStream;
    const setResult = isVideo ? setCamera : setMic;

    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setResult({ status: DEVICE_CHECK_STATUS.CHECKING, waitingPrompt: true });
    try {
      const stream = await requestDeviceStream(kind);
      if (!mountedRef.current) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      setStream(stream);
      const track = (isVideo ? stream.getVideoTracks() : stream.getAudioTracks())[0];
      setResult({ status: DEVICE_CHECK_STATUS.READY, detail: track?.label || '' });
    } catch (err) {
      if (!mountedRef.current) return;
      setResult({ status: DEVICE_CHECK_STATUS.FAILED, hint: deviceHint(kind, err.code) });
    }
  }, []);

  // อินเทอร์เน็ต: เรียก Backend จริง (ตรวจว่าเข้าถึงระบบได้ ไม่ใช่แค่ navigator.onLine) พร้อมวัดความเร็วตอบกลับ
  const checkInternet = useCallback(async () => {
    setInternet({ status: DEVICE_CHECK_STATUS.CHECKING });
    const started = performance.now();
    try {
      await apiClient.get('/health', { timeout: 8000 });
      if (!mountedRef.current) return;
      const ms = Math.round(performance.now() - started);
      setInternet({
        status: DEVICE_CHECK_STATUS.READY,
        detail: ms > SLOW_MS ? `สัญญาณค่อนข้างช้า (${ms} ms) ภาพอาจกระตุก ควรย้ายไปจุดที่สัญญาณดีกว่า` : `ตอบสนอง ${ms} ms`,
      });
    } catch (_) {
      if (!mountedRef.current) return;
      setInternet({
        status: DEVICE_CHECK_STATUS.FAILED,
        hint: navigator.onLine
          ? 'เชื่อมต่อระบบไม่ได้ในขณะนี้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วกด “ลองใหม่”'
          : 'อุปกรณ์ไม่ได้เชื่อมต่ออินเทอร์เน็ต กรุณาเปิด Wi-Fi หรือสัญญาณมือถือแล้วกด “ลองใหม่”',
      });
    }
  }, []);

  // ตรวจทีละตัว (กล้อง → ไมค์) เพื่อไม่ให้หน้าต่างขอสิทธิ์ซ้อนกัน; อินเทอร์เน็ตตรวจขนานกันไป
  const runAll = useCallback(async () => {
    checkInternet();
    await checkDevice('video');
    await checkDevice('audio');
  }, [checkDevice, checkInternet]);

  useEffect(() => {
    mountedRef.current = true;
    runAll();
    return () => {
      mountedRef.current = false;
      // ปล่อยกล้อง/ไมค์ทุกครั้งที่ออกจากหน้า — ไม่งั้น Agora เปิดอุปกรณ์ในห้องวิดีโอคอลไม่ได้
      stopStream(camRef.current);
      stopStream(micRef.current);
    };
  }, [runAll]);

  const results = [camera, mic, internet];
  const checking = results.some((r) => r.status === 'CHECKING');
  const allReady = results.every((r) => r.status === 'READY');
  const internetOk = internet.status === 'READY';
  const deviceFailed = camera.status === 'FAILED' || mic.status === 'FAILED';

  const goNext = () => {
    stopStream(camRef.current);
    stopStream(micRef.current);
    navigate('/patient/pre-consult-questionnaire');
  };

  return (
    <main className="precheck-page">
      <section className="precheck-card">
        <h1>ตรวจสอบอุปกรณ์ก่อนเข้าพบพยาบาล</h1>

        <DeviceCheckRow label="📷 กล้อง" result={camera} onRetry={() => checkDevice('video')} />
        <CameraPreview stream={camStream} />
        <DeviceCheckRow label="🎙️ ไมโครโฟน" result={mic} onRetry={() => checkDevice('audio')} />
        {micStream && <p className="device-detail">ลองพูด แถบด้านล่างควรขยับ</p>}
        <MicMeter stream={micStream} />
        <DeviceCheckRow label="🌐 อินเทอร์เน็ต" result={internet} onRetry={checkInternet} />

        <button type="button" className="btn-primary btn-large" disabled={!allReady} onClick={goNext}>
          {allReady
            ? 'ถัดไป: กรอกแบบสอบถามก่อนพบพยาบาล'
            : checking
            ? 'กำลังตรวจสอบอุปกรณ์...'
            : 'แก้ไขปัญหาด้านบนแล้วกด “ลองใหม่”'}
        </button>

        {/* กล้อง/ไมค์ใช้ไม่ได้ แต่ระบบเชื่อมต่อได้ — ยังเข้าพบพยาบาลได้ (หน้าวิดีโอคอลรองรับกรณีไม่มีอุปกรณ์) */}
        {!checking && internetOk && deviceFailed && (
          <div className="precheck-skip">
            <p>
              หากแก้ไขไม่ได้ ท่านยังเข้าพบพยาบาลต่อได้ โดยพยาบาลอาจไม่เห็นภาพหรือไม่ได้ยินเสียงของท่าน
              ควรแจ้งพยาบาลผ่านแชท
            </p>
            <button type="button" className="btn-secondary" onClick={goNext}>
              ดำเนินการต่อโดยไม่ใช้อุปกรณ์ที่ตรวจไม่พบ
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
