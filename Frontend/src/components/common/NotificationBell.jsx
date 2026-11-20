import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Clock, XCircle, ClipboardList, BookOpen, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { useNotifications } from '../../hooks/useNotifications.js';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import './NotificationBell.css';

const ICON = {
  APPOINTMENT_CREATED: Calendar,
  APPOINTMENT_REMINDER: Clock,
  APPOINTMENT_CANCELLED: XCircle,
  CARE_PLAN_NEW: ClipboardList,
  EDUCATION_NEW: BookOpen,
  HEALTH_ABNORMAL: AlertTriangle,
};

// "เมื่อสักครู่", "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว", "เมื่อวาน", หรือวันที่
function timeAgo(value) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'เมื่อวาน';
  if (day < 7) return `${day} วันที่แล้ว`;
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

/**
 * NotificationBell — กระดิ่งแจ้งเตือนบน Header (ผู้ป่วย / ผู้ดูแล / พยาบาล)
 * กดเปิดรายการ → กดการแจ้งเตือนเพื่อไปหน้าที่เกี่ยวข้อง (link ที่ Backend กำหนดตามบทบาทของผู้รับ)
 * แสดง toast เมื่อมีการแจ้งเตือนใหม่ขณะเปิดเว็บ ส่วนตอนไม่ได้เปิดเว็บใช้ Web Push (service worker)
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const enabled = ['patient', 'caregiver', 'nurse'].includes(user?.role);

  const { items, unreadCount, hasMore, loading, error, loadMore, markRead, markAllRead } = useNotifications({
    enabled,
    onIncoming: (n) => showToast(`${n.title}: ${n.body}`, 'info', 7000),
  });
  const push = usePushNotifications({ enabled });

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // ปิดเมื่อกดนอกกล่อง หรือกด Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // กดการแจ้งเตือนของระบบ (Web Push) ขณะแท็บเปิดอยู่เบื้องหลัง → service worker ส่งข้อความมาให้พาไปหน้าที่เกี่ยวข้อง
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return undefined;
    const onMessage = (e) => {
      if (e.data?.type === 'notification-click' && typeof e.data.url === 'string' && e.data.url.startsWith('/')) {
        navigate(e.data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [enabled, navigate]);

  if (!enabled) return null;

  const handleItemClick = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const badge = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className="header-icon-btn"
        aria-label={unreadCount > 0 ? `การแจ้งเตือน (${unreadCount} ใหม่)` : 'การแจ้งเตือน'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="header-badge">{badge}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="การแจ้งเตือน">
          <div className="notif-panel-head">
            <strong>การแจ้งเตือน</strong>
            <button type="button" className="notif-link-btn" onClick={markAllRead} disabled={unreadCount === 0}>
              อ่านทั้งหมด
            </button>
          </div>

          {push.supported && push.permission === 'default' && !push.subscribed && (
            <div className="notif-push-banner">
              <span>รับการแจ้งเตือนบนอุปกรณ์นี้แม้ไม่ได้เปิดเว็บ</span>
              <button type="button" className="notif-push-btn" onClick={push.enable} disabled={push.busy}>
                {push.busy ? '...' : 'เปิด'}
              </button>
            </div>
          )}
          {push.error && <div className="notif-error">{push.error}</div>}

          <div className="notif-list">
            {loading && <p className="notif-empty">กำลังโหลด...</p>}
            {!loading && error && <p className="notif-empty">{error}</p>}
            {!loading && !error && items.length === 0 && <p className="notif-empty">ยังไม่มีการแจ้งเตือน</p>}

            {items.map((n) => {
              const IconComponent = ICON[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <span className="notif-icon" aria-hidden="true">
                    <IconComponent size={18} />
                  </span>
                  <span className="notif-text">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-body">{n.body}</span>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="notif-dot" aria-label="ยังไม่ได้อ่าน" />}
                </button>
              );
            })}

            {hasMore && (
              <button type="button" className="notif-more" onClick={loadMore}>
                โหลดเพิ่ม
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}