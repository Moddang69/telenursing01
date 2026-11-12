import apiClient from '../config/apiClient.js';
import { getSocket } from '../config/socketClient.js';

const SEND_TIMEOUT_MS = 8000;

// นับจำนวน subscriber ต่อห้อง — Header (badge) กับ ChatPanel ใช้ห้องเดียวกันบน socket ตัวเดียว
// จึงต้องออกจากห้อง (leave-chat) เมื่อไม่เหลือผู้ใช้แล้วเท่านั้น ไม่งั้นตัวหนึ่ง unmount แล้วอีกตัวจะไม่ได้รับข้อความ
const roomRefs = new Map();
const retainRoom = (id) => roomRefs.set(String(id), (roomRefs.get(String(id)) || 0) + 1);
const releaseRoom = (id) => {
  const next = (roomRefs.get(String(id)) || 1) - 1;
  if (next <= 0) {
    roomRefs.delete(String(id));
    return true; // ไม่เหลือผู้ใช้ห้องนี้แล้ว
  }
  roomRefs.set(String(id), next);
  return false;
};

// แจ้ง UI อื่น (เช่น badge บน Header) ว่าอ่านข้อความแล้ว
const emitRead = (patientId) =>
  window.dispatchEvent(new CustomEvent('chat:read', { detail: { patientId: String(patientId) } }));

// ป้ายสถานะของผู้ส่งในแชทกลุ่ม
export const ROLE_LABEL = { patient: 'ผู้ป่วย', nurse: 'พยาบาล', caregiver: 'ผู้ดูแล' };

function normalizeMessage(raw) {
  if (!raw) return raw;
  const sentAt = raw.sentAt ? new Date(raw.sentAt) : null;
  return {
    ...raw,
    id: raw.id || raw._id,
    sender: raw.senderRole,
    senderName: raw.senderName || '',
    senderLabel: ROLE_LABEL[raw.senderRole] || '',
    time: sentAt
      ? sentAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '',
    read: !!raw.read,
  };
}

