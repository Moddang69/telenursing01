import React, { useState } from 'react';
import WheelPicker from './WheelPicker.jsx';
import { PRESETS, UNITS, unitByKey, toParts, fromParts, describeOffset } from '../../utils/reminderOffsets.js';

/**
 * ReminderRow — การแจ้งเตือนล่วงหน้า 1 รายการ
 * แถวปิด: แสดงสรุป (เช่น "1 วันก่อนกิจกรรม") กดเพื่อเปิด/ซ่อนตัวเลือก
 * แถวเปิด: 10 นาที / 30 นาที / 1 ชั่วโมง / 1 วัน / กำหนดเอง (เลื่อนเลือก "ตัวเลข" ด้านหน้า + "หน่วย" ด้านหลัง)
 */
export default function ReminderRow({ minutes, expanded, onToggle, onChange, onRemove, duplicate, disabled }) {
  // โหมดกำหนดเองจำไว้ในแถว — เลือก "กำหนดเอง" แล้วค่าจะไม่เด้งกลับไปเป็นตัวเลือกสำเร็จรูปแม้ค่าบังเอิญตรงกัน
  const [mode, setMode] = useState(PRESETS.some((p) => p.minutes === minutes) ? 'preset' : 'custom');
  // ตัวเลข+หน่วยของโหมดกำหนดเองเก็บแยกไว้ในแถว (ไม่คำนวณกลับจากนาที) เพื่อให้ล้อไม่กระโดดข้ามหน่วย
  // เมื่อค่าเท่ากัน เช่น 60 นาที = 1 ชั่วโมง, 24 ชั่วโมง = 1 วัน, 0 ชั่วโมง = 0 นาที
  const [parts, setParts] = useState(() => toParts(minutes));
  const unit = unitByKey(parts.unit);

  const numberItems = Array.from({ length: unit.max + 1 }, (_, n) => ({ value: n, label: String(n) }));
  const unitItems = UNITS.map((u) => ({ value: u.key, label: u.label }));

  const applyParts = (value, unitKey) => {
    setParts({ value, unit: unitKey });
    onChange(fromParts(value, unitKey));
  };
  const changeNumber = (n) => applyParts(n, parts.unit);
  const changeUnit = (key) => applyParts(Math.min(parts.value, unitByKey(key).max), key); // ตัวเลขเปลี่ยนช่วงตามหน่วย — ถ้าเกินให้ปรับลง

  return (
    <div className={`ns-reminder ${duplicate ? 'has-error' : ''}`}>
      <button
        type="button"
        className="ns-reminder-summary"
        aria-expanded={expanded}
        onClick={onToggle}
        disabled={disabled}
      >
        <span>{describeOffset(minutes)}</span>
        <span className="ns-chevron" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
      </button>
      {duplicate && <p className="ns-error">ซ้ำกับการแจ้งเตือนอื่น — กรุณาเลือกเวลาที่ต่างกัน</p>}

      {expanded && (
        <div className="ns-reminder-body">
          <div role="radiogroup" aria-label="เลือกเวลาแจ้งเตือนล่วงหน้า">
            {PRESETS.map((p) => (
              <button
                key={p.minutes}
                type="button"
                role="radio"
                aria-checked={mode === 'preset' && minutes === p.minutes}
                className={`ns-option ${mode === 'preset' && minutes === p.minutes ? 'active' : ''}`}
                disabled={disabled}
                onClick={() => {
                  setMode('preset');
                  setParts(toParts(p.minutes));
                  onChange(p.minutes);
                }}
              >
                <span>{p.label}</span>
                <span aria-hidden="true">{mode === 'preset' && minutes === p.minutes ? '✓' : ''}</span>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'custom'}
              className={`ns-option ${mode === 'custom' ? 'active' : ''}`}
              disabled={disabled}
              onClick={() => {
                setMode('custom');
                setParts(toParts(minutes)); // เริ่มจากค่าปัจจุบัน
              }}
            >
              <span>กำหนดเอง</span>
              <span aria-hidden="true">{mode === 'custom' ? '✓' : ''}</span>
            </button>
          </div>

          {mode === 'custom' && (
            <div className="ns-custom">
              <WheelPicker
                items={numberItems}
                value={parts.value}
                onChange={changeNumber}
                ariaLabel="จำนวน"
                disabled={disabled}
              />
              <WheelPicker
                items={unitItems}
                value={parts.unit}
                onChange={changeUnit}
                ariaLabel="หน่วยเวลา"
                disabled={disabled}
              />
              <p className="ns-custom-hint">เลื่อนเพื่อเลือก (0 นาที – 4 สัปดาห์)</p>
            </div>
          )}

          <button type="button" className="ns-remove" onClick={onRemove} disabled={disabled}>
            ลบการแจ้งเตือนนี้
          </button>
        </div>
      )}
    </div>
  );
}