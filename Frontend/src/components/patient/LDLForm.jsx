import React, { useState } from 'react';
import { healthService } from '../../services/healthService.js';
import { validators } from '../../utils/validators.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import RangeSelect from '../common/RangeSelect.jsx';
import { HEALTH_RANGES, METRIC_UNITS } from '../../constants/healthRanges.js';
import './HealthForms.css';

const newForm = () => ({
  rangeKey: '',
  date: new Date().toISOString().slice(0, 10),
});

export default function LdlForm({
  patientId,
  recordedBy = 'patient',
  recordedByName,
  onSaved,
} = {}) {
  const { showToast } = useNotification();
  const [form, setForm] = useState(newForm());
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {
      rangeKey: form.rangeKey ? '' : 'กรุณาเลือกช่วงค่า LDL',
      date: validators.required(form.date, 'วันที่'),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await healthService.addLdl(form, patientId);
      showToast(
        recordedBy === 'caregiver'
          ? `บันทึกข้อมูลสำเร็จ (โดยผู้ดูแล${recordedByName ? ` ${recordedByName}` : ''})`
          : 'บันทึกค่า LDL สำเร็จ',
        'success'
      );
      setForm(newForm());
      if (onSaved) onSaved();
    } catch (err) {
      console.error('LDL submit error:', err);
      showToast(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล LDL', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="health-form" onSubmit={handleSubmit} noValidate>
      <h3>บันทึกค่า LDL</h3>

      <RangeSelect
        id="ldl-range"
        label="เลือกช่วงค่า LDLที่ตรวจได้"
        options={HEALTH_RANGES.ldl}
        unit={METRIC_UNITS.ldl}
        value={form.rangeKey}
        onChange={(rangeKey) => setForm((f) => ({ ...f, rangeKey }))}
        error={errors.rangeKey}
      />

      <div className="form-group">
        <label htmlFor="ldl-range-date" className="form-label">วันที่ตรวจ</label>
        <input
          id="ldl-range-date"
          type="date"
          className={`form-input ${errors.date ? 'input-error' : ''}`}
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        {errors.date && <span className="form-error-message">{errors.date}</span>}
      </div>

      <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกค่า LDL'}
      </button>
    </form>
  );
}
