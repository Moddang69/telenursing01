import apiClient from '../config/apiClient.js';
import { TOKEN_KEY } from '../config/apiClient.js';

const SESSION_KEY = 'telenursing_session';

const getError = (error) => {
  if (error?.message) {
    return new Error(error.message);
  }

  return new Error(
    'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  );
};

async function enrichUser(user) {
  if (!user || !user.roleRefId) return user;

  try {
    let profile = null;

    if (user.role === 'patient') {
      const res = await apiClient.get(`/patients/${user.roleRefId}`);
      profile = res.data;
    } else if (user.role === 'nurse') {
      const res = await apiClient.get(`/nurses/${user.roleRefId}`);
      profile = res.data;
    } else if (user.role === 'caregiver') {
      const res = await apiClient.get(`/caregivers/${user.roleRefId}`);
      profile = res.data;
    }

    if (!profile) {
      return { ...user, id: user.userId };
    }

    return {
      ...user,
      ...profile,
      id: user.userId, // 🔧 alias ให้ตรงกับที่หน้าเพจส่วนใหญ่คาดหวัง (user.id)
      role: user.role, // กันไม่ให้ profile.role (ถ้ามี) ทับ role จริงจาก token
      roleRefId: user.roleRefId,
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
    };
  } catch (err) {
    // ดึงโปรไฟล์ไม่สำเร็จ ยังคง login ได้ปกติ แค่ field เสริมจะไม่มี
    console.error('enrichUser failed: - authService.js:47', err);
    return { ...user, id: user.userId };
  }
}

export const authService = {

  // =========================================================
  // LOGIN
  // =========================================================
  async login({ email, password }) {
    try {
      const response = await apiClient.post(
        '/auth/login',
        {
          email,
          password,
        }
      );

      const data = response?.data || response;

      let user = data?.user;
      const token = data?.token;

      if (!user || !token) {
        throw new Error(
          'เซิร์ฟเวอร์ไม่ส่งข้อมูลบัญชีหรือ Token กลับมา'
        );
      }

      localStorage.setItem(
        TOKEN_KEY,
        token
      );

      user = await enrichUser(user);

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(user)
      );

      return user;

    } catch (error) {
      throw getError(error);
    }
  },


  // =========================================================
  // LOGOUT
  // =========================================================
  async logout() {
    try {

      if (localStorage.getItem(TOKEN_KEY)) {
        await apiClient.post('/auth/logout');
      }

    } catch (_) {

      // แม้ Backend logout ล้มเหลว
      // ก็ยังต้องล้าง session ฝั่ง browser

    } finally {

      localStorage.removeItem(
        SESSION_KEY
      );

      localStorage.removeItem(
        TOKEN_KEY
      );
    }

    return true;
  },


  // =========================================================
  // RESTORE SESSION
  // ตรวจ Token กับ Backend จริง
  // =========================================================
  async restoreSession() {

    const token =
      localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return null;
    }

    try {

      const response =
        await apiClient.get(
          '/auth/restore-session'
        );

      let user =
        response?.data || response;

      if (!user) {
        return null;
      }

      user = await enrichUser(user);

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(user)
      );

      return user;

    } catch (error) {

      localStorage.removeItem(
        SESSION_KEY
      );

      localStorage.removeItem(
        TOKEN_KEY
      );

      if (error?.status !== 401) {
        console.error(
          'Failed to restore session:',
          error
        );
      }

      return null;
    }
  },


  // =========================================================
  // REQUEST OTP
  // =========================================================
  async requestOtp(
    email,
    purpose = 'REGISTER'
  ) {

    try {

      const response =
        await apiClient.post(
          '/auth/otp/request',
          {
            email,
            purpose,
          }
        );

      return response?.data || response;

    } catch (error) {
      throw getError(error);
    }
  },


  // =========================================================
  // VERIFY OTP
  // =========================================================
  async verifyOtp(
    email,
    otp,
    purpose = 'REGISTER'
  ) {

    try {

      const response =
        await apiClient.post(
          '/auth/otp/verify',
          {
            email,
            purpose,
            otp,
          }
        );

      return response?.data || response;

    } catch (error) {
      throw getError(error);
    }
  },


  // =========================================================
  // RESET PASSWORD
  // =========================================================
  async resetPassword(
    email,
    password
  ) {

    try {

      const response =
        await apiClient.post(
          '/auth/reset-password',
          {
            email,
            password,
          }
        );

      return response?.data || response;

    } catch (error) {
      throw getError(error);
    }
  },

  async register(payload) {
    const { email, password, role, profile, consent, ...rest } = payload;
    const finalProfile = profile || rest;

    const res = await apiClient.post('/auth/register', {
      email,
      password,
      role,
      profile: finalProfile,
      consent: consent || null, // { accepted: true, version } → backend สร้าง record ใน consents
    });
    return res.data;
  },
};