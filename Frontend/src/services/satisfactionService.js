import apiClient from '../config/apiClient.js';

/**
 * satisfactionService — จัดการคะแนนความพึงพอใจของผู้ป่วย
 */
export const satisfactionService = {
  /**
   * ให้คะแนนความพึงพอใจหลังวิดีโอคอลเสร็จ
   * @param {string} appointmentId - ID ของนัดหมาย
   * @param {number} rating - คะแนน 1-5
   * @param {string} comment - ข้อคิดเห็น (ไม่บังคับ)
   */
  async submitRating(appointmentId, rating, comment) {
    const res = await apiClient.post('/satisfaction-ratings', {
      appointmentId,
      rating,
      comment,
    });
    return res.data;
  },

  /**
   * ตรวจสอบว่าผู้ป่วยเคยให้คะแนนนัดหมายนี้หรือยัง
   * @param {string} appointmentId - ID ของนัดหมาย
   * @returns {Promise<boolean>} - true ถ้าเคยให้คะแนนแล้ว
   */
  async hasRated(appointmentId) {
    try {
      const res = await apiClient.get(`/satisfaction-ratings/check/${appointmentId}`);
      return res.data.hasRated;
    } catch (error) {
      return false;
    }
  },
};

export default satisfactionService;
