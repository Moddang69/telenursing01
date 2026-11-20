import React, { useState, useEffect, useCallback } from 'react';
import { CameraOff, Minus, Plus, PictureInPicture2, Columns2, User, Maximize2, Minimize2 } from 'lucide-react';
import { useVideoLayout } from '../../hooks/useVideoLayout.js';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ติดตามสถานะ fullscreen
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const stage = document.querySelector('.vs-stage');
    if (!stage) return;

    try {
      if (!document.fullscreenElement) {
        await stage.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  return (
    <div className={`vs-stage vs-${layout} vs-size-${size}`}>
      <div className="vs-tile vs-tile-remote">
        <div className="vs-video" ref={call.remoteRef} />
        <span className="vs-label">{remoteLabel}</span>
      </div>

      <div className="vs-tile vs-tile-local">
        <div className="vs-video" ref={call.localRef} />
        {!call.cameraOn && <div className="vs-cam-off"><CameraOff size={20} /> ปิดกล้อง</div>}
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
          <PictureInPicture2 size={16} className="inline-icon" /><span className="vs-btn-text"> คู่สนทนาใหญ่</span>
        </button>
        <button
          type="button"
          className={layout === 'split' ? 'active' : ''}
          aria-pressed={layout === 'split'}
          onClick={() => setLayout('split')}
          title="หน้าจอคู่ ขนาดเท่ากัน (บน-ล่าง)"
        >
          <Columns2 size={16} className="inline-icon" /><span className="vs-btn-text"> หน้าจอคู่</span>
        </button>

        {layout === 'pip' && (
          <span className="vs-size-ctl" role="group" aria-label="ขนาดวิดีโอของฉัน">
            <button type="button" aria-label="ย่อวิดีโอของฉัน" title="ย่อวิดีโอของฉัน" disabled={!canShrink} onClick={shrinkSelf}>
              <Minus size={16} />
            </button>
            <button type="button" aria-label="ขยายวิดีโอของฉัน" title="ขยายวิดีโอของฉัน" disabled={!canGrow} onClick={growSelf}>
              <Plus size={16} />
            </button>
          </span>
        )}

        <button
          type="button"
          className={isFullscreen ? 'active' : ''}
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงเต็มจอ'}
        >
          {isFullscreen
            ? <><Minimize2 size={16} className="inline-icon" /><span className="vs-btn-text"> ออกจากเต็มจอ</span></>
            : <><Maximize2 size={16} className="inline-icon" /><span className="vs-btn-text"> เต็มจอ</span></>
          }
        </button>
      </div>

      {children}
    </div>
  );
}
