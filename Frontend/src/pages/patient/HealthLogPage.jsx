import React, { useState } from 'react';
import SmbgForm from '../../components/patient/SmbgForm.jsx';
import BloodPressureForm from '../../components/patient/BloodPressureForm.jsx';
import MealForm from '../../components/patient/MealForm.jsx';
import ExerciseForm from '../../components/patient/ExerciseForm.jsx';
import HbA1cForm from '../../components/patient/HbA1cForm.jsx';
import LdlForm from '../../components/patient/LDLForm.jsx';
import './HealthLogPage.css';

const TABS = [
  { key: 'smbg', label: 'น้ำตาลในเลือด' },
  { key: 'bp', label: 'ความดันโลหิต' },
  { key: 'meal', label: 'อาหาร' },
  { key: 'exercise', label: 'ออกกำลังกาย' },
  { key: 'hba1c', label: 'HbA1c' },
  { key: 'ldl', label: 'ไขมันในเลือด' },
];

export default function HealthLogPage() {
  const [activeTab, setActiveTab] = useState('smbg');

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
        {activeTab === 'smbg' && <SmbgForm />}
        {activeTab === 'bp' && <BloodPressureForm />}
        {activeTab === 'meal' && <MealForm />}
        {activeTab === 'exercise' && <ExerciseForm />}
        {activeTab === 'hba1c' && <HbA1cForm />}
        {activeTab === 'ldl' && <LdlForm />}
      </div>
    </div>
  );
}