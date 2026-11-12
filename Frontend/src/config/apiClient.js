import axios from 'axios';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

export const TOKEN_KEY = 'telenursing_token';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// =========================================================
// Request Interceptor
// แนบ JWT Token ทุกครั้งที่เรียก Backend
// =========================================================
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =========================================================
// Response Interceptor
// =========================================================
apiClient.interceptors.response.use(
  (response) => response.data,

  (error) => {
    const status = error.response?.status;

    const message =
      error.response?.data?.message ||
      'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('telenursing_session');

      window.dispatchEvent(
        new CustomEvent('session-expired')
      );
    }

    return Promise.reject({
      status,
      message,
      details: error.response?.data?.details || null,
    });
  }
);

export default apiClient;