import asyncHandler from '../utils/asyncHandler.js';
import { search } from '../services/search.service.js';

/**
 * GET /api/search?q=<คำค้น>
 * ค้นหาตามบทบาทและสิทธิ์ของผู้ใช้ที่ล็อกอิน (ดู search.service.js)
 */
export const searchAll = asyncHandler(async (req, res) => {
  const data = await search(req.user, req.query.q);
  res.status(200).json({ success: true, data });
});

export default { searchAll };