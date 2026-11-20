import React, { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import './SwipeToDelete.css';

/**
 * SwipeToDelete — เลื่อนการ์ดไปทางซ้ายเพื่อลบ (Swipe to delete)
 *  - เลื่อนแล้วพื้นหลังเป็นสีแดง + อิโมจิถังขยะ 🗑️ ค่อยๆ ใหญ่ขึ้นตามระยะที่เลื่อน
 *  - เลื่อนจนสุด (≥ threshold ของความกว้าง) = เรียก onRequestDelete() ซึ่งควรแสดงหน้าต่างยืนยัน
 *      และคืน Promise<boolean> (true = ยืนยันและลบสำเร็จ → การ์ดหุบหายแล้วเรียก onRemoved, false = ยกเลิก → การ์ดเด้งกลับ)
 *  - เลื่อนไม่สุดแล้วปล่อย = เด้งกลับ
 *  - ใช้ Pointer Events: รองรับทั้งนิ้ว (touch) และเมาส์; เลื่อนแนวตั้งยังเลื่อนหน้าจอได้ตามปกติ
 *  - คีย์บอร์ด: โฟกัสที่การ์ดแล้วกด Delete = ขั้นตอนเดียวกัน
 */
export default function SwipeToDelete({ children, onRequestDelete, onRemoved, disabled = false, threshold = 0.55 }) {
  const rowRef = useRef(null);
  const startRef = useRef(null);
  const movedRef = useRef(false);
  const dxRef = useRef(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | pending | removing
  const [height, setHeight] = useState(null);

  const rowWidth = () => rowRef.current?.offsetWidth || 1;
  const move = (value) => {
    dxRef.current = value;
    setDx(value);
  };

  const trigger = useCallback(async () => {
    setPhase('pending');
    move(-rowWidth()); // เลื่อนสุด ค้างสีแดง+ถังขยะไว้ระหว่างรอยืนยัน
    let confirmed = false;
    try {
      confirmed = !!(await onRequestDelete?.());
    } catch (_) {
      confirmed = false;
    }
    if (confirmed) {
      setHeight(rowRef.current?.offsetHeight || 0);
      setPhase('removing');
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0))); // หุบความสูงให้ลื่น
      setTimeout(() => onRemoved?.(), 300);
    } else {
      setPhase('idle');
      move(0);
    }
  }, [onRequestDelete, onRemoved]);

  const onPointerDown = (e) => {
    if (disabled || phase !== 'idle') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: null };
    movedRef.current = false;
  };

  const onPointerMove = (e) => {
    const st = startRef.current;
    if (!st || st.id !== e.pointerId) return;
    const mx = e.clientX - st.x;
    const my = e.clientY - st.y;

    if (st.locked === null) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      // แนวนอนไปทางซ้ายเท่านั้นถึงจะเป็นการลบ — แนวตั้ง/ขวา ปล่อยให้เป็นการเลื่อนหน้าจอปกติ
      st.locked = Math.abs(mx) > Math.abs(my) && mx < 0 ? 'h' : 'v';
      if (st.locked === 'h') {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDragging(true);
      }
    }
    if (st.locked !== 'h') return;
    movedRef.current = true;
    move(Math.max(-rowWidth(), Math.min(0, mx)));
  };

  const finish = (e) => {
    const st = startRef.current;
    startRef.current = null;
    if (!st) return;
    setDragging(false);
    if (st.locked !== 'h') return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    if (e.type !== 'pointercancel' && -dxRef.current >= rowWidth() * threshold) trigger();
    else move(0);
  };

  // หลังลากจริง อย่าให้ปุ่มในการ์ด (เช่น "เปิดเคส") ถูกกดโดยไม่ตั้งใจ
  const onClickCapture = (e) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
    }
  };

  const onKeyDown = (e) => {
    if (disabled || phase !== 'idle') return;
    if (e.target === e.currentTarget && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      trigger();
    }
  };

  const progress = Math.min(1, Math.abs(dx) / (rowWidth() * threshold));

  return (
    <div
      ref={rowRef}
      className={`swipe-row ${phase === 'removing' ? 'removing' : ''}`}
      style={height !== null ? { height, opacity: height === 0 ? 0 : 1 } : undefined}
    >
      <div className="swipe-bg" style={{ opacity: dx < 0 ? 1 : 0 }} aria-hidden="true">
        <span className="swipe-trash" style={{ transform: `scale(${0.6 + 0.6 * progress})` }}>
          <Trash2 size={24} />
        </span>
      </div>
      <div
        className="swipe-content"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 0.25s ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        tabIndex={disabled ? -1 : 0}
        aria-keyshortcuts={disabled ? undefined : 'Delete'}
      >
        {children}
      </div>
    </div>
  );
}
