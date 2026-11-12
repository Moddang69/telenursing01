import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationService } from '../../services/notificationService.js';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import ReminderRow from '../../components/notification/ReminderRow.jsx';
import { MAX_REMINDERS, DEFAULT_REMINDERS, nextFreeOffset, summarize } from '../../utils/reminderOffsets.js';
import '../../components/notification/NotificationSettings.css';

let rowId = 0;
const toRows = (minutes) => minutes.map((m) => ({ id: ++rowId, minutes: m }));

function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`ns-switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}

// ---------- หน้าที่ 1: การแจ้งเตือน ----------
function NotificationMenu({ basePath }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const push = usePushNotifications({ enabled: true });
  const [summary, setSummary] = useState('');

  useEffect(() => {
    notificationService
      .getSettings()
      .then((s) => setSummary(summarize(s.videoCall)))
      .catch(() => setSummary(''));
  }, []);

  return (
    <>
      <section className="ns-card">
        <div className="ns-row">
          <div>
            <strong>แจ้งเตือนบนอุปกรณ์นี้</strong>
            <p className="ns-sub">แสดงการแจ้งเตือนที่หน้าจอแม้ไม่ได้เปิดเว็บ</p>
          </div>
          <Switch
            on={push.subscribed}
            label="แจ้งเตือนบนอุปกรณ์นี้"
            disabled={!push.supported || push.busy || push.permission === 'denied'}
            onChange={(on) => (on ? push.enable() : push.disable())}
          />
        </div>
        {!push.supported && <p className="ns-hint">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push (บน iPhone/iPad ต้องเพิ่มเว็บไว้ที่หน้าจอโฮมก่อน)</p>}
        {push.supported && push.permission === 'denied' && (
          <p className="ns-hint">การแจ้งเตือนถูกบล็อกในเบราว์เซอร์ — เปิดสิทธิ์ได้ที่การตั้งค่าเว็บไซต์ แล้วกลับมาเปิดอีกครั้ง</p>
        )}
        {push.error && <p className="ns-error">{push.error}</p>}
      </section>

      <section className="ns-card">
        <button type="button" className="ns-menu-row" onClick={() => navigate(`${basePath}/video-call`)}>
          <span className="ns-menu-text">
            <strong>การแจ้งเตือนก่อนการวิดีโอคอล</strong>
            {summary && <span className="ns-sub">{summary}</span>}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </section>


    </>
  );
}

// ---------- หน้าที่ 2: การแจ้งเตือน > การแจ้งเตือนก่อนการวิดีโอคอล ----------
function VideoCallSettings() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState(() => toRows(DEFAULT_REMINDERS));
  const [expandedId, setExpandedId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error | invalid
  const [saveError, setSaveError] = useState('');
  const skipNextSave = useRef(true); // ไม่บันทึกตอนโหลดค่าครั้งแรก

  useEffect(() => {
    notificationService
      .getSettings()
      .then((s) => {
        setEnabled(s.videoCall.enabled);
        setRows(toRows(s.videoCall.reminders));
        setLoaded(true);
      })
      .catch((err) => setLoadError(err?.message || 'ไม่สามารถโหลดการตั้งค่าได้'));
  }, []);

  const minutesList = rows.map((r) => r.minutes);
  const hasDuplicate = new Set(minutesList).size !== minutesList.length;

  // บันทึกอัตโนมัติ (หน่วง 0.5 วินาทีหลังแก้ไข) — ถ้ามีค่าซ้ำจะยังไม่บันทึก
  useEffect(() => {
    if (!loaded) return undefined;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    if (hasDuplicate) {
      setStatus('invalid');
      return undefined;
    }
    setStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await notificationService.saveSettings({ enabled, reminders: minutesList });
        setStatus('saved');
        setSaveError('');
      } catch (err) {
        setStatus('error');
        setSaveError(err?.message || 'บันทึกไม่สำเร็จ');
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rows, loaded]);

  const updateRow = (id, minutes) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, minutes } : r)));
  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setExpandedId(null);
  };
  const addRow = () => {
    const created = { id: ++rowId, minutes: nextFreeOffset(minutesList) };
    setRows((prev) => [...prev, created]);
    setExpandedId(created.id);
  };

  if (loadError) return <div className="alert-error" role="alert">{loadError}</div>;
  if (!loaded) return <p className="ns-sub">กำลังโหลด...</p>;

  const statusText = {
    saving: 'กำลังบันทึก...',
    saved: 'บันทึกแล้ว',
    error: saveError || 'บันทึกไม่สำเร็จ',
    invalid: 'ยังไม่ได้บันทึก — มีเวลาแจ้งเตือนซ้ำกัน',
    idle: '',
  }[status];

  return (
    <>
      <section className="ns-card">
        <div className="ns-row">
          <div>
            <strong>แจ้งเตือนก่อนการวิดีโอคอล</strong>
            <p className="ns-sub">{enabled ? 'เปิดอยู่' : 'ปิดอยู่'}</p>
          </div>
          <Switch on={enabled} label="เปิด/ปิดการแจ้งเตือนก่อนการวิดีโอคอล" onChange={setEnabled} />
        </div>
      </section>

      <section className={`ns-card ${enabled ? '' : 'ns-dim'}`}>
        <strong>ตั้งค่าการแจ้งเตือนล่วงหน้า</strong>

        {rows.length === 0 && <p className="ns-hint">ยังไม่ได้ตั้งการแจ้งเตือนล่วงหน้า</p>}
        {rows.map((r) => (
          <ReminderRow
            key={r.id}
            minutes={r.minutes}
            expanded={expandedId === r.id}
            disabled={!enabled}
            duplicate={minutesList.filter((m) => m === r.minutes).length > 1}
            onToggle={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
            onChange={(m) => updateRow(r.id, m)}
            onRemove={() => removeRow(r.id)}
          />
        ))}

        {rows.length < MAX_REMINDERS && (
          <button type="button" className="ns-add" onClick={addRow} disabled={!enabled}>
            + เพิ่มการแจ้งเตือน
          </button>
        )}
        {rows.length >= MAX_REMINDERS && <p className="ns-hint">ตั้งการแจ้งเตือนครบ {MAX_REMINDERS} ครั้งแล้ว</p>}
      </section>

      <p className={`ns-status ${status}`} role="status" aria-live="polite">{statusText}</p>
    </>
  );
}

/**
 * NotificationSettingsPage — การแจ้งเตือน > การแจ้งเตือนก่อนการวิดีโอคอล (ใช้ร่วมกันทุกบทบาท)
 * @param {string} basePath     path ของหน้านี้ (เช่น /patient/profile/notifications)
 * @param {string} profilePath  path หน้าโปรไฟล์ (ปุ่มกลับจากหน้าแรกของการตั้งค่า)
 */
export default function NotificationSettingsPage({ basePath, profilePath }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = pathname.slice(basePath.length).replace(/^\/+|\/+$/g, '');
  const inVideoCall = section === 'video-call';

  return (
    <div className="ns-page">
      <div className="ns-header">
        <button
          type="button"
          className="ns-back"
          aria-label="ย้อนกลับ"
          onClick={() => navigate(inVideoCall ? basePath : profilePath)}
        >
          ←
        </button>
        <nav className="ns-crumbs" aria-label="เส้นทาง">
          {inVideoCall ? (
            <>
              <button type="button" className="ns-crumb-link" onClick={() => navigate(basePath)}>การแจ้งเตือน</button>
              <span aria-hidden="true"> › </span>
              <strong>การแจ้งเตือนก่อนการวิดีโอคอล</strong>
            </>
          ) : (
            <strong>การแจ้งเตือน</strong>
          )}
        </nav>
      </div>

      {inVideoCall ? <VideoCallSettings /> : <NotificationMenu basePath={basePath} />}
    </div>
  );
}