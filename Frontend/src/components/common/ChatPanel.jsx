import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, ROLE_LABEL } from '../../services/chatService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './ChatPanel.css';

const PAGE_SIZE = 50;
const MAX_TEXT = 2000;
const MAX_INPUT_HEIGHT = 140; // px — ช่องพิมพ์ขยายตามข้อความได้ถึงค่านี้ แล้วเลื่อนภายใน
const TYPING_THROTTLE_MS = 2000; // ส่งสถานะ "กำลังพิมพ์" อย่างมากทุก 2 วินาที
const PEER_TYPING_TIMEOUT_MS = 3000; // ซ่อน "กำลังพิมพ์" ถ้าไม่มี event ใหม่

// รวมข้อความ: ตัดซ้ำด้วย id (กันกรณีได้ทั้งจาก socket และ REST) แล้วเรียงตามเวลา
function mergeMessages(prev, incoming) {
  const map = new Map(prev.map((m) => [m.id, m]));
  incoming.forEach((m) => {
    if (m?.id) map.set(m.id, { ...map.get(m.id), ...m });
  });
  return [...map.values()].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
}

// ข้อความนี้เป็นของเราหรือไม่ — เทียบด้วย userId (แชทกลุ่มอาจมีผู้ดูแลมากกว่า 1 คน จึงเทียบ role อย่างเดียวไม่ได้)
function isOwnMessage(m, myId, currentRole) {
  return m.senderUserId ? String(m.senderUserId) === String(myId) : m.sender === currentRole;
}

