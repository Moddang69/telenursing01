import * as models from '../models/index.js';
import { env } from '../config/env.js';
import { getEffectiveRules } from '../constants/retention.js';

/**
 * dataRetention.service.js — ลบข้อมูลที่เกินอายุการเก็บตามนโยบายใน constants/retention.js
 *
 * - ประเภทที่เก็บถาวร (PERMANENT_MODELS) ไม่อยู่ในกฎ จึงไม่ถูกแตะต้องเลย; Otp ใช้ TTL Index ของ MongoDB ใน models/Otp.js
 * - ใช้ deleteMany ตามฟิลด์วันที่ของแต่ละโมเดล จึงรันซ้ำได้อย่างปลอดภัย (idempotent) และเปลี่ยนจำนวนวันได้ทันทีโดยไม่ต้องแก้ index
 * - AuditLog เป็น Insert-Only ในแอป (กัน deleteOne/findOneAndUpdate ที่ระดับ Model) — การลบตามอายุนี้เป็นข้อยกเว้นที่ตั้งใจ
 *   ผ่าน deleteMany เท่านั้น และไม่เขียน AuditLog ของการลบนี้ (ต้องมี userId) จึงบันทึกสรุปลง console แทน
 * - รันใน process เดียวกับเซิร์ฟเวอร์เหมือน notificationScheduler (ถ้าขยายเป็นหลายเครื่อง รันซ้ำได้ไม่เสียหาย แต่เปลืองเปล่า)
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const cutoffFor = (days, now = new Date()) => new Date(now.getTime() - days * DAY_MS);

/**
 * ลบข้อมูลที่หมดอายุทุกประเภท
 * @param {{ now?: Date, dryRun?: boolean }} opts dryRun = true → แค่นับ ไม่ลบ
 * @returns {Promise<Record<string, number>>} จำนวนเอกสารที่ลบ (หรือที่จะถูกลบถ้า dryRun) แยกตามชื่อกฎ
 */
export async function purgeExpiredData({ now = new Date(), dryRun = false } = {}) {
  const summary = {};

  for (const rule of getEffectiveRules()) {
    const Model = models[rule.model];
    if (!Model) {
      console.error(`[RETENTION] ไม่พบโมเดล ${rule.model} — ข้าม`);
      continue;
    }
    const query = { ...rule.filter, [rule.field]: { $lt: cutoffFor(rule.days, now) } };
    try {
      summary[rule.name] = dryRun
        ? await Model.countDocuments(query)
        : (await Model.deleteMany(query)).deletedCount;
    } catch (err) {
      // กฎหนึ่งล้มเหลวต้องไม่ทำให้กฎอื่นไม่ถูกรัน
      console.error(`[RETENTION] ลบ ${rule.name} ไม่สำเร็จ:`, err.message);
      summary[rule.name] = 0;
    }
  }
  return summary;
}

// ---------- ตัวตั้งเวลา ----------
let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const summary = await purgeExpiredData();
    const parts = Object.entries(summary).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`);
    if (parts.length) console.log(`🧹 ลบข้อมูลหมดอายุ: ${parts.join(', ')}`);
  } catch (err) {
    console.error('Retention scheduler error:', err.message);
  } finally {
    running = false;
  }
}

export function startRetentionScheduler() {
  if (timer || !env.RETENTION_PURGE_ENABLED) return;
  setTimeout(tick, 30 * 1000); // รันครั้งแรกหลังเริ่มเซิร์ฟเวอร์ 30 วินาที
  timer = setInterval(tick, env.RETENTION_PURGE_INTERVAL_MINUTES * 60 * 1000);
  timer.unref?.();
}

export function stopRetentionScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

export default { purgeExpiredData, startRetentionScheduler, stopRetentionScheduler };