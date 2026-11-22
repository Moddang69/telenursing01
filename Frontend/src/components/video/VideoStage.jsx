import React from 'react';
import { useVideoLayout } from '../../hooks/useVideoLayout.js';
import SlashIcon from './SlashIcon.jsx';
import './VideoStage.css';

/**
 * VideoStage — พื้นที่แสดงวิดีโอคอล (ใช้ร่วมกันทั้งผู้ป่วยและพยาบาล)
 * สลับรูปแบบด้วย CSS ล้วน: container ของภาพ 2 ฝั่งอยู่ที่เดิมตลอด (ไม่ถูกสร้างใหม่)
 * เพราะ Agora เล่นวิดีโอลงใน element ที่ผูกกับ ref — ถ้าย้าย/สร้างใหม่ ภาพจะหาย
 *
 * @param call         ค่าที่ได้จาก useAgoraCall (remoteRef, localRef, cameraOn)
 * @param remoteLabel  ชื่อที่แสดงบนภาพคู่สนทนา
 * @param children     overlay (กำลังรอ/ข้อผิดพลาด ฯลฯ) วางทับพื้นที่วิดีโอ
 */
export default function VideoStage({ call, remoteLabel = 'คู่สนทนา', children }) {
  const { layout, size, setLayout, growSelf, shrinkSelf, canGrow, canShrink } = useVideoLayout();

  return (
    <div className={`vs-stage vs-${layout} vs-size-${size}`}>
      <div className="vs-tile vs-tile-remote">
        <div className="vs-video" ref={call.remoteRef} />
        <span className="vs-label">{remoteLabel}</span>
      </div>

      <div className="vs-tile vs-tile-local">
        <div className="vs-video" ref={call.localRef} />
        {!call.cameraOn && (
          <div className="vs-cam-off" role="status">
            <SlashIcon icon="📷" off />
            <span>กล้องของคุณปิดอยู่</span>
          </div>
        )}
        {!call.micOn && (
          <div className="vs-mic-off" role="status" title="ไมค์ของคุณปิดอยู่">
            <SlashIcon icon="🎙️" off />
            <span className="vs-mic-off-text">ไมค์ปิดอยู่</span>
          </div>
        )}
        <span className="vs-label">คุณ</span>
      </div>

      <div className="vs-toolbar" role="group" aria-label="รูปแบบหน้าจอวิดีโอ">
        <button
          type="button"
          className={layout === 'pip' ? 'active' : ''}
          aria-pressed={layout === 'pip'}
          onClick={() => setLayout('pip')}
          title="คู่สนทนาใหญ่ วิดีโอของฉันเล็ก"
        >
          🖼️<span className="vs-btn-text"> คู่สนทนาใหญ่</span>
        </button>
        <button
          type="button"
          className={layout === 'split' ? 'active' : ''}
          aria-pressed={layout === 'split'}
          onClick={() => setLayout('split')}
          title="หน้าจอคู่ ขนาดเท่ากัน (บน-ล่าง)"
        >
          ◫<span className="vs-btn-text"> หน้าจอคู่</span>
        </button>

        {layout === 'pip' && (
          <span className="vs-size-ctl" role="group" aria-label="ขนาดวิดีโอของฉัน">
            <button type="button" aria-label="ย่อวิดีโอของฉัน" title="ย่อวิดีโอของฉัน" disabled={!canShrink} onClick={shrinkSelf}>
              ➖
            </button>
            <button type="button" aria-label="ขยายวิดีโอของฉัน" title="ขยายวิดีโอของฉัน" disabled={!canGrow} onClick={growSelf}>
              ➕
            </button>
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
