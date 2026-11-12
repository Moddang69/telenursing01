import React, { useState } from 'react';
import { carePlanService } from '../../services/carePlanService.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validators } from '../../utils/validators.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * AssignCarePlanForm — ฟอร์มสร้างแผนการดูแลใหม่ให้ผู้ป่วย (Nurse เท่านั้น)
 * POST /api/care-plans/:patientId
 */
export default function AssignCarePlanForm({ patientId, onDone, onCancel }) {
  const { showToast } = useNotification();
  const [form, setForm] = useState({
    goal: '',
    action: '',
    frequency: '',
    target: '',
    startDate: today(),
    dueDate: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      goal: validators.required(form.goal, 'เป้าหมาย'),
      action: validators.required(form.action, 'แนวทางปฏิบัติ'),
      frequency: validators.required(form.frequency, 'ความถี่'),
      target: validators.required(form.target, 'เป้าหมายที่วัดผลได้'),
      startDate: validators.required(form.startDate, 'วันที่เริ่ม'),
      dueDate: validators.required(form.dueDate, 'วันที่ครบกำหนด'),
    };
    if (!newErrors.dueDate && form.dueDate < form.startDate) {
      newErrors.dueDate = 'วันที่ครบกำหนดต้องไม่ก่อนวันที่เริ่ม';
    }
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await carePlanService.createCarePlan(patientId, form);
      showToast('สร้างแผนการดูแลสำเร็จ', 'success');
      onDone();
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถสร้างแผนการดูแลได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>สร้างแผนการดูแลใหม่</h2>

      <div className="form-group">
        <label className="form-label" htmlFor="cp-goal">เป้าหมาย (Goal)</label>
        <input id="cp-goal" className="form-input" value={form.goal} onChange={setField('goal')}
          placeholder="เช่น ควบคุมระดับน้ำตาลในเลือดให้อยู่ในเกณฑ์ปกติ" />
        {errors.goal && <span className="form-error-message">{errors.goal}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cp-action">สิ่งที่ต้องทำ (Action)</label>
        <textarea id="cp-action" className="form-input textarea" value={form.action} onChange={setField('action')}
          placeholder="เช่น วัดระดับน้ำตาลก่อนอาหารเช้าและบันทึกทุกวัน" />
        {errors.action && <span className="form-error-message">{errors.action}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cp-frequency">ความถี่ (Frequency)</label>
        <input id="cp-frequency" className="form-input" value={form.frequency} onChange={setField('frequency')}
          placeholder="เช่น ทุกวัน / สัปดาห์ละ 3 ครั้ง" />
        {errors.frequency && <span className="form-error-message">{errors.frequency}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cp-target">เป้าหมายที่วัดผลได้ (Target)</label>
        <input id="cp-target" className="form-input" value={form.target} onChange={setField('target')}
          placeholder="เช่น ระดับน้ำตาล 70–130 mg/dL ภายใน 4 สัปดาห์" />
        {errors.target && <span className="form-error-message">{errors.target}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="cp-start">วันที่เริ่ม</label>
          <input id="cp-start" type="date" className="form-input" value={form.startDate} onChange={setField('startDate')} />
          {errors.startDate && <span className="form-error-message">{errors.startDate}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cp-due">วันที่ครบกำหนด</label>
          <input id="cp-due" type="date" className="form-input" value={form.dueDate} onChange={setField('dueDate')} />
          {errors.dueDate && <span className="form-error-message">{errors.dueDate}</span>}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก...' : 'สร้างแผนการดูแล'}
        </button>
      </div>
    </form>
  );
}
