import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';
import HeaderSearch from './HeaderSearch.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChatUnread } from '../../hooks/useChatUnread.js';
import { useNurseConversations } from '../../hooks/useNurseConversations.js';
import './Header.css';

/**
 * Header
 * @param {string} title
 * @param {{to:string, patientId?:string, mode?:'nurse'}} [chat]
 *   ผู้ป่วย/ผู้ดูแล: ส่ง patientId (ห้องแชทกลุ่มของผู้ป่วย) — badge = ข้อความที่ยังไม่อ่านในห้องนั้น
 *   พยาบาล: ส่ง mode:'nurse' (ไม่มี patientId) — กดแล้วเข้ารายการแชทผู้ป่วยหลายคน, badge = ยังไม่อ่านรวมทุกห้อง
 *   ส่งมาเฉพาะ Layout ที่ผู้ใช้แชทได้ (ผู้ป่วย/ผู้ดูแลที่มีสิทธิ์) — ถ้าไม่ส่งจะไม่แสดงปุ่มแชท
 *   to = หน้าแชท, patientId = thread key ที่ใช้นับข้อความที่ยังไม่ได้อ่าน
 */
export default function Header({ title, chat = null }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isNurseInbox = chat?.mode === 'nurse';
  // อยู่ในหน้าแชทหรือไม่ (พยาบาลมีหน้ารายการ + ห้องแชทย่อย /nurse/chat/:patientId)
  const onChatPage = !!chat && (pathname === chat.to || (isNurseInbox && pathname.startsWith(`${chat.to}/`)));

  // เรียกทั้งสอง hook เสมอ (กฎของ Hooks) แต่แต่ละตัวทำงานเฉพาะบทบาทของตน
  const patientUnread = useChatUnread({
    patientId: isNurseInbox ? undefined : chat?.patientId,
    userId: user?.id,
    onChatPage: !isNurseInbox && onChatPage,
  });
  const { totalUnread: nurseUnread } = useNurseConversations({ enabled: isNurseInbox });
  const chatUnread = isNurseInbox ? nurseUnread : patientUnread;

  return (
    <header className="app-header">
      <h1 className="app-header-title">{title}</h1>
      <div className="app-header-actions">
        {/* ช่องค้นหาจริง (ผู้ป่วย/ผู้ดูแล/พยาบาล) — Admin ไม่แสดง */}
        <HeaderSearch />
        {chat && (
          <button
            className={`header-icon-btn ${onChatPage ? 'active' : ''}`}
            aria-label={chatUnread > 0 ? `แชท (${chatUnread} ข้อความที่ยังไม่ได้อ่าน)` : 'แชท'}
            onClick={() => navigate(chat.to)}
          >
            💬
            {chatUnread > 0 && <span className="header-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>}
          </button>
        )}
        {/* กระดิ่งแจ้งเตือนจริง (ผู้ป่วย/ผู้ดูแล/พยาบาล) — Admin ไม่แสดง */}
        <NotificationBell />
      </div>
    </header>
  );
}