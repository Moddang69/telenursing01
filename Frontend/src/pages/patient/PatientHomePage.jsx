import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService.js';
import { healthService } from '../../services/healthService.js';
import HealthOverview from '../../components/common/HealthOverview.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { APPOINTMENT_STATUS } from '../../constants/statuses.js';
import './PatientHomePage.css';

export default function PatientHomePage() {
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(undefined);
  const [health, setHealth] = useState(null);
  const [meals, setMeals] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      appointmentService.getUpcomingAppointment(),
      healthService.getSmbg(),
      healthService.getBloodPressure(),
      healthService.getHbA1c(),
      healthService.getLdl(),
      healthService.getMeals(),
      healthService.getExercises(),
    ])
      .then(([apt, smbg, bp, hba1c, ldl, mealList, exerciseList]) => {
        setAppointment(apt);
        setHealth({ smbg, bp, hba1c, ldl });
        setMeals(mealList.slice(-3).reverse());
        setExercises(exerciseList.slice(-3).reverse());
      })
      .catch((err) => {
        console.error('PatientHomePage load error:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลหน้าหลักได้" onRetry={load} />;
  if (loading || !health) return <LoadingState />;

  return (
    <div className="patient-home">
      {/* 1. การนัดหมายที่จะมาถึง */}
      <section className="home-section">
        <h2>การนัดหมายที่จะถึง</h2>
        {appointment ? (
          <div className="appointment-card">
            <p className="appointment-date">{appointment.date} เวลา {appointment.time} น.</p>
            <p><strong>พยาบาล:</strong> {appointment.nurseName}</p>
            <p><strong>สาเหตุ:</strong> {appointment.reason}</p>
            <p className="appointment-status">สถานะ: {appointment.status}</p>
            {appointment.status !== APPOINTMENT_STATUS.COMPLETED && (
              <button className="btn-primary btn-large" onClick={() => navigate('/patient/pre-consult-check')}>
                🎥 เข้าห้องรอ
              </button>
            )}
          </div>
        ) : (
          <EmptyState icon="📅" title="ยังไม่มีนัดหมาย" description="เมื่อพยาบาลนัดหมายท่าน จะแสดงผลที่นี่" />
        )}
      </section>

      {/* 2. ภาพรวมข้อมูลสุขภาพ */}
      <section className="home-section">
        <h2>ภาพรวมข้อมูลสุขภาพ</h2>
        <HealthOverview health={health} />
      </section>

      {/* 3. ประวัติการรับประทานอาหารและการออกกำลังกาย */}
      <section className="home-section">
        <h2>ประวัติการรับประทานอาหารล่าสุด</h2>
        {meals.length === 0 ? (
          <EmptyState icon="🍽️" title="ยังไม่มีข้อมูลการรับประทานอาหาร" />
        ) : (
          <ul className="mini-history-list">
            {meals.map((m, i) => (<li key={i}><strong>{m.date}</strong> · {m.meal}: {m.description}</li>))}
          </ul>
        )}
      </section>

      <section className="home-section">
        <h2>ประวัติการออกกำลังกายล่าสุด</h2>
        {exercises.length === 0 ? (
          <EmptyState icon="🏃" title="ยังไม่มีข้อมูลการออกกำลังกาย" />
        ) : (
          <ul className="mini-history-list">
            {exercises.map((ex, i) => (<li key={i}><strong>{ex.date}</strong> · {ex.activity} ({ex.duration} นาที, {ex.distance} กม.)</li>))}
          </ul>
        )}
      </section>

      <button className="btn-secondary btn-full" onClick={() => navigate('/patient/health-log')}>
        ไปที่หน้าบันทึกสุขภาพ →
      </button>
    </div>
  );
}