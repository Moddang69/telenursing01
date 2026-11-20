import request from 'supertest';
import app from '../../src/app.js';
import { Otp } from '../../src/models/index.js';
import { ensureCollections } from '../helpers/ensureCollections.js';
import mongoose from 'mongoose';

  beforeEach(async () => {
    for (const c of Object.values(mongoose.connection.collections)) {
      await c.deleteMany({});
    }
  });

describe('Auth Flow — Integration Tests (End-to-End via HTTP)', () => {
  beforeAll(async () => {
    await ensureCollections();
  });
  const testUser = {
    email: 'integration.patient@example.com',
    password: 'Passw0rd1',
    role: 'patient',
    profile: {
      firstName: 'บูรณาการ',
      lastName: 'ทดสอบ',
      hn: 'HN-INT-0001',
      dob: '1975-05-05',
      gender: 'female',
      phone: '0811111111',
    },
  };

  test('POST /api/auth/register -> 201 Created', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('patient');
  });

  test('POST /api/auth/register -> 409 เมื่อ email ซ้ำ', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  test('Full Flow: Register -> Request OTP -> Verify OTP -> Login -> Restore Session', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const otpRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ email: testUser.email, purpose: 'REGISTER' });
    expect(otpRes.status).toBe(200);

    const otpDoc = await Otp.findOne({ email: testUser.email, purpose: 'REGISTER' });
    // ใช้ devOnlyOtpCode ที่ Backend ส่งกลับมาตรงๆ ใน Prototype (ดู Phase 8.10)
    const otpCode = otpRes.body.data.devOnlyOtpCode;

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: testUser.email, purpose: 'REGISTER', otp: otpCode });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;
    expect(token).toBeDefined();

    const restoreRes = await request(app)
      .get('/api/auth/restore-session')
      .set('Authorization', `Bearer ${token}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.email).toBe(testUser.email);
  });

  test('POST /api/auth/login -> 401 เมื่อ password ผิด', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/restore-session -> 401 เมื่อไม่มี Token', async () => {
    const res = await request(app).get('/api/auth/restore-session');
    expect(res.status).toBe(401);
  });
});
