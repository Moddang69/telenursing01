import mongoose from 'mongoose';
import {
  User, Patient, CarePlan, HealthRecord, MealLog, ExerciseLog, Appointment,
  Message, VideoSession, DataRequest, AuditLog,
} from '../../src/models/index.js';
import { purgeExpiredData, cutoffFor } from '../../src/services/dataRetention.service.js';
import { getEffectiveRules, PERMANENT_MODELS } from '../../src/constants/retention.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-10T00:00:00Z');
const ago = (days) => new Date(NOW.getTime() - days * DAY);
const oid = () => new mongoose.Types.ObjectId();

// ใส่เอกสารแบบ raw (ข้าม validation/timestamps) เพื่อกำหนดวันที่เองได้
const insertRaw = (Model, docs) => Model.collection.insertMany(docs);

describe('Data Retention', () => {
  afterEach(() => {
    delete process.env.RETENTION_DAYS_HEALTH_RECORD;
  });

  const daysOf = (name) => getEffectiveRules().find((r) => r.name === name).days;

  test('นโยบาย: ถาวร / 31 / 200 / 90 วัน ตรงตามที่กำหนด และไม่มี Otp', () => {
    expect(PERMANENT_MODELS).toEqual(
      expect.arrayContaining(['User', 'Patient', 'Nurse', 'Caregiver', 'CareTeam', 'CaregiverLink', 'CarePlan', 'Education', 'Consent'])
    );
    for (const n of ['HEALTH_RECORD', 'MEAL_LOG', 'EXERCISE_LOG', 'APPOINTMENT', 'VIDEO_SESSION']) expect(daysOf(n)).toBe(31);
    expect(daysOf('HEALTH_RECORD_LAB')).toBe(200);
    for (const n of ['MESSAGE', 'DATA_REQUEST', 'AUDIT_LOG']) expect(daysOf(n)).toBe(90);
    expect(getEffectiveRules().some((r) => r.model === 'Otp')).toBe(false);
  });

  test('override ด้วย env ได้ แต่ค่าไม่ถูกต้องใช้ค่าเริ่มต้น', () => {
    process.env.RETENTION_DAYS_HEALTH_RECORD = '60';
    expect(daysOf('HEALTH_RECORD')).toBe(60);
    process.env.RETENTION_DAYS_HEALTH_RECORD = 'abc';
    expect(daysOf('HEALTH_RECORD')).toBe(31);
  });

  test('HealthRecord: SMBG/BP เก็บ 31 วัน, HbA1c/LDL เก็บ 200 วัน', async () => {
    const mk = (type, days) => ({ _id: oid(), patientId: oid(), type, createdAt: ago(days) });
    await insertRaw(HealthRecord, [
      mk('SMBG', 32), mk('BLOOD_PRESSURE', 32), mk('SMBG', 30), // ลบ 2
      mk('HBA1C', 100), mk('LDL', 199), // เก็บ (เกิน 31 แต่ไม่ถึง 200)
      mk('HBA1C', 201), mk('LDL', 201), // ลบ 2
    ]);
    const summary = await purgeExpiredData({ now: NOW });
    expect(summary.HEALTH_RECORD).toBe(2);
    expect(summary.HEALTH_RECORD_LAB).toBe(2);
    expect(await HealthRecord.countDocuments()).toBe(3);
  });

  test('ลบเฉพาะที่เกินอายุ — 31 วัน (HealthRecord/MealLog/ExerciseLog นับจาก createdAt)', async () => {
    const mk = (days) => ({ _id: oid(), patientId: oid(), createdAt: ago(days) });
    await insertRaw(HealthRecord, [{ ...mk(32), type: 'SMBG' }, { ...mk(30), type: 'SMBG' }]);
    await insertRaw(MealLog, [mk(32), mk(30)]);
    await insertRaw(ExerciseLog, [mk(32), mk(30)]);

    const summary = await purgeExpiredData({ now: NOW });
    expect(await HealthRecord.countDocuments()).toBe(1);
    expect(await MealLog.countDocuments()).toBe(1);
    expect(await ExerciseLog.countDocuments()).toBe(1);
  });

  test('Appointment นับจากวันเวลานัด — นัดในอนาคตที่สร้างไว้นานแล้วต้องไม่ถูกลบ', async () => {
    await insertRaw(Appointment, [
      { _id: oid(), dueDateTime: ago(32), createdAt: ago(40) }, // ผ่านไปแล้วเกิน 31 วัน → ลบ
      { _id: oid(), dueDateTime: ago(5), createdAt: ago(60) }, // ผ่านมาไม่ถึง 31 วัน → เก็บ
      { _id: oid(), dueDateTime: new Date(NOW.getTime() + 20 * DAY), createdAt: ago(45) }, // นัดล่วงหน้า สร้างมานาน → เก็บ
    ]);
    const summary = await purgeExpiredData({ now: NOW });
    expect(summary.APPOINTMENT).toBe(1);
    expect(await Appointment.countDocuments()).toBe(2);
  });

  test('Message/AuditLog เก็บ 90 วัน, VideoSession เก็บ 31 วัน', async () => {
    await insertRaw(Message, [{ _id: oid(), sentAt: ago(91) }, { _id: oid(), sentAt: ago(89) }]);
    await insertRaw(VideoSession, [{ _id: oid(), createdAt: ago(32) }, { _id: oid(), createdAt: ago(30) }]);
    await insertRaw(AuditLog, [{ _id: oid(), createdAt: ago(91) }, { _id: oid(), createdAt: ago(89) }]);

    await purgeExpiredData({ now: NOW });
    expect(await Message.countDocuments()).toBe(1);
    expect(await VideoSession.countDocuments()).toBe(1);
    expect(await AuditLog.countDocuments()).toBe(1);
  });

  test('DataRequest: ลบเฉพาะที่ COMPLETED/REJECTED — คำขอที่ค้างอยู่ไม่หาย แม้เกิน 90 วัน', async () => {
    await insertRaw(DataRequest, [
      { _id: oid(), status: 'COMPLETED', createdAt: ago(100) },
      { _id: oid(), status: 'REJECTED', createdAt: ago(100) },
      { _id: oid(), status: 'REQUESTED', createdAt: ago(100) },
      { _id: oid(), status: 'UNDER_REVIEW', createdAt: ago(100) },
      { _id: oid(), status: 'COMPLETED', createdAt: ago(10) },
    ]);
    await purgeExpiredData({ now: NOW });
    expect(await DataRequest.countDocuments()).toBe(3);
    expect(await DataRequest.countDocuments({ status: { $in: ['REQUESTED', 'UNDER_REVIEW'] } })).toBe(2);
  });

  test('ข้อมูลที่เก็บถาวร (User/Patient/CarePlan) ไม่ถูกลบ แม้เก่ามาก', async () => {
    const old = ago(3650);
    await insertRaw(User, [{ _id: oid(), email: 'old@example.com', createdAt: old }]);
    await insertRaw(Patient, [{ _id: oid(), createdAt: old }]);
    await insertRaw(CarePlan, [{ _id: oid(), createdAt: old, dueDate: old }]);

    await purgeExpiredData({ now: NOW });
    expect(await User.countDocuments()).toBe(1);
    expect(await Patient.countDocuments()).toBe(1);
    expect(await CarePlan.countDocuments()).toBe(1);
  });

  test('dryRun: นับอย่างเดียว ไม่ลบ', async () => {
    await insertRaw(MealLog, [{ _id: oid(), createdAt: ago(40) }]);
    const summary = await purgeExpiredData({ now: NOW, dryRun: true });
    expect(summary.MEAL_LOG).toBe(1);
    expect(await MealLog.countDocuments()).toBe(1);
  });

  test('cutoffFor คำนวณถูกต้อง', () => {
    expect(cutoffFor(31, NOW).getTime()).toBe(NOW.getTime() - 31 * DAY);
  });
});