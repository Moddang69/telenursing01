import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '../services/notificationService.js';
import { getSocket } from '../config/socketClient.js';

/**
 * useNotifications — รายการแจ้งเตือนของผู้ใช้ + จำนวนที่ยังไม่อ่าน (ใช้กับกระดิ่งบน Header)
 *  - โหลดจาก Backend ตอนเปิด / ต่อ socket ใหม่ / กลับมาที่แท็บ
 *  - รับการแจ้งเตือนใหม่แบบ Realtime ผ่าน socket (event 'notification' ในห้องส่วนตัวของผู้ใช้)
 * @param {(n:object)=>void} [onIncoming] เรียกเมื่อมีการแจ้งเตือนใหม่เข้ามา (ใช้แสดง toast)
 */
export function useNotifications({ enabled = true, onIncoming } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  const refresh = useCallback(async () => {
    try {
      const data = await notificationService.list({ limit: 20 });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setError('');
    } catch (err) {
      setError(err?.message || 'ไม่สามารถโหลดการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();

    let socket = null;
    let stopped = false;
    let waitTimer = null;

    const onNotification = (n) => {
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
      setUnreadCount((c) => c + 1);
      onIncomingRef.current?.(n);
    };
    const onConnect = () => refresh(); // ต่อใหม่ → ซิงก์กันพลาดช่วงหลุด

    const attach = () => {
      socket = getSocket();
      if (!socket) return false;
      socket.on('notification', onNotification);
      socket.on('connect', onConnect);
      return true;
    };
    if (!attach()) {
      waitTimer = setInterval(() => {
        if (stopped) return;
        if (attach()) {
          clearInterval(waitTimer);
          waitTimer = null;
        }
      }, 500);
    }

    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      if (waitTimer) clearInterval(waitTimer);
      if (socket) {
        socket.off('notification', onNotification);
        socket.off('connect', onConnect);
      }
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  const loadMore = useCallback(async () => {
    if (!items.length) return;
    try {
      const data = await notificationService.list({ limit: 20, before: items[items.length - 1].createdAt });
      setItems((prev) => [...prev, ...data.items.filter((n) => !prev.some((x) => x.id === n.id))]);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err?.message || 'ไม่สามารถโหลดเพิ่มได้');
    }
  }, [items]);

  const markRead = useCallback(async (id) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read) {
          wasUnread = true;
          return { ...n, read: true };
        }
        return n;
      })
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationService.markRead(id);
    } catch (_) {
      refresh(); // ไม่สำเร็จ → ซิงก์สถานะจริงกลับมา
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch (_) {
      refresh();
    }
  }, [refresh]);

  return { items, unreadCount, hasMore, loading, error, loadMore, markRead, markAllRead, refresh };
}

export default useNotifications;