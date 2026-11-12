import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { nurseService } from '../../services/nurseService.js';
import { healthService } from '../../services/healthService.js';
import { carePlanService } from '../../services/carePlanService.js';
import { educationService } from '../../services/educationService.js';
import HealthOverview from '../../components/common/HealthOverview.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ChatPanel from '../../components/common/ChatPanel.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import NurseAppointmentTab from '../../components/nurse/NurseAppointmentTab.jsx';
import AssignCarePlanForm from '../../components/nurse/AssignCarePlanForm.jsx';
import AssignEducationForm from '../../components/nurse/AssignEducationForm.jsx';
import './NursePatientDetailPage.css';

const TABS = ['Health Data', 'Care Plan', 'Education', 'Chat', 'Appointment', 'Medical History'];

const carePlanStatusLabel = {
  ACTIVE: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
  PAUSED: 'หยุดชั่วคราว',
  EXPIRED: 'หมดอายุ',
};

const eduStatusLabel = {
  ASSIGNED: 'มอบหมายแล้ว',
  NOT_STARTED: 'ยังไม่เริ่ม',
  IN_PROGRESS: 'กำลังเรียน',
  COMPLETED: 'เรียนจบแล้ว',
};

export default function NursePatientDetailPage() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  // มาจากการค้นหาที่ Header: ?tab=Care%20Plan|Education|Chat|... → เปิดแท็บนั้นทันที
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.includes(tabParam) ? tabParam : 'Health Data');
  useEffect(() => {
    if (TABS.includes(tabParam)) setTab(tabParam);
  }, [tabParam]);
  const [health, setHealth] = useState(null);
  const [meals, setMeals] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [education, setEducation] = useState([]);
  const [error, setError] = useState(false);
  const [showCarePlanForm, setShowCarePlanForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);

  const loadAll = useCallback(() => {
    setError(false);
    Promise.all([
      nurseService.getPatientDetail(patientId),
      healthService.getSmbg(patientId),
      healthService.getBloodPressure(patientId),
      healthService.getHbA1c(patientId),
      healthService.getLdl(patientId),
      healthService.getMeals(patientId),
      healthService.getExercises(patientId),
      carePlanService.getCarePlans(patientId),
      educationService.getEducationList(patientId),
    ])
      .then(([p, smbg, bp, hba1c, ldl, mealList, exerciseList, plans, edu]) => {
        setPatient(p);
        setHealth({ smbg, bp, hba1c, ldl });
        setMeals(mealList.slice(-5).reverse());
        setExercises(exerciseList.slice(-5).reverse());
        setCarePlans(plans);
        setEducation(edu);
      })
      .catch((err) => {
        console.error('NursePatientDetailPage load error:', err);
        setError(true);
      });
  }, [patientId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลผู้ป่วยได้" onRetry={loadAll} />;
  if (!patient || !health) return <LoadingState />;

  const genderLabel = patient.gender === 'male' ? 'ชาย' : patient.gender === 'female' ? 'หญิง' : '-';
  const caregiverLabel = patient.caregiverLabel || '-';

  const personalInfoFields = [
    ['ชื่อ-นามสกุล', patient.name],
    ['HN', patient.hn],
    ['วันเดือนปีเกิด', patient.dob],
    ['เพศ', genderLabel],
    ['เบอร์โทรศัพท์', patient.phone],
    ['เบอร์ติดต่อสำรอง', patient.secondaryContact],
    ['ความสัมพันธ์กับผู้ดูแล', caregiverLabel],
    ['ที่อยู่ปัจจุบัน', patient.address],
    ['โรคประจำตัวร่วม', patient.comorbidities],
    ['ประวัติการแพ้ยา', patient.drugAllergies],
  ];

  return (
    <div className="patient-detail-page">
      <div className="patient-detail-header">
        <h1>{patient.name}</h1>
        <p>HN: {patient.hn} · <StatusBadge status={patient.alertSeverity} /></p>
      </div>

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Health Data — Alert ล่าสุด + ภาพรวม + กราฟแนวโน้ม + ประวัติอาหาร/ออกกำลังกาย */}
      {tab === 'Health Data' && (
        <div>
          <div className="detail-panel" style={{ marginBottom: 16 }}>
            {patient.latestAbnormal ? (
              <p>
                <strong>Alert ล่าสุด:</strong> {patient.latestAbnormal.metric} ={' '}
                {patient.latestAbnormal.value} {patient.latestAbnormal.unit}
              </p>
            ) : (
              <p><strong>Alert ล่าสุด:</strong> ไม่มีค่าผิดปกติ</p>
            )}
            <p><strong>สถานะ Alert:</strong> <StatusBadge status={patient.alertSeverity} /></p>
            {patient.lastUpdated && (
              <p><strong>อัปเดตล่าสุด:</strong> {new Date(patient.lastUpdated).toLocaleString('th-TH')}</p>
            )}
          </div>

          <h3 className="section-subheading">ภาพรวมข้อมูลสุขภาพ</h3>
          <HealthOverview health={health} />

          <h3 className="section-subheading">ประวัติการรับประทานอาหาร</h3>
          {meals.length === 0 ? <EmptyState icon="🍽️" title="ยังไม่มีข้อมูล" /> : (
            <ul className="mini-history-list">{meals.map((m, i) => (<li key={i}><strong>{m.date}</strong> · {m.meal}: {m.description}</li>))}</ul>
          )}

          <h3 className="section-subheading">ประวัติการออกกำลังกาย</h3>
          {exercises.length === 0 ? <EmptyState icon="🏃" title="ยังไม่มีข้อมูล" /> : (
            <ul className="mini-history-list">{exercises.map((ex, i) => (<li key={i}><strong>{ex.date}</strong> · {ex.activity} ({ex.duration} นาที, {ex.distance} กม.)</li>))}</ul>
          )}
        </div>
      )}

      {/* Care Plan — สร้างแผนการดูแลใหม่ได้จริงผ่าน AssignCarePlanForm (POST /api/care-plans/:patientId) */}
      {tab === 'Care Plan' && (
        <div>
          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowCarePlanForm(true)}>
            + สร้างแผนการดูแลใหม่
          </button>

          {carePlans.length === 0 ? (
            <EmptyState icon="📋" title="ยังไม่มีแผนการดูแล" />
          ) : (
            <div className="care-plan-list">
              {carePlans.map((cp) => (
                <div key={cp._id} className="care-plan-card">
                  <div className="care-plan-header">
                    <h3>{cp.goal}</h3>
                    <span className={`plan-status-tag ${cp.status === 'ACTIVE' ? 'active' : ''}`}>
                      {carePlanStatusLabel[cp.status] || cp.status}
                    </span>
                  </div>
                  <p><strong>สิ่งที่ต้องทำ:</strong> {cp.action}</p>
                  <p><strong>ความถี่:</strong> {cp.frequency}</p>
                  <p><strong>เป้าหมาย:</strong> {cp.target}</p>
                  <p className="care-plan-dates">
                    {String(cp.startDate).slice(0, 10)} — {String(cp.dueDate).slice(0, 10)} · กำหนดโดย {cp.createdBy}
                  </p>
                </div>
              ))}
            </div>
          )}

          {showCarePlanForm && (
            <div className="modal-overlay" onClick={() => setShowCarePlanForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <AssignCarePlanForm
                  patientId={patientId}
                  onCancel={() => setShowCarePlanForm(false)}
                  onDone={() => { setShowCarePlanForm(false); loadAll(); }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Education — มอบหมายบทเรียนสุขภาพใหม่ได้จริงผ่าน AssignEducationForm (POST /api/educations/:patientId) */}
      {tab === 'Education' && (
        <div>
          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowEducationForm(true)}>
            + มอบหมายความรู้สุขภาพใหม่
          </button>

          {education.length === 0 ? (
            <EmptyState icon="📚" title="ยังไม่มีการมอบหมายความรู้สุขภาพ" />
          ) : (
            <div className="education-list">
              {education.map((ed) => (
                <div key={ed._id} className="education-card">
                  <span className="education-category">{ed.category}</span>
                  <h3>{ed.title}</h3>
                  {ed.description && <p>{ed.description}</p>}
                  {ed.contentUrl && (
                    <a href={ed.contentUrl} target="_blank" rel="noreferrer">🔗 เปิดสื่อการสอน</a>
                  )}
                  <span className={`edu-status-tag edu-${ed.status.toLowerCase()}`}>
                    {eduStatusLabel[ed.status] || ed.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showEducationForm && (
            <div className="modal-overlay" onClick={() => setShowEducationForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <AssignEducationForm
                  patientId={patientId}
                  onCancel={() => setShowEducationForm(false)}
                  onDone={() => { setShowEducationForm(false); loadAll(); }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Chat' && <ChatPanel patientId={patientId} currentRole="nurse" />}

      {tab === 'Appointment' && <NurseAppointmentTab patient={patient} />}

      {/* Medical History — ข้อมูลส่วนตัวผู้ป่วยทั้งหมด ตั้งแต่ชื่อ-นามสกุล ถึงประวัติแพ้ยา */}
      {tab === 'Medical History' && (
        <div className="detail-panel">
          <h3 className="section-subheading" style={{ marginTop: 0 }}>ข้อมูลส่วนตัวผู้ป่วย</h3>
          <table className="info-detail-table">
            <tbody>
              {personalInfoFields.map(([label, value]) => (
                <tr key={label}>
                  <td className="info-label">{label}</td>
                  <td>{value || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="medical-history-note">
            🔒 ข้อมูลนี้เป็นข้อมูลส่วนบุคคลที่ได้รับการคุ้มครองตาม PDPA
            ห้ามเปิดเผย คัดลอก หรือส่งต่อแก่บุคคลภายนอกที่ไม่เกี่ยวข้อง
          </p>
        </div>
      )}
    </div>
  );
}