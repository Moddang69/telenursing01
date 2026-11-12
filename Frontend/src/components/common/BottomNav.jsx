import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

/**
 * BottomNav — ใช้ร่วมกันระหว่าง Patient / Caregiver
 * @param {Array<{to:string, label:string, icon:string}>} items
 */
export default function BottomNav({ items }) {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}