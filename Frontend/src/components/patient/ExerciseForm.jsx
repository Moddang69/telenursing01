import React, { useState, useEffect } from 'react';
import { healthService } from '../../services/healthService.js';
import { validators } from '../../utils/validators.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import './HealthForms.css';

export default function ExerciseForm({ patientId, recordedBy = 'patient', recordedByName } = {}) {
  const { showToast } = useNotification();
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    activity: '', duration: '', distance: '', pace: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    healthService.getExercises(patientId).then((data) => setHistory(data.slice(-10).reverse()));
  }, [patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      activity: validators.required(form.activity, 'กิจกรรม'),
      duration: validators.required(form.duration, 'ระยะเวลา') || validators.numeric(form.duration, 'ระยะเวลา'),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      const saved = await healthService.addExercise({ ...form, duration: Number(form.duration) }, patientId);
      setHistory((h) => [saved, ...h]);
      showToast(recordedBy === 'caregiver' ? `บันทึกข้อมูลสำเร็จ (โดยผู้ดูแล${recordedByName ? ` ${recordedByName}` : ''})` : 'บันทึกข้อมูลสำเร็จ', 'success');
      setForm((f) => ({ ...f, activity: '', duration: '', distance: '', pace: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form className="health-form" onSubmit={handleSubmit} noValidate>
        <h3>บันทึกการออกกำลังกาย</h3>
        <div className="form-group">
          <label htmlFor="activity" className="form-label">กิจกรรม</label>
          <input id="activity" className={`form-input ${errors.activity ? 'input-error' : ''}`}
            placeholder="เช่น เดินเร็ว, ปั่นจักรยาน" value={form.activity}
            onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))} />
          {errors.activity && <span className="form-error-message">{errors.activity}</span>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="duration" className="form-label">ระยะเวลา (นาที)</label>
            <input id="duration" type="number" className={`form-input ${errors.duration ? 'input-error' : ''}`}
              placeholder="30" value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            {errors.duration && <span className="form-error-message">{errors.duration}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="distance" className="form-label">ระยะทาง (กม.)</label>
            <input id="distance" type="number" step="0.1" className="form-input" placeholder="2.5"
              value={form.distance} onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ex-date" className="form-label">วันที่</label>
            <input id="ex-date" type="date" className="form-input" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="ex-time" className="form-label">เวลา</label>
            <input id="ex-time" type="time" className="form-input" value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
          </div>
        </div>
        <button type="submit" className="btn-primary btn-large" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>

      <div className="mini-history-section">
        <h4>ประวัติล่าสุด</h4>
        <ul className="mini-history-list">
          {history.map((ex, i) => (
            <li key={i}><strong>{ex.date}</strong> · {ex.activity} ({ex.duration} นาที)</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
