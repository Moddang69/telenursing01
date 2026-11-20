import ApiError from '../utils/ApiError.js';

/**
 * rateLimiter.js — จำกัดจำนวนคำขอต่อ IP แบบ Fixed Window (เก็บในหน่วยความจำของโปรเซส)
 * ใช้กับ endpoint สาธารณะที่ไม่ต้อง login (ตั้ง app.set('trust proxy') ไว้แล้ว → req.ip เป็น IP ผู้ใช้จริงหลัง Proxy)
 * หมายเหตุ: ถ้ารันหลายอินสแตนซ์ ตัวนับจะแยกกัน — ถ้าต้องการจำกัดรวม ควรย้ายไปใช้ Redis
 */
export function createRateLimiter({ windowMs = 60 * 1000, max = 30, message = 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  // ล้างรายการหมดอายุเป็นระยะ ไม่ให้ Map โตไม่จำกัด (unref: ไม่ขวางการปิดโปรเซส/เทสต์)
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
  }, windowMs);
  timer.unref?.();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new ApiError(429, message));
    }
    next();
  };
}

export default createRateLimiter;
