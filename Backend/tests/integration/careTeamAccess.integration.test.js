import request from 'supertest';
import app from '../../src/app.js';
import authService from '../../src/services/auth.service.js';
import careTeamService from '../../src/services/careTeam.service.js';
import { Nurse, User } from '../../src/models/index.js';
import { generateToken } from '../../src/utils/generateToken.js';

/**
 * careTeamAccess.integration.test.js
 * ⭐ ทดสอบหัวใจสำคัญที่สุดของระบบ: verifyCareTeamAccess (Phase 4.5 / Phase 9)
 * ต้องยืนยันว่า Nurse B เข้าถึง Patient ของ Nurse A ไม่ได้เด็ดขาด
 */

async function createApprovedNurse(email, licenseNumber) {
  const result = await authService.registerUser({
    email,
    password: 'Passw0rd1',
    role: 'nurse',
    profile: {
      firstName: 'พยาบาล',
      lastName: licenseNumber,
      phone: '0822222222',
      licenseNumber,
      hospital: 'Test Hospital',
    },
  });
  await Nurse.findByIdAndUpdate(result.roleRefId, {
    $set: { approvalStatus: 'APPROVED', confidentialityAccepted: true },
  });
  const token = generateToken({ userId: result.userId, role: 'nurse', roleRefId: result.roleRefId });
  return { nurseId: result.roleRefId, token };
}

async function createPatient(email, hn) {
  const result = await authService.registerUser({
    email,
    password: 'Passw0rd1',
    role: 'patient',
    profile: {
      firstName: 'ผู้ป่วย',
      lastName: hn,
      hn,
      dob: '1970-01-01',
      gender: 'male',
      phone: '0833333333',
    },
  });
  return { patientId: result.roleRefId, userId: result.userId };
}

describe('verifyCareTeamAccess — Data Scoping Integration Tests', () => {
  test('Nurse B ต้องไม่สามารถเข้าถึง Patient ที่ดูแลโดย Nurse A ได้ (403 Forbidden)', async () => {
    const nurseA = await createApprovedNurse('nurseA@example.com', 'NUR-A-001');
    const nurseB = await createApprovedNurse('nurseB@example.com', 'NUR-B-001');
    const patient = await createPatient('patientOfA@example.com', 'HN-SCOPE-001');

    // มอบหมาย Patient ให้ Nurse A เท่านั้น
    await careTeamService.assignNurse({
      patientId: patient.patientId,
      nurseId: nurseA.nurseId,
      assignedByUserId: patient.userId,
    });

    // Nurse A เข้าถึงได้ (ควรสำเร็จ)
    const resA = await request(app)
      .get(`/api/nurses/patients/${patient.patientId}`)
      .set('Authorization', `Bearer ${nurseA.token}`);
    expect(resA.status).toBe(200);

    // Nurse B ต้องเข้าถึงไม่ได้ (ต้อง 403 เท่านั้น)
    const resB = await request(app)
      .get(`/api/nurses/patients/${patient.patientId}`)
      .set('Authorization', `Bearer ${nurseB.token}`);
    expect(resB.status).toBe(403);
    expect(resB.body.message).toContain('ไม่มีสิทธิ์เข้าถึง');
  });

  test('getAssignedPatients ของ Nurse B ต้องไม่มี Patient ของ Nurse A ปนอยู่', async () => {
    const nurseA = await createApprovedNurse('nurseA2@example.com', 'NUR-A-002');
    const nurseB = await createApprovedNurse('nurseB2@example.com', 'NUR-B-002');
    const patient = await createPatient('patientOfA2@example.com', 'HN-SCOPE-002');

    await careTeamService.assignNurse({
      patientId: patient.patientId,
      nurseId: nurseA.nurseId,
      assignedByUserId: patient.userId,
    });

    const resB = await request(app)
      .get(`/api/nurses/${nurseB.nurseId}/patients`)
      .set('Authorization', `Bearer ${nurseB.token}`);

    expect(resB.status).toBe(200);
    const foundLeakedPatient = resB.body.data.find((p) => p._id === patient.patientId.toString());
    expect(foundLeakedPatient).toBeUndefined(); // ต้องไม่พบ — ป้องกัน Data Leak
  });

  test('Nurse ที่ยังไม่ Approved ต้องเข้าถึง Patient ไม่ได้เลย', async () => {
    const result = await authService.registerUser({
      email: 'pendingNurse@example.com',
      password: 'Passw0rd1',
      role: 'nurse',
      profile: { firstName: 'รอ', lastName: 'อนุมัติ', phone: '0844444444', licenseNumber: 'NUR-PENDING-001', hospital: 'Test' },
    });
    const token = generateToken({ userId: result.userId, role: 'nurse', roleRefId: result.roleRefId });
    const patient = await createPatient('patientForPending@example.com', 'HN-SCOPE-003');

    const res = await request(app)
      .get(`/api/nurses/patients/${patient.patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('ยังไม่ได้รับการอนุมัติ');
  });
});
