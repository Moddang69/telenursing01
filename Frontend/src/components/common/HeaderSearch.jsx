import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, ClipboardList, BookOpen, MessageCircle, UserCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useHeaderSearch, MIN_QUERY_LENGTH } from '../../hooks/useHeaderSearch.js';
import { SEARCH_HINTS, matchShortcuts } from '../../data/searchShortcuts.js';
import './HeaderSearch.css';

const ICON = {
  patient: User,
  appointment: Calendar,
  carePlan: ClipboardList,
  education: BookOpen,
  message: MessageCircle,
  nurse: UserCheck,
  page: ArrowRight,
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ทำตัวหนา/ไฮไลต์คำที่ตรงกับคำค้น
function Highlight({ text, tokens }) {
  if (!text || !tokens.length) return text || null;
  const re = new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'gi');
  return String(text)
    .split(re)
    .map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

/**
 * HeaderSearch — ช่องค้นหาบน Header (ผู้ป่วย / ผู้ดูแล / พยาบาล)
 * พิมพ์อย่างน้อย 2 ตัวอักษร → ค้นหาตามบทบาทและสิทธิ์ (ดู Backend/services/search.service.js) + ทางลัดไปหน้าต่างๆ
 * ใช้คีย์บอร์ดได้: ↑/↓ เลือก, Enter เปิด, Esc ปิด
 */
export default function HeaderSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const enabled = ['patient', 'caregiver', 'nurse'].includes(role);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const { groups, loading, error, searched } = useHeaderSearch(query, enabled && open);
  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  const tokens = useMemo(() => trimmed.split(/\s+/).filter(Boolean), [trimmed]);

  // ทางลัดหน้าต่างๆ (จับคู่ในเครื่อง ขึ้นก่อนผลจากเซิร์ฟเวอร์)
  const shortcuts = useMemo(() => (tooShort ? [] : matchShortcuts(role, trimmed)), [role, trimmed, tooShort]);
  const sections = useMemo(() => {
    const list = [];
    if (shortcuts.length) list.push({ key: 'pages', label: 'ไปที่หน้า', items: shortcuts });
    return [...list, ...groups];
  }, [shortcuts, groups]);
  const flat = useMemo(() => sections.flatMap((s) => s.items.map((item) => ({ ...item, sectionKey: s.key }))), [sections]);

  useEffect(() => setActive(-1), [flat.length, trimmed]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ปิดเมื่อกดนอกกล่อง
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!enabled) return null;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const go = (item) => {
    if (!item?.link) return;
    close();
    navigate(item.link);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (flat.length ? (i <= 0 ? flat.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active] || flat[0]);
    }
  };

  let flatIndex = -1;

  return (
    <div className="hs-root" ref={rootRef}>
      <button
        type="button"
        className="header-icon-btn"
        aria-label="ค้นหา"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Search size={20} />
      </button>

      {open && (
        <div className="hs-panel" role="dialog" aria-label="ค้นหา">
          <div className="hs-inputrow">
            <span aria-hidden="true"><Search size={16} /></span>
            <input
              ref={inputRef}
              className="hs-input"
              type="search"
              placeholder={role === 'nurse' ? 'ค้นหาผู้ป่วย ชื่อ หรือ HN...' : 'ค้นหาความรู้สุขภาพ แผนการดูแล นัดหมาย...'}
              value={query}
              maxLength={50}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="hs-list"
              aria-activedescendant={active >= 0 ? `hs-item-${active}` : undefined}
              aria-label="คำค้นหา"
            />
            {query && (
              <button type="button" className="hs-clear" aria-label="ล้างคำค้นหา" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                ✕
              </button>
            )}
          </div>

          <div className="hs-body" id="hs-list" role="listbox">
            {tooShort && (
              <div className="hs-hints">
                <strong>ค้นหาได้จาก</strong>
                <ul>
                  {(SEARCH_HINTS[role] || []).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className="hs-hint-foot">พิมพ์อย่างน้อย {MIN_QUERY_LENGTH} ตัวอักษร</p>
              </div>
            )}

            {!tooShort && sections.map((section) => (
              <div key={section.key} className="hs-section">
                <div className="hs-section-title">{section.label}</div>
                {section.items.map((item) => {
                  flatIndex += 1;
                  const i = flatIndex;
                  return (
                    <button
                      key={`${section.key}-${item.id}`}
                      id={`hs-item-${i}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      className={`hs-item ${i === active ? 'active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      <span className="hs-icon" aria-hidden="true">
                        {(() => {
                          const IconComponent = ICON[item.icon] || Search;
                          return <IconComponent size={16} />;
                        })()}
                      </span>
                      <span className="hs-text">
                        <span className="hs-title"><Highlight text={item.title} tokens={tokens} /></span>
                        {item.subtitle && <span className="hs-sub"><Highlight text={item.subtitle} tokens={tokens} /></span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {!tooShort && loading && <p className="hs-status">กำลังค้นหา...</p>}
            {!tooShort && !loading && error && <p className="hs-status error">{error}</p>}
            {!tooShort && !loading && !error && searched === trimmed && flat.length === 0 && (
              <p className="hs-status">ไม่พบผลลัพธ์สำหรับ “{trimmed}”</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}