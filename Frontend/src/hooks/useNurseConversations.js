import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '../services/chatService.js';

/**
 * useNurseConversations — (พยาบาล) รายการห้องแชทของผู้ป่วยที่เคยสนทนา + จำนวนข้อความที่ยังไม่อ่านรวม
 *  - โหลดจาก Backend ตอนเปิด / กลับมาที่แท็บ / reconnect
 *  - รีเฟรชทันทีเมื่อมีข้อความใหม่เข้ามาในห้องของผู้ป่วยคนไหนก็ตามใน Care Team (ผ่าน socket)
 *  - รีเฟรชหลังอ่านข้อความ (event 'chat:read' จาก chatService.markAsRead) เพื่อให้ตัวเลขลดลง
 * ใช้ทั้งที่ Header (totalUnread) และหน้ารายการแชท (conversations)
 */
export function useNurseConversations({ enabled = true } = {}) {
  const [data, setData] = useState({ conversations: [], totalUnread: 0 });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const refresh = useCallback(async (initial = false) => {
    try {
      const next = await chatService.getConversations();
      setData(next);
      setError('');
      chatService.refreshInboxRooms(); // ผู้ป่วยที่เพิ่งเข้า Care Team จะเข้าห้องแชทด้วย
    } catch (err) {
      if (initial) setError(err?.message || 'ไม่สามารถโหลดรายการแชทได้');
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const schedule = (delay) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => refresh(false), delay);
    };

    refresh(true);

    const unsubscribe = chatService.subscribeInbox({
      onMessage: () => schedule(300),
      onStatus: (status) => {
        if (status === 'connected') schedule(0); // ต่อใหม่ → ซิงก์ยอดจริง (กันพลาดข้อความช่วงหลุด)
      },
    });

    // หน่วงเล็กน้อยให้ Backend อัปเดตสถานะอ่านเสร็จก่อนดึงยอดใหม่
    const onRead = () => schedule(500);
    const onVisible = () => {
      if (!document.hidden) schedule(0);
    };
    window.addEventListener('chat:read', onRead);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timerRef.current);
      unsubscribe();
      window.removeEventListener('chat:read', onRead);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  return {
    conversations: data.conversations,
    totalUnread: data.totalUnread,
    loading,
    error,
    refresh: () => refresh(true),
  };
}

export default useNurseConversations;