export const chatService = {
  async getThread(patientId, before = null, limit = 50) {
    const res = await apiClient.get(`/chat/${patientId}`, { params: { before, limit } });
    return (res.data || []).map(normalizeMessage);
  },

  async getMessageHistory(patientId, before = null, limit = 50) {
    return this.getThread(patientId, before, limit);
  },

  // อ่านข้อความแล้ว — ใช้ socket ถ้าเชื่อมอยู่ (ให้ผู้ส่งเห็น ✓✓ ทันที) ไม่งั้นใช้ REST
  async markAsRead(patientId) {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('mark-read', { patientId });
      emitRead(patientId);
      return null;
    }
    const res = await apiClient.patch(`/chat/${patientId}/read`);
    emitRead(patientId);
    return res.data;
  },

  // (พยาบาล) รายการห้องแชทของผู้ป่วยที่เคยสนทนา + ข้อความล่าสุด + จำนวนที่ยังไม่อ่าน → { conversations, totalUnread }
  async getConversations() {
    const res = await apiClient.get('/chat/conversations');
    return {
      conversations: res.data?.conversations || [],
      totalUnread: res.data?.totalUnread || 0,
    };
  },

  // (พยาบาล) ขอให้ server พาเข้าห้องแชทของผู้ป่วยทุกคนใน Care Team (เรียกซ้ำได้ ไม่เสียหาย)
  refreshInboxRooms() {
    const socket = getSocket();
    if (socket?.connected) socket.emit('join-my-chats');
  },

  /**
   * (พยาบาล) สมัครรับ "ทุกห้องแชท" — ใช้กับรายการแชท/badge ที่ Header
   * handlers: { onMessage(msg), onStatus('connected'|'disconnected') } → คืนฟังก์ชัน unsubscribe
   * join-my-chats ทุกครั้งที่ต่อ/ต่อใหม่ ห้องฝั่ง server ถูก pin ไว้ (leave-chat จากหน้าห้องแชทไม่ทำให้หลุด)
   */
  subscribeInbox(handlers = {}) {
    let socket = null;
    let stopped = false;
    let waitTimer = null;

    const onConnect = () => {
      handlers.onStatus?.('connected');
      socket.emit('join-my-chats');
    };
    const onDisconnect = () => handlers.onStatus?.('disconnected');
    const onNew = (raw) => handlers.onMessage?.(normalizeMessage(raw));

    const attach = () => {
      socket = getSocket();
      if (!socket) return false;
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('new-message', onNew);
      if (socket.connected) onConnect();
      else onDisconnect();
      return true;
    };

    if (!attach()) {
      handlers.onStatus?.('disconnected');
      waitTimer = setInterval(() => {
        if (stopped) return;
        if (attach()) {
          clearInterval(waitTimer);
          waitTimer = null;
        }
      }, 500);
    }

    return () => {
      stopped = true;
      if (waitTimer) clearInterval(waitTimer);
      if (!socket) return;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new-message', onNew);
    };
  },

  // จำนวนข้อความที่ยังไม่ได้อ่านของผู้ใช้ปัจจุบันใน thread นี้
  async getUnreadCount(patientId) {
    const res = await apiClient.get(`/chat/${patientId}/unread-count`);
    return res.data?.count || 0;
  },

  /**
   * สมัครรับแชท Realtime ของ patientId — คืนฟังก์ชัน unsubscribe
   *  - join ห้องอัตโนมัติ และ join ใหม่ทุกครั้งที่ socket reconnect (Room ฝั่ง server หายเมื่อหลุด)
   *  - รอ socket ถ้ายังไม่ถูกสร้าง (เช่น เปิดหน้าเร็วกว่า login เสร็จ)
   * handlers: { onMessage, onTyping, onRead, onStatus('connected'|'disconnected'), onError }
   */
  subscribe(patientId, handlers = {}) {
    let socket = null;
    let stopped = false;
    let waitTimer = null;
    retainRoom(patientId);

    const samePatient = (id) => String(id) === String(patientId);

    const join = () => {
      socket.emit('join-chat', { patientId }, (res) => {
        if (res && res.ok === false) handlers.onError?.(res.message || 'เข้าร่วมแชทไม่สำเร็จ');
      });
    };
    const onConnect = () => {
      handlers.onStatus?.('connected');
      join();
    };
    const onDisconnect = () => handlers.onStatus?.('disconnected');
    const onNew = (raw) => {
      if (samePatient(raw?.patientId)) handlers.onMessage?.(normalizeMessage(raw));
    };
    const onTyping = (p) => {
      if (samePatient(p?.patientId)) handlers.onTyping?.(p);
    };
    const onRead = (p) => {
      if (samePatient(p?.patientId)) handlers.onRead?.(p);
    };
    const onChatError = (e) => handlers.onError?.(e?.message || 'เกิดข้อผิดพลาดในแชท');

    const attach = () => {
      socket = getSocket();
      if (!socket) return false;
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('new-message', onNew);
      socket.on('peer-typing', onTyping);
      socket.on('messages-read', onRead);
      socket.on('chat-error', onChatError);
      if (socket.connected) onConnect();
      else onDisconnect();
      return true;
    };

    if (!attach()) {
      handlers.onStatus?.('disconnected');
      waitTimer = setInterval(() => {
        if (stopped) return;
        if (attach()) {
          clearInterval(waitTimer);
          waitTimer = null;
        }
      }, 500);
    }

    return () => {
      stopped = true;
      if (waitTimer) clearInterval(waitTimer);
      const lastUser = releaseRoom(patientId);
      if (!socket) return;
      if (lastUser) socket.emit('leave-chat', { patientId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new-message', onNew);
      socket.off('peer-typing', onTyping);
      socket.off('messages-read', onRead);
      socket.off('chat-error', onChatError);
    };
  },

  /**
   * ส่งข้อความ — คืน Promise<message>
   *  - asUserId = id ของผู้ใช้ที่หน้าจอนี้ล็อกอินอยู่ ให้ Backend เทียบกับบัญชีของ Token/Socket กันส่งในนามบัญชีอื่น
   *  - socket เชื่อมอยู่: ส่งผ่าน socket รอ ack จาก server (ถ้า server ปฏิเสธจะ throw พร้อมเหตุผล)
   *  - socket ไม่เชื่อม: ส่งผ่าน REST (server จะ broadcast เข้าห้อง Realtime ให้อีกฝั่งเอง)
   */
  async sendMessage(patientId, payload, asUserId = null) {
    const text = (typeof payload === 'string' ? payload : payload?.text || '').trim();
    if (!text) return null;

    const socket = getSocket();
    if (socket?.connected) {
      let res;
      try {
        res = await socket.timeout(SEND_TIMEOUT_MS).emitWithAck('chat-message', { patientId, text, asUserId });
      } catch (_) {
        // ไม่ตอบทันเวลา — ไม่ส่งซ้ำผ่าน REST เพราะข้อความอาจถูกบันทึกไปแล้ว (กันข้อความซ้ำ)
        throw new Error('ส่งข้อความไม่สำเร็จ (หมดเวลา) กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่');
      }
      if (!res?.ok) throw new Error(res?.message || 'ส่งข้อความไม่สำเร็จ');
      return normalizeMessage(res.message);
    }

    const res = await apiClient.post(`/chat/${patientId}`, { text, asUserId });
    return normalizeMessage(res.data);
  },

  notifyTyping(patientId) {
    getSocket()?.emit('typing', { patientId });
  },

  // ---- เมธอดเดิม (คงไว้เพื่อความเข้ากันได้) ----
  joinChatRoom(patientId) {
    getSocket()?.emit('join-chat', { patientId });
  },
  onNewMessage(cb) {
    getSocket()?.on('new-message', (raw) => cb(normalizeMessage(raw)));
  },
  onPeerTyping(cb) {
    getSocket()?.on('peer-typing', cb);
  },
  removeChatListeners() {
    const socket = getSocket();
    if (!socket) return;
    socket.off('new-message');
    socket.off('peer-typing');
  },
};

export default chatService;