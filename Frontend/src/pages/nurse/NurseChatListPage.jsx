import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNurseConversations } from '../../hooks/useNurseConversations.js';
import { ROUTES } from '../../constants/routes.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './NurseChatPage.css';

const ROLE_LABEL = { patient: 'ผู้ป่วย', caregiver: 'ผู้ดูแล', nurse: 'พยาบาล' };

// วันนี้แสดงเวลา, วันอื่นแสดงวันที่
function formatTime(value) {
  const d = new Date(value);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

/**
 * NurseChatListPage — รายการห้องแชทของผู้ป่วยหลายคนที่เคยสนทนาด้วย (เปิดจากปุ่มแชทบน Header)
 * เรียงตามข้อความล่าสุด แสดงจำนวนที่ยังไม่อ่านรายห้อง กดเข้าไปส่งข้อความได้
 */
export default function NurseChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading, error, refresh } = useNurseConversations({ enabled: true });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <div className="nurse-chat-list">
      <h2>แชทผู้ป่วย</h2>

      {conversations.length === 0 ? (
        <EmptyState icon="💬" title="ยังไม่มีการสนทนากับผู้ป่วย" />
      ) : (
        <div className="nurse-chat-rows">
          {conversations.map((c) => {
            const mine = String(c.lastMessage.senderUserId) === String(user?.id);
            const who = mine ? 'คุณ' : c.lastMessage.senderName || ROLE_LABEL[c.lastMessage.senderRole] || '';
            return (
              <button
                key={c.patientId}
                type="button"
                className={`nurse-chat-row ${c.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => navigate(`${ROUTES.NURSE_CHAT}/${c.patientId}`)}
              >
                <span className="nurse-chat-avatar" aria-hidden="true">
                  {(c.patientName || '?').charAt(0)}
                </span>
                <span className="nurse-chat-main">
                  <span className="nurse-chat-name">{c.patientName}</span>
                  <span className="nurse-chat-preview">
                    {who ? `${who}: ` : ''}
                    {c.lastMessage.text}
                  </span>
                </span>
                <span className="nurse-chat-meta">
                  <span className="nurse-chat-time">{formatTime(c.lastMessage.sentAt)}</span>
                  {c.unreadCount > 0 && (
                    <span className="nurse-chat-badge" aria-label={`${c.unreadCount} ข้อความที่ยังไม่ได้อ่าน`}>
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}