import React from 'react';
import { getPasswordStrength } from '../../utils/validators.js';
import './PasswordStrengthMeter.css';

const LABELS = ['อ่อนมาก', 'อ่อน', 'พอใช้', 'ดี', 'แข็งแรง'];
const COLORS = ['#c62828', '#d4650a', '#b8860b', '#2e7d5b', '#1f5c42'];

export default function PasswordStrengthMeter({ password }) {
  const score = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="strength-bar"
            style={{ background: i < score ? COLORS[score] : '#e0e0e0' }}
          />
        ))}
      </div>
      <span className="strength-label" style={{ color: COLORS[score] }}>
        ความปลอดภัย: {LABELS[score]}
      </span>
    </div>
  );
}