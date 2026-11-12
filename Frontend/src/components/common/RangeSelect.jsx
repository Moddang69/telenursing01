import React from 'react';
import StatusBadge from './StatusBadge.jsx';
import './RangeSelect.css';

/**
 * RangeSelect — เลือก "ช่วงค่า" แทนการพิมพ์ตัวเลข
 * ใช้กับ น้ำตาลในเลือด / ความดันโลหิต (Systolic, Diastolic) / ชีพจร / HbA1c / LDL
 *
 * props:
 *  - id, label        ชื่อกลุ่มตัวเลือก
 *  - options          รายการช่วง (จาก HEALTH_RANGES[metric])
 *  - unit             หน่วยที่แสดงต่อท้ายช่วง
 *  - value            key ที่เลือกอยู่
 *  - onChange(key)    เรียกเมื่อเลือกช่วง
 *  - error            ข้อความ error
 *  - optional         true = ไม่บังคับ (มีปุ่มล้างตัวเลือก)
 */
export default function RangeSelect({ id, label, options, unit, value, onChange, error, optional = false }) {
  return (
    <fieldset className={`range-select ${error ? 'range-select-error' : ''}`} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="form-label">
        {label}
        {optional && <span className="range-select-optional"> (ถ้ามี)</span>}
      </legend>

      <div className="range-select-list" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const checked = value === opt.key;
          return (
            <label
              key={opt.key}
              className={`range-option range-option-${opt.severity.toLowerCase()} ${checked ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name={id}
                value={opt.key}
                checked={checked}
                onChange={() => onChange(opt.key)}
              />
              <span className="range-option-body">
                <span className="range-option-head">
                  <strong className="range-option-value">
                    {opt.short} <span className="range-option-unit">{unit}</span>
                  </strong>
                  <StatusBadge status={opt.severity} />
                </span>
                <span className="range-option-meaning">{opt.meaning}</span>
              </span>
            </label>
          );
        })}
      </div>

      {optional && value && (
        <button type="button" className="range-select-clear" onClick={() => onChange('')}>
          ล้างตัวเลือก
        </button>
      )}

      {error && (
        <span id={`${id}-error`} className="form-error-message" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}
