/**
 * backfillConsents.js — (รันครั้งเดียว) สร้าง record ใน consents ให้บัญชีที่สมัครไว้ก่อนแก้บั๊ก
 * วิธีใช้ (จากโฟลเดอร์ Backend/):  node src/scripts/backfillConsents.js
 * หมายเหตุ: ใช้กับบัญชีทดสอบ/ต้นแบบที่ผู้ใช้ติ๊กยินยอมในหน้าสมัครแล้วเท่านั้น
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Consent, Patient, Nurse } from '../models/index.js';

async function main() {
  await connectDB();
  let p = 0, n = 0;

  const patients = await Patient.find({ consentStatus: 'NOT_GIVEN', hasProfile: true });
  for (const pt of patients) {
    await Consent.updateOne(
      { userId: pt.userId, type: 'PATIENT_DATA_CONSENT', version: 'v1.2-prototype' },
      { $setOnInsert: { role: 'patient', status: 'GIVEN', givenAt: pt.createdAt } },
      { upsert: true }
    );
    await Patient.updateOne({ _id: pt._id }, { $set: { consentStatus: 'GIVEN' } });
    p++;
  }

  const nurses = await Nurse.find({ confidentialityAccepted: true });
  for (const nu of nurses) {
    await Consent.updateOne(
      { userId: nu.userId, type: 'NURSE_CONFIDENTIALITY', version: nu.confidentialityVersion || 'v1.1-prototype' },
      { $setOnInsert: { role: 'nurse', status: 'GIVEN', givenAt: nu.confidentialityAcceptedAt || nu.createdAt } },
      { upsert: true }
    );
    n++;
  }

  console.log(`✅ backfill เสร็จ: patients=${p}, nurses=${n} - backfillConsents.js:35`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });