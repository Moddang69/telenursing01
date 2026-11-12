import { useState, useEffect, useCallback } from 'react';
import { getPushState, enablePush, disablePush, syncPush } from '../services/pushService.js';

/**
 * usePushNotifications — สถานะ/ปุ่มเปิด-ปิดการแจ้งเตือนบนอุปกรณ์นี้ (Web Push)
 * เมื่อผู้ใช้เคยอนุญาตไว้แล้ว จะลงทะเบียนอุปกรณ์ให้บัญชีที่ล็อกอินอยู่โดยอัตโนมัติ (เงียบๆ)
 */
export function usePushNotifications({ enabled = true } = {}) {
  const [state, setState] = useState({ supported: false, permission: 'default', subscribed: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setState(await getPushState());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      await refresh();
      try {
        await syncPush();
        if (!cancelled) await refresh();
      } catch (_) {
        /* ลงทะเบียนอัตโนมัติไม่สำเร็จ — ไม่ต้องแจ้งผู้ใช้ */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await enablePush();
    } catch (err) {
      setError(err?.message || 'เปิดการแจ้งเตือนไม่สำเร็จ');
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await disablePush();
    } catch (err) {
      setError(err?.message || 'ปิดการแจ้งเตือนไม่สำเร็จ');
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [refresh]);

  return { ...state, busy, error, enable, disable };
}

export default usePushNotifications;