// "สมชาย ใจดี (ผู้ป่วย)" — ถ้าไม่มีชื่อแสดงเฉพาะสถานะ
function senderTitle(m) {
  const label = ROLE_LABEL[m.sender] || m.senderLabel || '';
  if (m.senderName) return label ? `${m.senderName} (${label})` : m.senderName;
  return label ? `(${label})` : '';
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

/**
 * ChatPanel — แชทกลุ่ม Realtime (Socket.io) ระหว่างผู้ป่วย / ผู้ดูแล / พยาบาล
 * แสดงชื่อและสถานะของผู้ส่งไว้เหนือข้อความ "ของคู่สนทนา" (ข้อความของตัวเองไม่แสดงชื่อ)
 * @param {string} patientId   ห้องแชท (Patient._id)
 * @param {'patient'|'nurse'|'caregiver'} currentRole  ใช้เป็นตัวสำรองตอนข้อความไม่มี senderUserId
 * @param {boolean} fullHeight ใช้เต็มความสูงหน้าจอ (หน้าแชทเฉพาะ)
 */
export default function ChatPanel({ patientId, currentRole = 'nurse', fullHeight = false }) {
  const { user } = useAuth();
  const myId = user?.id;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(true);
  const [typingName, setTypingName] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const lastTypingSentRef = useRef(0);
  const peerTypingTimerRef = useRef(null);
  const connectedOnceRef = useRef(false);

  const markRead = useCallback(() => {
    if (patientId && !document.hidden) chatService.markAsRead(patientId).catch(() => {});
  }, [patientId]);

  // โหลดข้อความล่าสุด (ใช้ทั้งตอนเปิดและตอน reconnect เพื่อดึงข้อความที่พลาดไป)
  const loadLatest = useCallback(
    async (initial = false) => {
      try {
        const history = await chatService.getThread(patientId, null, PAGE_SIZE);
        setMessages((prev) => mergeMessages(prev, history));
        if (initial) setHasMore(history.length >= PAGE_SIZE);
        setLoadError('');
        markRead();
      } catch (err) {
        if (initial) setLoadError(err?.message || 'ไม่สามารถโหลดข้อความได้');
      } finally {
        if (initial) setLoading(false);
      }
    },
    [patientId, markRead]
  );

  useEffect(() => {
    if (!patientId) return undefined;

    setMessages([]);
    setLoading(true);
    setLoadError('');
    connectedOnceRef.current = false;
    loadLatest(true);

    const unsubscribe = chatService.subscribe(patientId, {
      onMessage: (msg) => {
        setMessages((prev) => mergeMessages(prev, [msg]));
        if (!isOwnMessage(msg, myId, currentRole)) {
          setTypingName('');
          markRead();
        }
      },
      onTyping: ({ userId, name, role }) => {
        if (userId && String(userId) === String(myId)) return; // ไม่แสดงการพิมพ์ของตัวเอง (เช่น เปิดหลายแท็บ)
        setTypingName(name || ROLE_LABEL[role] || 'อีกฝ่าย');
        clearTimeout(peerTypingTimerRef.current);
        peerTypingTimerRef.current = setTimeout(() => setTypingName(''), PEER_TYPING_TIMEOUT_MS);
      },
      // มีคนอื่นอ่านแล้ว → ข้อความของเราทั้งหมดเป็น ✓✓
      onRead: ({ readerUserId }) => {
        if (readerUserId && String(readerUserId) === String(myId)) return;
        setMessages((prev) => prev.map((m) => (isOwnMessage(m, myId, currentRole) ? { ...m, read: true } : m)));
      },
      onStatus: (status) => {
        const isUp = status === 'connected';
        setConnected(isUp);
        // reconnect ครั้งหลังๆ → ดึงข้อความที่อาจพลาดช่วงหลุด
        if (isUp) {
          if (connectedOnceRef.current) loadLatest(false);
          connectedOnceRef.current = true;
        }
      },
      onError: (msg) => setLoadError(msg),
    });

    const onVisible = () => {
      if (!document.hidden) markRead();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsubscribe();
      clearTimeout(peerTypingTimerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [patientId, currentRole, myId, loadLatest, markRead]);

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่ (เฉพาะตอนผู้ใช้อยู่ท้ายสุดอยู่แล้ว ไม่กระชากตอนอ่านข้อความเก่า)
  useEffect(() => {
    if (stickToBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingName]);

  // ช่องพิมพ์ขยายความสูงตามข้อความ เพื่อให้เห็นสิ่งที่พิมพ์ครบก่อนกดส่ง
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [text]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    if (!messages.length || loadingOlder) return;
    setLoadingOlder(true);
    stickToBottomRef.current = false;
    try {
      const older = await chatService.getThread(patientId, messages[0].sentAt, PAGE_SIZE);
      setMessages((prev) => mergeMessages(prev, older));
      setHasMore(older.length >= PAGE_SIZE);
    } catch (err) {
      setLoadError(err?.message || 'ไม่สามารถโหลดข้อความเก่าได้');
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      chatService.notifyTyping(patientId);
    }
  };

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setSendError('');
    try {
      const msg = await chatService.sendMessage(patientId, value);
      if (msg) {
        stickToBottomRef.current = true;
        setMessages((prev) => mergeMessages(prev, [msg]));
      }
      setText('');
      inputRef.current?.focus();
    } catch (err) {
      // คงข้อความไว้ในช่องพิมพ์ให้กดส่งซ้ำได้
      setSendError(err?.message || 'ส่งข้อความไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่ (ไม่ส่งตอนกำลังเลือกคำจาก IME ภาษาไทย/จีน/ญี่ปุ่น)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`chat-panel ${fullHeight ? 'full' : ''}`}>
      {!connected && (
        <div className="chat-banner" role="status">
          ไม่ได้เชื่อมต่อแบบเรียลไทม์ — กำลังเชื่อมต่อใหม่ (ยังส่งข้อความได้)
        </div>
      )}
      {loadError && (
        <div className="chat-banner error" role="alert">
          {loadError}
        </div>
      )}

      <div className="chat-messages" onScroll={handleScroll}>
        {hasMore && (
          <button type="button" className="chat-load-older" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? 'กำลังโหลด...' : 'โหลดข้อความเก่า'}
          </button>
        )}

        {loading && <p className="chat-empty">กำลังโหลดข้อความ...</p>}
        {!loading && !messages.length && !loadError && (
          <p className="chat-empty">ยังไม่มีข้อความ เริ่มสนทนาได้เลย</p>
        )}

        {messages.map((m) => {
          const own = isOwnMessage(m, myId, currentRole);
          return (
            <div key={m.id} className={`chat-item ${own ? 'own' : 'other'}`}>
              {/* ชื่อ + สถานะผู้ส่ง แสดงเหนือข้อความของคู่สนทนาเท่านั้น (ไม่แสดงของตัวเอง) */}
              {!own && senderTitle(m) && <div className={`chat-sender role-${m.sender}`}>{senderTitle(m)}</div>}
              <div className="chat-bubble">
                <p>{m.text}</p>
                <span className="chat-time">
                  {m.time}
                  {own && <> {m.read ? '✓✓' : '✓'}</>}
                </span>
              </div>
            </div>
          );
        })}

        {typingName && <div className="chat-typing">{typingName} กำลังพิมพ์...</div>}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="chat-banner error" role="alert">
          {sendError}
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={1}
          placeholder="พิมพ์ข้อความ..."
          value={text}
          maxLength={MAX_TEXT}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="พิมพ์ข้อความ"
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          aria-label="ส่งข้อความ"
          title="ส่งข้อความ"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}