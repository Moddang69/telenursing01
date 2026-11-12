import request from 'supertest';
import app from '../../src/app.js';
import authService from '../../src/services/auth.service.js';
import careTeamService from '../../src/services/careTeam.service.js';
import { Nurse } from '../../src/models/index.js';
import { generateToken } from '../../src/utils/generateToken.js';

describe('Appointment Double-booking Prevention — Integration Test (Phase 11.13)', () => {
  test('ควรได้ 409 เมื่อจอง Nurse คนเดียวกันเวลาเดียวกันซ้ำ', async () => {
    const nurseResult = await authService.registerUser({
      email: 'apptNurse@example.com',
      password: 'Passw0rd1',
      role: 'nurse',
      profile: { firstName: 'นัด', lastName: 'หมาย', phone: '0866666666', licenseNumber: 'NUR-APPT-001', hospital: 'Test' },
    });
    await Nurse.findByIdAndUpdate(nurseResult.roleRefId, { $set: { approvalStatus: 'APPROVED' } });

    const patientA = await authService.registerUser({
      email: 'apptPatientA@example.com', password: 'Passw0rd1', role: 'patient',
      profile: { firstName: 'A', lastName: 'Test', hn: 'HN-APPT-A', dob: '1980-01-01', gender: 'male', phone: '0877777777' },
    });
    const patientB = await authService.registerUser({
      email: 'apptPatientB@example.com', password: 'Passw0rd1', role: 'patient',
      profile: { firstName: 'B', lastName: 'Test', hn: 'HN-APPT-B', dob: '1980-01-01', gender: 'male', phone: '0888888888' },
    });

    await careTeamService.assignNurse({ patientId: patientA.roleRefId, nurseId: nurseResult.roleRefId, assignedByUserId: patientA.userId });
    await careTeamService.assignNurse({ patientId: patientB.roleRefId, nurseId: nurseResult.roleRefId, assignedByUserId: patientB.userId });

    const tokenA = generateToken({ userId: patientA.userId, role: 'patient', roleRefId: patientA.roleRefId });
    const tokenB = generateToken({ userId: patientB.userId, role: 'patient', roleRefId: patientB.roleRefId });

    const first = await request(app)
      .post(`/api/appointments/${patientA.roleRefId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nurseId: nurseResult.roleRefId, date: '2026-09-10', time: '10:00', reason: 'test' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/appointments/${patientB.roleRefId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ nurseId: nurseResult.roleRefId, date: '2026-09-10', time: '10:00', reason: 'conflict test' });

    expect(second.status).toBe(409);
    expect(second.body.message).toContain('มีนัดหมายอื่นอยู่แล้ว');
  });
});
