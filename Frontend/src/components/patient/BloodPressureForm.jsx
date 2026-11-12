import React, { useState } from 'react';
import { healthService } from '../../services/healthService.js';
import { validators } from '../../utils/validators.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import RangeSelect from '../common/RangeSelect.jsx';
import { HEALTH_RANGES, METRIC_UNITS, isBpCombinationPossible } from '../../constants/healthRanges.js';
import './HealthForms.css';

const newForm = () => ({
  systolicRangeKey: '',
  diastolicRangeKey: '',
  pulseRangeKey: '',
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
});

export default function BloodPressureForm({
  patientId,
  recordedBy = 'patient',
  recordedByName,
  onSaved,
} = {}) {
  const { showToast } = useNotification();
  const [form, setForm] = useState(newForm());
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. ต้องเลือก Systolic / Diastolic (ชีพจรไม่บังคับ)
    const newErrors = {
      systolicRangeKey: form.systolicRangeKey ? '' : 'กรุณาเลือกช่วงค่า Systolic',
      diastolicRangeKey: form.diastolicRangeKey ? '' : 'กรุณาเลือกช่วงค่า Diastolic',
      date: validators.required(form.date, 'วันที่'),
      time: validators.required(form.time, 'เวลา'),
    };

    // 2. เงื่อนไขเดิม: Systolic ห้ามต่ำกว่า Diastolic (เทียบแบบช่วง — ผิดเมื่อเป็นไปไม่ได้ทางคณิตศาสตร์)
    if (
      !newErrors.systolicRangeKey &&
      !newErrors.diastolicRangeKey &&
      !isBpCombinationPossible(form.systolicRangeKey, form.diastolicRangeKey)
    ) {
      newErrors.diastolicRangeKey = 'ค่า Systolic ต้องไม่ต่ำกว่าค่า Diastolic กรุณาเลือกช่วงใหม่';
    }

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await healthService.addBloodPressure(form, patientId);
      showToast(
        recordedBy === 'caregiver'
          ? `บันทึกข้อมูลสำเร็จ (โดยผู้ดูแล${recordedByName ? ` ${recordedByName}` : ''})`
          : 'บันทึกข้อมูลสำเร็จ',
        'success'
      );
      setForm(newForm());
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Blood pressure submit error:', err);
      showToast(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="health-form" onSubmit={handleSubmit} noValidate>
      <h3>บันทึกความดันโลหิต</h3>

      <RangeSelect
        id="bp-systolic"
        label="Systolic (ค่าบน)"
        options={HEALTH_RANGES.systolic}
        unit={METRIC_UNITS.systolic}
        value={form.systolicRangeKey}
        onChange={setField('systolicRangeKey')}
        error={errors.systolicRangeKey}
      />

      <RangeSelect
        id="bp-diastolic"
        label="Diastolic (ค่าล่าง)"
        options={HEALTH_RANGES.diastolic}
        unit={METRIC_UNITS.diastolic}
        value={form.diastolicRangeKey}
        onChange={setField('diastolicRangeKey')}
        error={errors.diastolicRangeKey}
      />

      <RangeSelect
        id="bp-pulse"
        label="ชีพจร"
        options={HEALTH_RANGES.pulse}
        unit={METRIC_UNITS.pulse}
        value={form.pulseRangeKey}
        onChange={setField('pulseRangeKey')}
        optional
      />

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="bp-date" className="form-label">วันที่</label>
          <input id="bp-date" type="date" className={`form-input ${errors.date ? 'input-error' : ''}`}
            value={form.date} onChange={(e) => setField('date')(e.target.value)} />
          {errors.date && <span className="form-error-message">{errors.date}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="bp-time" className="form-label">เวลา</label>
          <input id="bp-time" type="time" className={`form-input ${errors.time ? 'input-error' : ''}`}
            value={form.time} onChange={(e) => setField('time')(e.target.value)} />
          {errors.time && <span className="form-error-message">{errors.time}</span>}
        </div>
      </div>

      <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
      </button>
    </form>
  );
}
