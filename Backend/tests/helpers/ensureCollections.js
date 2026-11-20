import mongoose from 'mongoose';
import '../../src/models/index.js';

/**
 * สร้าง collection + index ของทุก Model ให้เสร็จก่อนเริ่มเขียนข้อมูล
 * ป้องกัน WriteConflict (catalog changes) ใน replica set
 */
export async function ensureCollections() {
  const models = Object.values(mongoose.models);
  for (const model of models) {
    try {
      await model.createCollection();
    } catch (err) {
      // 48 = NamespaceExists (มี collection อยู่แล้ว) ข้ามได้
      if (err.code !== 48) throw err;
    }
    await model.init();
  }
}

/** ตัวช่วยวันที่ในอนาคตแบบไดนามิก (YYYY-MM-DD) */
export function futureDate(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}