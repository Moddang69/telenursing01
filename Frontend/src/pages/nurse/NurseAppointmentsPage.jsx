import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService.js';
import { nurseService } from '../../services/nurseService.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { APPOINTMENT_STATUS } from '../../constants/statuses.js';
import './NurseAppointmentsPage.css';

// ตัวแปลง Key ภาษาอังกฤษเป็นข้อความภาษาไทย
const symptomMap = {
  dry_mouth: 'ปากแห้ง / กระหายน้ำมาก',
  frequent_urination: 'ปัสสาวะบ่อย',
  numbness: 'มือ/เท้าชา',
  slow_healing_wound: 'แผลหายช้า',
  dizziness: 'เวียนหัว / หน้ามืด',
  none: 'ไม่มีอาการผิดปกติ',
  other: 'อื่นๆ',
};

// ฟังก์ชันสำหรับแปลงอาร์เรย์ของอาการให้ออกมาเป็น String ภาษาไทย
const getSymptomText = (symptoms, otherSymptom) => {
  if (!symptoms || symptoms.length === 0) return 'ไม่ระบุ';
  return symptoms.map(s => {
    if (s === 'other' && otherSymptom) {
      return `อื่นๆ (${otherSymptom})`;
    }
    return symptomMap[s] || s;
  }).join(', ');
};

const statusDisplay = {
  [APPOINTMENT_STATUS.WAITING]: { text: 'รอ', className: 'status-waiting' },
  [APPOINTMENT_STATUS.SCHEDULED]: { text: 'ว่าง', className: 'status-available' },
  [APPOINTMENT_STATUS.PATIENT_JOINED]: { text: 'ผู้ป่วยเข้าห้องแล้ว', className: 'status-waiting' },
  [APPOINTMENT_STATUS.COMPLETED]: { text: 'เสร็จสิ้น', className: 'status-available' },
};

export default function NurseAppointmentsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [openCase, setOpenCase] = useState(null);
  const [preConsult, setPreConsult] = useState(null);

  useEffect(() => { appointmentService.getQueueGroupedByDay().then(setGroups); }, []);

  if (!groups) return <LoadingState />;

  const handleOpenCase = async (apt) => {
    setOpenCase(apt);
    const answers = await nurseService.getPreConsultAnswers(apt.patientId);
    setPreConsult(answers);
  };

  const dayKeys = Object.keys(groups);

  return (
    <div className="nurse-appointments-page">
      <h1>คิวการนัดหมาย</h1>
      {dayKeys.length === 0 ? (
        <EmptyState icon="📅" title="ยังไม่มีนัดหมาย" />
      ) : (
        dayKeys.map((day) => (
          <section key={day} className="queue-day-section">
            <h2>{day}</h2>
            <div className="queue-list">
              {groups[day].map((apt) => {
                const st = statusDisplay[apt.status] || statusDisplay[APPOINTMENT_STATUS.SCHEDULED];
                return (
                  <div key={apt.id} className="queue-card">
                    <div className="queue-card-info">
                      <strong>{apt.patientName}</strong>
                      <p>HN: {apt.hn} · เวลา {apt.time} น.</p>
                      <span className={`queue-status-tag ${st.className}`}>สถานะ: {st.text}</span>
                    </div>
                    <div className="queue-card-actions">
                      <button className="btn-secondary" onClick={() => handleOpenCase(apt)}>เปิดเคส</button>
                      <button className="btn-primary" onClick={() => navigate(`/nurse/patients/${apt.patientId}/video`)}>
                        🎥 วิดีโอคอล
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {openCase && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>ข้อมูลก่อนพบพยาบาล — {openCase.patientName}</h2>
            {preConsult ? (
              <ul className="preconsult-list">
                <li><strong>ตำแหน่ง:</strong> {preConsult.location}</li>
                <li><strong>เบอร์ฉุกเฉิน:</strong> {preConsult.emergencyContact}</li>
                <li><strong>น้ำตาลล่าสุด:</strong> {preConsult.latestGlucose}</li>
                <li><strong>ความดันล่าสุด:</strong> {preConsult.latestBP}</li>
                <li><strong>ระดับความเจ็บปวด:</strong> {preConsult.painLevel}/10</li>
                <li><strong>อาการ:</strong> {getSymptomText(preConsult.symptoms, preConsult.otherSymptom)}</li>
              </ul>
            ) : (
              <p>ผู้ป่วยยังไม่ได้กรอกแบบสอบถาม</p>
            )}
            <button className="btn-secondary" onClick={() => setOpenCase(null)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}