import apiClient from '../config/apiClient.js';

function normalize(raw) {
  return { ...raw, id: raw.id || raw._id, createdAt: raw.createdAt };
}

export const notificationService = {
  // { items, unreadCount, hasMore }
  async list({ limit = 20, before = null } = {}) {
    const res = await apiClient.get('/notifications', { params: { limit, before } });
    return {
      items: (res.data?.items || []).map(normalize),
      unreadCount: res.data?.unreadCount || 0,
      hasMore: !!res.data?.hasMore,
    };
  },

  async markRead(id) {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data?.unreadCount;
  },

  async markAllRead() {
    await apiClient.patch('/notifications/read-all');
  },

  // { videoCall: { enabled, reminders: [นาที,...] } }
  async getSettings() {
    const res = await apiClient.get('/notifications/settings');
    return res.data;
  },

  async saveSettings(videoCall) {
    const res = await apiClient.put('/notifications/settings', { videoCall });
    return res.data;
  },
};

export default notificationService;