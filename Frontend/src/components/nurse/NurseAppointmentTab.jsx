import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { appointmentService } from '../../services/appointmentService.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import './NurseAppointmentTab.css';

export default function NurseAppointmentTab({ patient }) {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [existing, setExisting] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    appointmentService.getQueueGroupedByDay().then((groups) => {
      const all = Object.values(groups).flat();
      setExisting(all.find((a) => a.patientId === patient.patientId) || null);
    });
  }, [patient]);

  const dueDateTimeDisplay =
    date && time
      ? new Date(`${date}T${time}`).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })
      : 'ยังไม่ระบุ';

  const handleSave = async () => {
    setError('');
    if (!date || !time) { setError('กรุณาเลือกวันที่และเวลานัดหมาย'); return; }
    setIsSubmitting(true);
    try {
      await appointmentService.createAppointment(
        { date, time, reason, note, dueDateTime: new Date(`${date}T${time}`).toISOString() },
        patient.patientId
      );
      showToast('บันทึกนัดหมายสำเร็จ', 'success');
      navigate('/nurse/appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="nurse-appointment-tab">
      {existing && (
        <div className="existing-appointment-note">
          <Info size={16} className="inline-icon" /> ผู้ป่วยรายนี้มีนัดหมายอยู่แล้ว: {existing.date} เวลา {existing.time} น. (สถานะ: {existing.status})
        </div>
      )}

      <h3 className="section-subheading">สร้างนัดหมายใหม่</h3>
      {error && <div className="alert-error" role="alert">{error}</div>}

      <div className="form-group">
        <label htmlFor="apt-date" className="form-label">1. เลือกวันที่นัดหมาย</label>
        <input id="apt-date" type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="form-group">
        <label htmlFor="apt-time" className="form-label">2. เลือกเวลานัดหมาย</label>
        <input id="apt-time" type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">3. Due Date (วัน/เวลานัดหมาย)</label>
        <div className="due-date-display">{dueDateTimeDisplay}</div>
      </div>

      <div className="form-group">
        <label htmlFor="apt-reason" className="form-label">สาเหตุการนัดหมาย</label>
        <input id="apt-reason" className="form-input" placeholder="เช่น ติดตามระดับน้ำตาล" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      <div className="form-group">
        <label htmlFor="apt-note" className="form-label">4. หมายเหตุในการนัดหมายวิดีโอคอล</label>
        <textarea id="apt-note" className="form-input textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <button className="btn-primary btn-large" onClick={handleSave} disabled={isSubmitting}>
        {isSubmitting ? 'กำลังบันทึก...' : '5. บันทึกการนัดหมาย'}
      </button>
    </div>
  );
}