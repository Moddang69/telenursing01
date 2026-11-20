import request from 'supertest';
import app from '../../src/app.js';
import authService from '../../src/services/auth.service.js';
import { Patient } from '../../src/models/index.js';
import { generateToken } from '../../src/utils/generateToken.js';
import { ensureCollections } from '../helpers/ensureCollections.js';

describe('Consent Enforcement — Integration Tests (Phase 4.6 / Phase 10)', () => {
  beforeAll(async () => {
    await ensureCollections();
  });
  async function createPatientWithToken() {
    const result = await authService.registerUser({
      email: 'consentTest@example.com',
      password: 'Passw0rd1',
      role: 'patient',
      profile: { firstName: 'ยินยอม', lastName: 'ทดสอบ', hn: 'HN-CONSENT-001', dob: '1980-01-01', gender: 'female', phone: '0855555555' },
    });
    const token = generateToken({ userId: result.userId, role: 'patient', roleRefId: result.roleRefId });
    return { patientId: result.roleRefId, token };
  }

  test('Patient ที่ consentStatus = CONSENT_WITHDRAWN ต้องบันทึก Health Record ใหม่ไม่ได้ (403)', async () => {
    const { patientId, token } = await createPatientWithToken();
    await Patient.findByIdAndUpdate(patientId, { $set: { consentStatus: 'CONSENT_WITHDRAWN' } });

    const res = await request(app)
      .post(`/api/health/${patientId}/records`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'SMBG',
        date: '2026-09-01',
        time: '07:00',
        unit: 'mg/dL',
        smbg: { rangeKey: 'glu_70_99', measurementType: 'fasting' },
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('ถอนความยินยอม');
  });

  test('Patient ที่ยังไม่ถอน Consent ต้องบันทึกได้ปกติ และ evaluatedSeverity คำนวณจาก Backend', async () => {
    const { patientId, token } = await createPatientWithToken();
    await Patient.findByIdAndUpdate(patientId, { $set: { consentStatus: 'GIVEN' } });

    const res = await request(app)
      .post(`/api/health/${patientId}/records`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'SMBG',
        date: '2026-09-01',
        time: '07:00',
        unit: 'mg/dL',
        // Client ส่งมาเฉพาะ "ช่วงค่า" — ค่าตัวเลข/severity ถูกกำหนดที่ Backend
        smbg: { rangeKey: 'glu_gte250', measurementType: 'fasting', value: 1 },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.evaluatedSeverity).toBe('CRITICAL'); // คำนวณที่ Backend ไม่ใช่ Client
    expect(res.body.data.smbg.value).toBe(325); // ค่ากลางของช่วง ไม่ใช่ค่าที่ Client ส่งมา
  });
});
