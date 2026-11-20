import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, MapPin, Calendar, Lightbulb } from 'lucide-react';
import { appointmentService } from '../../services/appointmentService.js';
import { nurseService } from '../../services/nurseService.js';
import { useNotification } from '../../context/NotificationContext.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import SwipeToDelete from '../../components/common/SwipeToDelete.jsx';
import { APPOINTMENT_STATUS } from '../../constants/statuses.js';
import { mapsUrl } from '../../utils/geolocation.js';
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
  return symptoms
    .map((s) => (s === 'other' && otherSymptom ? `อื่นๆ (${otherSymptom})` : symptomMap[s] || s))
    .join(', ');
};

const statusDisplay = {
  [APPOINTMENT_STATUS.WAITING]: { text: 'รอ', className: 'status-waiting' },
  [APPOINTMENT_STATUS.SCHEDULED]: { text: 'ว่าง', className: 'status-available' },
  [APPOINTMENT_STATUS.PATIENT_JOINED]: { text: 'ผู้ป่วยเข้าห้องแล้ว', className: 'status-waiting' },
  [APPOINTMENT_STATUS.COMPLETED]: { text: 'เสร็จสิ้น', className: 'status-available' },
};

// นัดหมายที่ยกเลิกไม่ได้ (เสร็จสิ้นแล้ว / กำลังให้คำปรึกษาอยู่) — ไม่เปิดให้เลื่อนลบ
const NOT_CANCELLABLE = [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.IN_CONSULTATION];

export default function NurseAppointmentsPage() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [groups, setGroups] = useState(null);
  const [openCase, setOpenCase] = useState(null);
  const [preConsult, setPreConsult] = useState(null);
  // หน้าต่างยืนยันการลบนัดหมาย: { apt, resolve }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    appointmentService.getQueueGroupedByDay().then(setGroups);
  }, []);

  // SwipeToDelete เรียกตอนเลื่อนสุด → เปิดหน้าต่างยืนยัน รอผู้ใช้เลือก (true = ยกเลิกนัดหมายสำเร็จ)
  const requestDelete = useCallback((apt) => new Promise((resolve) => setConfirmDelete({ apt, resolve })), []);

  const closeConfirm = useCallback(
    (result) => {
      confirmDelete?.resolve(result);
      setConfirmDelete(null);
    },
    [confirmDelete]
  );

  // กด Esc = ยกเลิก (ไม่ลบ)
  useEffect(() => {
    if (!confirmDelete) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !cancelling) closeConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete, cancelling, closeConfirm]);

  const handleConfirmDelete = async () => {
    const { apt } = confirmDelete;
    setCancelling(true);
    try {
      await appointmentService.updateAppointmentStatus(apt.id, APPOINTMENT_STATUS.CANCELLED, apt.patientId);
      showToast('ยกเลิกนัดหมายแล้ว ผู้ป่วยจะได้รับแจ้งเตือน', 'success');
      closeConfirm(true);
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถยกเลิกนัดหมายได้', 'error');
      closeConfirm(false);
    } finally {
      setCancelling(false);
    }
  };

  // เอานัดหมายที่ยกเลิกแล้วออกจากรายการ (และวันที่ที่ไม่เหลือนัดหมาย)
  const removeAppointment = (id) =>
    setGroups((prev) => {
      const next = {};
      Object.entries(prev).forEach(([day, list]) => {
        const rest = list.filter((a) => a.id !== id);
        if (rest.length) next[day] = rest;
      });
      return next;
    });

  if (!groups) return <LoadingState />;

  const handleOpenCase = async (apt) => {
    setOpenCase(apt);
    setPreConsult(null);
    const answers = await nurseService.getPreConsultAnswers(apt.patientId);
    setPreConsult(answers);
  };

  const dayKeys = Object.keys(groups);
  const hasCoords = preConsult?.gpsCoordinates?.lat != null && preConsult?.gpsCoordinates?.lng != null;

  return (
    <div className="nurse-appointments-page">
      <h1>คิวการนัดหมาย</h1>
      {dayKeys.length > 0 && (
        <p className="swipe-hint"><Lightbulb size={16} className="inline-icon" /> เลื่อนการ์ดนัดหมายไปทางซ้ายจนสุดเพื่อยกเลิกนัดหมาย</p>
      )}

      {dayKeys.length === 0 ? (
        <EmptyState icon={Calendar} title="ยังไม่มีนัดหมาย" />
      ) : (
        dayKeys.map((day) => (
          <section key={day} className="queue-day-section">
            <h2>{day}</h2>
            <div className="queue-list">
              {groups[day].map((apt) => {
                const st = statusDisplay[apt.status] || statusDisplay[APPOINTMENT_STATUS.SCHEDULED];
                return (
                  <SwipeToDelete
                    key={apt.id}
                    disabled={NOT_CANCELLABLE.includes(apt.status)}
                    onRequestDelete={() => requestDelete(apt)}
                    onRemoved={() => removeAppointment(apt.id)}
                  >
                    <div className="queue-card">
                      <div className="queue-card-info">
                        <strong>{apt.patientName}</strong>
                        <p>HN: {apt.hn} · เวลา {apt.time} น.</p>
                        <span className={`queue-status-tag ${st.className}`}>สถานะ: {st.text}</span>
                      </div>
                      <div className="queue-card-actions">
                        <button className="btn-secondary" onClick={() => handleOpenCase(apt)}>เปิดเคส</button>
                        <button className="btn-primary" onClick={() => navigate(`/nurse/patients/${apt.patientId}/video`)}>
                          <Video size={16} className="inline-icon" /> วิดีโอคอล
                        </button>
                      </div>
                    </div>
                  </SwipeToDelete>
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
                <li>
                  <strong>ตำแหน่ง:</strong> {preConsult.location}
                  {hasCoords && (
                    <>
                      {' '}
                      <a
                        href={mapsUrl(preConsult.gpsCoordinates.lat, preConsult.gpsCoordinates.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin size={14} className="inline-icon" /> เปิดแผนที่
                      </a>
                    </>
                  )}
                </li>
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

      {/* ยืนยันการลบ (ยกเลิก) นัดหมาย */}
      {confirmDelete && (
        <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title">
          <div className="modal-content">
            <h2 id="confirm-delete-title">ยืนยันการลบนัดหมาย?</h2>
            <p>
              {confirmDelete.apt.patientName} · {confirmDelete.apt.date} เวลา {confirmDelete.apt.time} น.
            </p>
            <p className="confirm-delete-note">เมื่อยืนยัน นัดหมายนี้จะถูกยกเลิก และผู้ป่วยจะได้รับการแจ้งเตือน</p>
            <div className="confirm-delete-actions">
              <button className="btn-secondary" onClick={() => closeConfirm(false)} disabled={cancelling} autoFocus>
                ยกเลิก
              </button>
              <button className="btn-danger" onClick={handleConfirmDelete} disabled={cancelling}>
                {cancelling ? 'กำลังยกเลิกนัดหมาย...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
