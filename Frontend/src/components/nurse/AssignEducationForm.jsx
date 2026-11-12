import React, { useState } from 'react';
import { educationService } from '../../services/educationService.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import { validators } from '../../utils/validators.js';

const CATEGORIES = [
  'โภชนาการ',
  'การออกกำลังกาย',
  'การใช้ยา',
  'การดูแลเท้า',
  'การจัดการความเครียด',
  'ความรู้ทั่วไปเกี่ยวกับโรค',
  'อื่นๆ',
];

/**
 * AssignEducationForm — ฟอร์มมอบหมายบทเรียน/สื่อความรู้สุขภาพให้ผู้ป่วย (Nurse เท่านั้น)
 * POST /api/educations/:patientId
 */
export default function AssignEducationForm({ patientId, onDone, onCancel }) {
  const { showToast } = useNotification();
  const [form, setForm] = useState({ category: CATEGORIES[0], title: '', description: '', contentUrl: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      category: validators.required(form.category, 'หมวดหมู่'),
      title: validators.required(form.title, 'ชื่อเรื่อง'),
      contentUrl:
        form.contentUrl && !/^https?:\/\/.+/i.test(form.contentUrl)
          ? 'กรุณาระบุลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://'
          : '',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await educationService.assignEducation(patientId, {
        category: form.category,
        title: form.title,
        description: form.description || null,
        contentUrl: form.contentUrl || null,
      });
      showToast('มอบหมายบทเรียนสุขภาพสำเร็จ', 'success');
      onDone();
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถมอบหมายบทเรียนได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>มอบหมายบทเรียนสุขภาพใหม่</h2>

      <div className="form-group">
        <label className="form-label" htmlFor="edu-category">หมวดหมู่</label>
        <select id="edu-category" className="form-input" value={form.category} onChange={setField('category')}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="edu-title">ชื่อบทเรียน</label>
        <input id="edu-title" className="form-input" value={form.title} onChange={setField('title')}
          placeholder="เช่น การเลือกอาหารสำหรับผู้ป่วยเบาหวาน" />
        {errors.title && <span className="form-error-message">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="edu-desc">คำอธิบาย/เนื้อหาโดยย่อ (ถ้ามี)</label>
        <textarea id="edu-desc" className="form-input textarea" value={form.description} onChange={setField('description')}
          placeholder="สรุปสั้นๆ ว่าบทเรียนนี้เกี่ยวกับอะไร" maxLength={2000} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="edu-url">ลิงก์สื่อการสอน (ถ้ามี)</label>
        <input id="edu-url" className="form-input" value={form.contentUrl} onChange={setField('contentUrl')}
          placeholder="https://..." />
        {errors.contentUrl && <span className="form-error-message">{errors.contentUrl}</span>}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก...' : 'มอบหมายบทเรียน'}
        </button>
      </div>
    </form>
  );
}
