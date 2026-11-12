import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import SmbgForm from '../../components/patient/SmbgForm.jsx';
import BloodPressureForm from '../../components/patient/BloodPressureForm.jsx';
import MealForm from '../../components/patient/MealForm.jsx';
import ExerciseForm from '../../components/patient/ExerciseForm.jsx';
import HbA1cForm from '../../components/patient/HbA1cForm.jsx';
import LdlForm from '../../components/patient/LDLForm.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import '../patient/HealthLogPage.css';

// หน้าบันทึกข้อมูลสุขภาพของผู้ดูแล — เหมือนกับหน้าบันทึกข้อมูลสุขภาพของผู้ป่วยทุกประการ
// (6 แท็บ: น้ำตาล/ความดัน/อาหาร/ออกกำลังกาย/HbA1c/ไขมันในเลือด) เพียงแต่บันทึกแทนผู้ป่วยที่ผูกอยู่
// (link.patientId) และระบุว่า "บันทึกโดยผู้ดูแล" ไว้ในข้อมูลเสมอเพื่อความโปร่งใส
// ผู้ดูแลที่เชื่อมโยงและได้รับอนุมัติแล้วบันทึกข้อมูลได้ทันทีโดยไม่ต้องขอสิทธิ์เพิ่มเติม
const TABS = [
  { key: 'smbg', label: 'น้ำตาลในเลือด' },
  { key: 'bp', label: 'ความดันโลหิต' },
  { key: 'meal', label: 'อาหาร' },
  { key: 'exercise', label: 'ออกกำลังกาย' },
  { key: 'hba1c', label: 'HbA1c' },
  { key: 'ldl', label: 'ไขมันในเลือด' },
];

export default function CaregiverHealthLogPage() {
  const { link } = useOutletContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('smbg');

  const formProps = { patientId: link.patientId, recordedBy: 'caregiver', recordedByName: user?.name };

  return (
    <div className="health-log-page">
      <div className="tab-bar" role="tablist">
        {TABS.map((tab) => (
          <button key={tab.key} role="tab" aria-selected={activeTab === tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-panel">
        {activeTab === 'smbg' && <SmbgForm {...formProps} />}
        {activeTab === 'bp' && <BloodPressureForm {...formProps} />}
        {activeTab === 'meal' && <MealForm {...formProps} />}
        {activeTab === 'exercise' && <ExerciseForm {...formProps} />}
        {activeTab === 'hba1c' && <HbA1cForm {...formProps} />}
        {activeTab === 'ldl' && <LdlForm {...formProps} />}
      </div>
    </div>
  );
}