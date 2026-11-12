import apiClient from '../config/apiClient.js';

export const searchService = {
  // → { query, groups: [{ key, label, items: [{ id, icon, title, subtitle, link }] }], total }
  async search(q) {
    const res = await apiClient.get('/search', { params: { q } });
    return res.data;
  },
};

export default searchService;