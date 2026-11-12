import healthEvaluationService from '../../src/services/healthEvaluation.service.js';
import { isBpCombinationPossible } from '../../src/constants/healthRanges.js';

describe('healthEvaluation.service.js — เลือกค่าเป็นช่วง (Placeholder Clinical Rule)', () => {
  test('SMBG "ต่ำกว่า 70" ควรได้ CRITICAL และพล็อตที่ค่ากลางช่วง', () => {
    const r = healthEvaluationService.buildRecordFromRanges('SMBG', { smbg: { rangeKey: 'glu_lt70' } });
    expect(r.severity).toBe('CRITICAL');
    expect(r.data.smbg.value).toBe(54.5);
  });

  test('SMBG 70 – 99 ควรได้ NORMAL และพล็อตที่ 84.5', () => {
    const r = healthEvaluationService.buildRecordFromRanges('SMBG', { smbg: { rangeKey: 'glu_70_99' } });
    expect(r.severity).toBe('NORMAL');
    expect(r.data.smbg.value).toBe(84.5);
  });

  test('SMBG 126 – 249 ควรได้ HIGH, 250 ขึ้นไป ควรได้ CRITICAL', () => {
    expect(healthEvaluationService.evaluateSmbg({ rangeKey: 'glu_126_249' }).severity).toBe('HIGH');
    expect(healthEvaluationService.evaluateSmbg({ rangeKey: 'glu_gte250' }).severity).toBe('CRITICAL');
  });

  test('BloodPressure ใช้ระดับที่แย่ที่สุดของ Systolic / Diastolic / ชีพจร', () => {
    const r = healthEvaluationService.evaluateBloodPressure({
      systolicRangeKey: 'sys_90_120',
      diastolicRangeKey: 'dia_gte90',
      pulseRangeKey: 'pulse_60_100',
    });
    expect(r.severity).toBe('HIGH');
  });

  test('BloodPressure ค่าปกติทั้งหมดควรได้ NORMAL', () => {
    const r = healthEvaluationService.buildRecordFromRanges('BLOOD_PRESSURE', {
      bloodPressure: { systolicRangeKey: 'sys_90_120', diastolicRangeKey: 'dia_60_80' },
    });
    expect(r.severity).toBe('NORMAL');
    expect(r.data.bloodPressure.systolic).toBe(105);
    expect(r.data.bloodPressure.diastolic).toBe(70);
  });

  test('Systolic ต่ำกว่า 90 + Diastolic 90 ขึ้นไป เป็นไปไม่ได้ (Systolic ห้ามต่ำกว่า Diastolic)', () => {
    expect(isBpCombinationPossible('sys_lt90', 'dia_gte90')).toBe(false);
    expect(() =>
      healthEvaluationService.buildRecordFromRanges('BLOOD_PRESSURE', {
        bloodPressure: { systolicRangeKey: 'sys_lt90', diastolicRangeKey: 'dia_gte90' },
      })
    ).toThrow();
  });

  test('Systolic ต่ำกว่า 90 + Diastolic 81 – 89 ยังเป็นไปได้ (เช่น 88/85)', () => {
    expect(isBpCombinationPossible('sys_lt90', 'dia_81_89')).toBe(true);
  });

  test('rangeKey ที่ไม่มีอยู่จริงต้องถูกปฏิเสธ', () => {
    expect(() => healthEvaluationService.evaluateHba1c({ rangeKey: 'xxx' })).toThrow();
  });

  test('ทุก result ต้องมี Disclaimer message', () => {
    const result = healthEvaluationService.evaluateHba1c({ rangeKey: 'a1c_70_89' });
    expect(result.message).toContain('Placeholder clinical rule');
  });
});
