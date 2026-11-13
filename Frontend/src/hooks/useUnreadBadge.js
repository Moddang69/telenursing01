import { useEffect } from 'react';

const COUNT_PREFIX = /^\(\d+\+?\)\s*/;

const setAppBadge = (count) => {
  try {
    const p = count > 0 ? navigator.setAppBadge?.(count) : navigator.clearAppBadge?.();
    p?.catch?.(() => {});
  } catch (_) {
    /* เบราว์เซอร์ไม่รองรับ Badging API — ข้าม */
  }
};

/**
 * useUnreadBadge — แสดงจำนวนที่ยังไม่อ่านนอกหน้าเว็บ
 *  - แท็บเบราว์เซอร์: "(3) ชื่อหน้า" เห็นได้แม้เปิดแท็บอื่นอยู่
 *  - แอปที่ติดตั้งแบบ PWA (หน้าจอโฮม/เดสก์ท็อป): ตัวเลขบนไอคอนแอป (Badging API)
 */
export function useUnreadBadge(count) {
  useEffect(() => {
    const base = document.title.replace(COUNT_PREFIX, '');
    document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base;
    setAppBadge(count);
  }, [count]);

  // ออกจากหน้า (เช่น ออกจากระบบ) → คืนชื่อแท็บและล้างตัวเลขบนไอคอน
  useEffect(
    () => () => {
      document.title = document.title.replace(COUNT_PREFIX, '');
      setAppBadge(0);
    },
    []
  );
}

export default useUnreadBadge;