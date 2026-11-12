// src/components/common/EmptyState.jsx
import React from 'react';
import './States.css';

export default function EmptyState({ icon = '📋', title, description, action }) {
  return (
    <div className="ui-state-box">
      <div className="ui-state-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}