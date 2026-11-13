import React, { useEffect, useState } from 'react';
import { getPushState, enablePush } from '../../services/pushService.js';
import './ChatPushPrompt.css';

const DISMISS_KEY = 'telenursing_chat_push_prompt_dismissed';

/**
 * ChatPushPrompt — ป๊อปอัปเล็กใต้ไอคอนแชทบน Header ชวนเปิดการแจ้งเตือนข้อความแชทบนอุปกรณ์นี้ (แม้ไม่ได้เปิดเว็บ)
 *  - แสดงเฉพาะเมื่อ: เบราว์เซอร์รองรับ Push + ยังไม่เคยตอบสิทธิ์ + ยังไม่ได้เปิด + ยังไม่เคยกด "ไว้ทีหลัง" + active
 *  - active = อยู่ในหน้าแชท หรือมีข้อความที่ยังไม่อ่าน (จังหวะที่ผู้ใช้เห็นประโยชน์)
 *  - ต้องกดปุ่ม "เปิดการแจ้งเตือน" เอง เพราะเบราว์เซอร์บังคับให้ขอสิทธิ์จากการกดของผู้ใช้
 *  - ยังเปิดได้อีกทางที่กระดิ่ง (NotificationBell) เสมอ
 */
export default function ChatPushPrompt({ active = false }) {
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(DISMISS_KEY) === '1') return;
      } catch (_) {
        /* localStorage ใช้ไม่ได้ — ถือว่ายังไม่เคยปิด */
      }
      const state = await getPushState();
      if (!cancelled && state.supported && state.permission === 'default' && !state.subscribed) setEligible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!eligible || !active) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch (_) {
      /* ignore */
    }
    setEligible(false);
  };

  const handleEnable = async () => {
    setBusy(true);
    setError('');
    try {
      await enablePush();
      setEligible(false);
    } catch (err) {
      setError(err?.message || 'เปิดการแจ้งเตือนไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-push-prompt" role="dialog" aria-label="เปิดการแจ้งเตือนข้อความแชท">
      <p>รับแจ้งเตือนเมื่อมีข้อความแชทใหม่ แม้ไม่ได้เปิดเว็บอยู่</p>
      {error && <p className="chat-push-prompt-error">{error}</p>}
      <div className="chat-push-prompt-actions">
        <button type="button" className="chat-push-prompt-btn" onClick={dismiss} disabled={busy}>
          ไว้ทีหลัง
        </button>
        <button type="button" className="chat-push-prompt-btn primary" onClick={handleEnable} disabled={busy}>
          {busy ? '...' : 'เปิดการแจ้งเตือน'}
        </button>
      </div>
    </div>
  );
}