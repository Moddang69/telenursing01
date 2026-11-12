import React, { useEffect, useRef } from 'react';

const ITEM_H = 40; // ความสูงต่อรายการ (px) — ต้องตรงกับ CSS (.ns-wheel-item)
const VISIBLE = 5; // จำนวนรายการที่มองเห็น (ตรงกลางคือค่าที่เลือก)

/**
 * WheelPicker — ตัวเลือกแบบ "เลื่อน" (ล้อหมุนแบบ iOS): เลื่อนขึ้น/ลงให้ค่าที่ต้องการมาอยู่ตรงกลาง
 * - ใช้ scroll-snap ของเบราว์เซอร์ → ลื่นบนมือถือ/เมาส์/ทัชแพด
 * - กดที่รายการเพื่อเลื่อนไปที่ค่านั้น, ใช้ปุ่มลูกศรขึ้น/ลงบนคีย์บอร์ดได้
 * @param {{value:any,label:string}[]} items
 * @param {any} value ค่าที่เลือกอยู่
 * @param {(value:any)=>void} onChange
 */
export default function WheelPicker({ items, value, onChange, ariaLabel, disabled = false }) {
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const programmaticRef = useRef(false);

  const index = Math.max(0, items.findIndex((i) => i.value === value));

  // ค่าเปลี่ยนจากภายนอก (หรือเปลี่ยนหน่วยแล้วจำนวนรายการเปลี่ยน) → เลื่อนให้ค่าที่เลือกอยู่ตรงกลาง
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = index * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) {
      programmaticRef.current = true;
      el.scrollTop = target;
      setTimeout(() => {
        programmaticRef.current = false;
      }, 120);
    }
  }, [index, items.length]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleScroll = () => {
    if (programmaticRef.current || disabled) return;
    clearTimeout(timerRef.current);
    // รอให้หยุดเลื่อน (snap เสร็จ) แล้วค่อยอ่านค่า
    timerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      if (items[i] && items[i].value !== value) onChange(items[i].value);
    }, 90);
  };

  const goTo = (i) => {
    if (disabled) return;
    const next = Math.min(items.length - 1, Math.max(0, i));
    scrollRef.current?.scrollTo({ top: next * ITEM_H, behavior: 'smooth' });
    if (items[next].value !== value) onChange(items[next].value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  return (
    <div className={`ns-wheel ${disabled ? 'disabled' : ''}`} style={{ height: ITEM_H * VISIBLE }}>
      <div className="ns-wheel-band" aria-hidden="true" />
      <div
        className="ns-wheel-scroll"
        ref={scrollRef}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        style={{ paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}
      >
        {items.map((item, i) => (
          <div
            key={String(item.value)}
            role="option"
            aria-selected={i === index}
            className={`ns-wheel-item ${i === index ? 'selected' : ''}`}
            style={{ height: ITEM_H }}
            onClick={() => goTo(i)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}