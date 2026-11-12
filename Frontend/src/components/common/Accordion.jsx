import React, { useState } from 'react';
import './Accordion.css';

export function Accordion({ items }) {
  return (
    <div className="accordion">
      {items.map((item, idx) => (
        <AccordionItem key={idx} title={item.title} defaultOpen={item.defaultOpen}>
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
}

function AccordionItem({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `accordion-content-${title.replace(/\s+/g, '-')}`;

  return (
    <div className="accordion-item">
      <button
        type="button"
        className="accordion-header"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`accordion-icon ${open ? 'open' : ''}`} aria-hidden="true">
          ▶
        </span>
        <span className="accordion-title">{title}</span>
      </button>
      {open && (
        <div id={contentId} className="accordion-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default Accordion;