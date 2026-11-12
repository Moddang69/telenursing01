import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '../services/chatService.js';

/**
 * useChatUnread — จำนวนข้อความแชทที่ยังไม่ได้อ่าน (แสดง badge บนไอคอนแชทที่ Header)
 *  - นับจาก Backend ตอนเปิด/กลับมาที่แท็บ/reconnect
 *  - เพิ่มทันทีแบบ Realtime เมื่อมีข้อความใหม่จากอีกฝั่ง (ผ่านห้องแชทของ socket)
 *  - เป็น 0 ทันทีเมื่ออยู่ในหน้าแชท/อ่านแล้ว (ฟัง event 'chat:read' จาก chatService.markAsRead)
 * @param {string} patientId  thread key (ผู้ป่วย: roleRefId ของตน, ผู้ดูแล: patientId ที่ผูกอยู่) — ไม่ส่ง = ไม่ทำงาน
 * @param {string} userId     id ของผู้ใช้ปัจจุบัน — แชทกลุ่ม: ข้อความของ "คนอื่น" ทุกฝ่ายนับเป็นยังไม่อ่าน
 * @param {boolean} onChatPage  อยู่ในหน้าแชทอยู่แล้วหรือไม่ (ChatPanel จะ mark read ให้เอง)
 */
export function useChatUnread({ patientId, userId, onChatPage = false }) {
  const [count, setCount] = useState(0);
  const onChatPageRef = useRef(onChatPage);
  onChatPageRef.current = onChatPage;

  const refresh = useCallback(() => {
    if (!patientId) return;
    chatService
      .getUnreadCount(patientId)
      .then((n) => setCount(onChatPageRef.current ? 0 : n))
      .catch(() => {});
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      setCount(0);
      return undefined;
    }

    refresh();

    const unsubscribe = chatService.subscribe(patientId, {
      onMessage: (msg) => {
        // นับข้อความของคนอื่นทุกฝ่าย (ตรงกับ Backend) — ข้อความที่ตัวเองส่งไม่นับ
        if (String(msg.senderUserId) !== String(userId) && !onChatPageRef.current) setCount((c) => c + 1);
      },
      onStatus: (status) => {
        if (status === 'connected') refresh(); // เพิ่งต่อ/ต่อใหม่ → ซิงก์ยอดจริง (กันพลาดข้อความช่วงหลุด)
      },
    });

    const onRead = (e) => {
      if (String(e.detail?.patientId) === String(patientId)) setCount(0);
    };
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener('chat:read', onRead);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsubscribe();
      window.removeEventListener('chat:read', onRead);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [patientId, userId, refresh]);

  // เข้า/ออกหน้าแชท: เข้า → เป็น 0, ออก → ซิงก์ยอดใหม่
  useEffect(() => {
    if (onChatPage) setCount(0);
    else refresh();
  }, [onChatPage, refresh]);

  return count;
}

export default useChatUnread;