// src/components/common/EmptyState.jsx
import React from 'react';
import { ClipboardList } from 'lucide-react';
import './States.css';

export default function EmptyState({ icon: Icon = ClipboardList, title, description, action }) {
  return (
    <div className="ui-state-box">
      <div className="ui-state-icon" aria-hidden="true">
        {typeof Icon === 'string' 
          ? Icon 
          : React.isValidElement(Icon) 
            ? Icon 
            : <Icon size={48} />}
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}