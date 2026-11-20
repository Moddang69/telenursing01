import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Video, Calendar, UtensilsCrossed, Activity } from 'lucide-react';
import { healthService } from '../../services/healthService.js';
import { appointmentService } from '../../services/appointmentService.js';
import HealthOverview from '../../components/common/HealthOverview.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { ROUTES } from '../../constants/routes.js';
import '../patient/PatientHomePage.css';

export default function CaregiverHomePage() {
  const { link } = useOutletContext();
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [appointment, setAppointment] = useState(undefined);
  const [meals, setMeals] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    const patientId = link.patientId;
    setError(false);
    Promise.all([
      healthService.getSmbg(patientId),
      healthService.getBloodPressure(patientId),
      healthService.getHbA1c(patientId),
      healthService.getLdl(patientId),
      appointmentService.getUpcomingAppointment(patientId),
      healthService.getMeals(patientId),
      healthService.getExercises(patientId),
    ])
      .then(([smbg, bp, hba1c, ldl, apt, mealList, exerciseList]) => {
        setHealth({ smbg, bp, hba1c, ldl });
        setAppointment(apt);
        setMeals(mealList.slice(-3).reverse());
        setExercises(exerciseList.slice(-3).reverse());
      })
      .catch((err) => {
        console.error('CaregiverHomePage load error:', err);
        setError(true);
      });
  }, [link.patientId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลผู้ป่วยได้" onRetry={load} />;
  if (!health) return <LoadingState />;

  return (
    <div className="patient-home">
      <section className="home-section">
        <h2>การนัดหมายที่จะถึง</h2>
        {appointment ? (
          <div className="appointment-card">
            <p className="appointment-date">{appointment.date} เวลา {appointment.time} น.</p>
            <p><strong>พยาบาล:</strong> {appointment.nurseName}</p>
            {appointment.status !== 'COMPLETED' && (
              <button className="btn-primary btn-large" onClick={() => navigate(ROUTES.PATIENT_PRE_CONSULT_CHECK)}>
                <Video size={18} className="inline-icon" /> ช่วยผู้ป่วยเข้าห้องรอ (ตรวจอุปกรณ์ + แบบสอบถาม)
              </button>
            )}
          </div>
        ) : (
          <EmptyState icon={Calendar} title="ยังไม่มีนัดหมาย" />
        )}
      </section>

      {/* ดูข้อมูลสุขภาพได้เหมือนผู้ป่วยเสมอ (ไม่มีการจำกัดสิทธิ์แยกต่างหากอีกต่อไป) */}
      <section className="home-section">
        <h2>ภาพรวมข้อมูลสุขภาพ</h2>
        <HealthOverview health={health} />
      </section>

      <section className="home-section">
        <h2>ประวัติการรับประทานอาหารล่าสุด</h2>
        {meals.length === 0 ? <EmptyState icon={UtensilsCrossed} title="ยังไม่มีข้อมูล" /> : (
          <ul className="mini-history-list">{meals.map((m, i) => (<li key={i}><strong>{m.date}</strong> · {m.meal}: {m.description}</li>))}</ul>
        )}
      </section>

      <section className="home-section">
        <h2>ประวัติการออกกำลังกายล่าสุด</h2>
        {exercises.length === 0 ? <EmptyState icon={Activity} title="ยังไม่มีข้อมูล" /> : (
          <ul className="mini-history-list">{exercises.map((ex, i) => (<li key={i}><strong>{ex.date}</strong> · {ex.activity}</li>))}</ul>
        )}
      </section>

      <button className="btn-secondary btn-full" onClick={() => navigate(ROUTES.CAREGIVER_HEALTH_LOG)}>
        ไปที่หน้าบันทึกสุขภาพ →
      </button>
    </div>
  );
}