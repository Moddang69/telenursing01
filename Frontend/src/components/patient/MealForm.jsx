import React, { useState, useEffect } from 'react';
import { healthService } from '../../services/healthService.js';
import { validators } from '../../utils/validators.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import './HealthForms.css';

export default function MealForm({ patientId, recordedBy = 'patient', recordedByName } = {}) {
  const { showToast } = useNotification();
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    meal: 'เช้า', description: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    healthService.getMeals(patientId).then((data) => setHistory(data.slice(-10).reverse()));
  }, [patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validators.required(form.description, 'รายการอาหาร');
    if (err) { setError(err); return; }

    setIsSubmitting(true);
    try {
      const saved = await healthService.addMeal({ ...form, photo: null }, patientId);
      setHistory((h) => [saved, ...h]);
      showToast(recordedBy === 'caregiver' ? `บันทึกข้อมูลสำเร็จ (โดยผู้ดูแล${recordedByName ? ` ${recordedByName}` : ''})` : 'บันทึกข้อมูลสำเร็จ', 'success');
      setForm((f) => ({ ...f, description: '' }));
      setError('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form className="health-form" onSubmit={handleSubmit} noValidate>
        <h3>บันทึกการรับประทานอาหาร</h3>
        {error && <div className="alert-error" role="alert">{error}</div>}
        <div className="form-group">
          <label htmlFor="meal-type" className="form-label">มื้ออาหาร</label>
          <select id="meal-type" className="form-input" value={form.meal}
            onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value }))}>
            <option value="เช้า">เช้า</option>
            <option value="กลางวัน">กลางวัน</option>
            <option value="เย็น">เย็น</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="meal-desc" className="form-label">รายการอาหาร</label>
          <textarea id="meal-desc" className="form-input textarea"
            placeholder="เช่น ข้าวกล้อง ผัดผัก อกไก่ย่าง"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="meal-date" className="form-label">วันที่</label>
            <input id="meal-date" type="date" className="form-input" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="meal-time" className="form-label">เวลา</label>
            <input id="meal-time" type="time" className="form-input" value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          </div>
        </div>
        {/* TODO: Optional photo upload — deferred, requires backend storage design */}
        <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>

      <div className="mini-history-section">
        <h4>ประวัติล่าสุด</h4>
        <ul className="mini-history-list">
          {history.map((m, i) => (
            <li key={i}><strong>{m.date}</strong> · {m.meal}: {m.description}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
