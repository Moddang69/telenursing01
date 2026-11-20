import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, BookOpen, Link, Check } from 'lucide-react';
import { carePlanService } from '../../services/carePlanService.js';
import { educationService } from '../../services/educationService.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { EDUCATION_STATUS, CARE_PLAN_STATUS } from '../../constants/statuses.js';
import './MyCarePage.css';

const eduStatusLabel = {
  [EDUCATION_STATUS.ASSIGNED]: 'ยังไม่เริ่ม',
  [EDUCATION_STATUS.NOT_STARTED]: 'ยังไม่เริ่ม',
  [EDUCATION_STATUS.IN_PROGRESS]: 'กำลังเรียน',
  [EDUCATION_STATUS.COMPLETED]: 'เรียนจบแล้ว',
};

// แปลงวันที่ ISO (เช่น 2026-09-29T00:00:00.000Z) ให้อ่านง่าย: DD-MM-YYYY HH:mm
const formatDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export default function MyCarePage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  // มาจากการค้นหาที่ Header: ?tab=careplan|education&highlight=<id> → เปิดแท็บที่ถูกต้องและเลื่อนไปที่รายการที่ค้นเจอ
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') === 'education' ? 'education' : 'careplan';
  const highlightId = searchParams.get('highlight');
  const [tab, setTab] = useState(tabParam);
  useEffect(() => {
    setTab(tabParam);
  }, [tabParam, highlightId]);
  const [carePlans, setCarePlans] = useState(null);
  const [education, setEducation] = useState(null);
  const [error, setError] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const patientId = user?.roleRefId;

  const loadData = React.useCallback(() => {
    if (!patientId) return;
    setError(false);
    setCarePlans(null);
    setEducation(null);
    Promise.all([carePlanService.getCarePlans(patientId), educationService.getEducationList(patientId)])
      .then(([cp, edu]) => {
        setCarePlans(cp);
        setEducation(edu);
      })
      .catch((err) => {
        console.error('MyCarePage load error:', err);
        setError(true);
      });
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // เลื่อนไปที่รายการที่ค้นเจอและกะพริบเน้นสั้นๆ (หลังโหลดข้อมูลเสร็จและแท็บถูกต้องแล้ว)
  useEffect(() => {
    if (!highlightId || carePlans === null || education === null) return undefined;
    const el = document.getElementById(`item-${highlightId}`);
    if (!el) return undefined;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('search-highlight');
    const timer = setTimeout(() => el.classList.remove('search-highlight'), 2500);
    return () => clearTimeout(timer);
  }, [highlightId, tab, carePlans, education]);

  // เปิดลิงก์เนื้อหาบทเรียนในแท็บใหม่ และอัปเดตสถานะเป็น "กำลังเรียน" ให้อัตโนมัติ
  // (เดิมการ์ดความรู้สุขภาพไม่มีลิงก์ให้กด ทำให้ผู้ป่วยเริ่มเรียนไม่ได้เลย)
  const handleStart = async (ed) => {
    if (ed.contentUrl) window.open(ed.contentUrl, '_blank', 'noopener,noreferrer');
    if (ed.status === EDUCATION_STATUS.COMPLETED) return;
    if (ed.status === EDUCATION_STATUS.IN_PROGRESS) return;

    setUpdatingId(ed.id);
    try {
      await educationService.updateEducationStatus(patientId, ed.id, EDUCATION_STATUS.IN_PROGRESS);
      setEducation((list) => list.map((item) => (item.id === ed.id ? { ...item, status: EDUCATION_STATUS.IN_PROGRESS } : item)));
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleComplete = async (ed) => {
    setUpdatingId(ed.id);
    try {
      await educationService.updateEducationStatus(patientId, ed.id, EDUCATION_STATUS.COMPLETED);
      setEducation((list) => list.map((item) => (item.id === ed.id ? { ...item, status: EDUCATION_STATUS.COMPLETED } : item)));
      showToast('บันทึกว่าเรียนจบบทเรียนนี้แล้ว', 'success');
    } catch (err) {
      showToast(err?.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (error) {
    return <ErrorState message="ไม่สามารถโหลดข้อมูลการดูแลของท่านได้ กรุณาลองใหม่อีกครั้ง" onRetry={loadData} />;
  }

  return (
    <div className="my-care-page">
      <div className="tab-bar" role="tablist">
        <button className={`tab-btn ${tab === 'careplan' ? 'active' : ''}`} onClick={() => setTab('careplan')}>
          แผนการดูแล
        </button>
        <button className={`tab-btn ${tab === 'education' ? 'active' : ''}`} onClick={() => setTab('education')}>
          ความรู้สุขภาพ
        </button>
      </div>

      {tab === 'careplan' && (
        carePlans === null ? <LoadingState /> :
        carePlans.length === 0 ? (
          <EmptyState icon={<ClipboardList size={48} />} title="ยังไม่มีแผนการดูแล" description="พยาบาลของท่านจะกำหนดแผนการดูแลให้เร็วๆนี้" />
        ) : (
          <div className="care-plan-list">
            {carePlans.map((cp) => (
              <div key={cp.id} id={`item-${cp.id}`} className="care-plan-card">
                <div className="care-plan-header">
                  <h3>{cp.goal}</h3>
                  <span className={`plan-status-tag ${cp.status === CARE_PLAN_STATUS.ACTIVE ? 'active' : ''}`}>
                    {cp.status}
                  </span>
                </div>
                <p><strong>สิ่งที่ต้องทำ:</strong> {cp.action}</p>
                <p><strong>ความถี่:</strong> {cp.frequency}</p>
                <p><strong>เป้าหมาย:</strong> {cp.target}</p>
                <p className="care-plan-dates">
                  {formatDateTime(cp.startDate)} — {formatDateTime(cp.dueDate)} · กำหนดโดย {cp.createdBy}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'education' && (
        education === null ? <LoadingState /> :
        education.length === 0 ? (
          <EmptyState icon={<BookOpen size={48} />} title="ยังไม่มีการมอบหมายความรู้สุขภาพ" />
        ) : (
          <div className="education-list">
            {education.map((ed) => (
              <div key={ed.id} id={`item-${ed.id}`} className="education-card">
                <span className="education-category">{ed.category}</span>
                <h3>{ed.title}</h3>
                {ed.description && <p className="education-description">{ed.description}</p>}
                <span className={`edu-status-tag edu-${ed.status.toLowerCase()}`}>
                  {eduStatusLabel[ed.status]}
                </span>

                <div className="education-actions">
                  {ed.contentUrl ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={updatingId === ed.id}
                      onClick={() => handleStart(ed)}
                    >
                      <Link size={16} className="inline-icon" /> {ed.status === EDUCATION_STATUS.COMPLETED ? 'เปิดดูเนื้อหาอีกครั้ง' : 'เริ่มเรียน / เปิดเนื้อหา'}
                    </button>
                  ) : (
                    ed.status !== EDUCATION_STATUS.IN_PROGRESS && ed.status !== EDUCATION_STATUS.COMPLETED && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={updatingId === ed.id}
                        onClick={() => handleStart(ed)}
                      >
                        เริ่มเรียน
                      </button>
                    )
                  )}

                  {ed.status !== EDUCATION_STATUS.COMPLETED && (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={updatingId === ed.id}
                      onClick={() => handleComplete(ed)}
                    >
                      <Check size={16} className="inline-icon" /> ทำเครื่องหมายว่าเรียนจบแล้ว
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}