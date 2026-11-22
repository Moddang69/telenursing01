import React from 'react';
import './SlashIcon.css';

/**
 * SlashIcon — อิโมจิ (📷 / 🎙️) ที่มี "ขีดทับ" สีแดงเมื่ออุปกรณ์นั้นปิดอยู่ (off = true)
 * ใช้ทั้งปุ่มควบคุมและป้ายสถานะบนวิดีโอ (ผู้ป่วยและพยาบาล)
 */
export default function SlashIcon({ icon, off = false }) {
  return (
    <span className={`slash-icon ${off ? 'is-off' : ''}`} aria-hidden="true">
      {icon}
    </span>
  );
}
