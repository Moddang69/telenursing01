import authService from '../../src/services/auth.service.js';
import { User, Patient } from '../../src/models/index.js';

describe('auth.service.js — Unit Tests', () => {
  const validProfile = {
    firstName: 'ทดสอบ',
    lastName: 'ระบบ',
    hn: 'HN-TEST-0001',
    dob: '1980-01-01',
    gender: 'male',
    phone: '0800000000',
  };

 beforeEach(async () => {
    await User.createCollection();
    await Patient.createCollection();
    await User.init();
    await Patient.init();
  }); 

  test('registerUser: ควรสร้าง User + Patient Profile พร้อมกัน (Transaction)', async () => {
    const result = await authService.registerUser({
      email: 'unit.test1@example.com',
      password: 'Passw0rd1',
      role: 'patient',
      profile: validProfile,
    });

    expect(result.userId).toBeDefined();
    expect(result.role).toBe('patient');

    const user = await User.findById(result.userId);
    expect(user.roleRefId.toString()).toBe(result.roleRefId.toString());

    const patient = await Patient.findById(result.roleRefId);
    expect(patient.hn).toBe('HN-TEST-0001');
  });

  test('registerUser: ควร throw error ถ้า email ซ้ำ', async () => {
    await authService.registerUser({
      email: 'dup@example.com',
      password: 'Passw0rd1',
      role: 'patient',
      profile: validProfile,
    });

    await expect(
      authService.registerUser({
        email: 'dup@example.com',
        password: 'Passw0rd2',
        role: 'patient',
        profile: { ...validProfile, hn: 'HN-TEST-0002' },
      })
    ).rejects.toThrow('อีเมลนี้ถูกใช้งานแล้ว');
  });

  test('loginUser: ควรคืน token เมื่อ email/password ถูกต้อง', async () => {
    await authService.registerUser({
      email: 'login.test@example.com',
      password: 'Passw0rd1',
      role: 'patient',
      profile: { ...validProfile, hn: 'HN-TEST-0003' },
    });

    const result = await authService.loginUser({ email: 'login.test@example.com', password: 'Passw0rd1' });
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('login.test@example.com');
  });

  test('loginUser: ควร throw error เมื่อ password ผิด', async () => {
    await authService.registerUser({
      email: 'wrongpass@example.com',
      password: 'Passw0rd1',
      role: 'patient',
      profile: { ...validProfile, hn: 'HN-TEST-0004' },
    });

    await expect(
      authService.loginUser({ email: 'wrongpass@example.com', password: 'WrongPass1' })
    ).rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  });
});
