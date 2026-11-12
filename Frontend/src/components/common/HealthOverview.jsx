import React, { useMemo, useState } from 'react';
import DataCard from './DataCard.jsx';
import ChartCard from './ChartCard.jsx';
import './HealthOverview.css';

const CHART_TABS = [
  { key: 'smbg', label: 'น้ำตาล' },
  { key: 'systolic', label: 'ความดันตัวบน' },
  { key: 'diastolic', label: 'ความดันตัวล่าง' },
  { key: 'pulse', label: 'ชีพจร' },
  { key: 'hba1c', label: 'HbA1c' },
  { key: 'ldl', label: 'LDL' },
];

const last = (list) => (list && list.length ? list[list.length - 1] : undefined);

/**
 * HealthOverview — การ์ดค่าล่าสุด + กราฟแนวโน้ม (ใช้ร่วมกันทั้งหน้าผู้ป่วย / ผู้ดูแล / พยาบาล)
 *
 * health: { smbg[], bp[], hba1c[], ldl[] }  — เรียงเก่า -> ใหม่ (จาก healthService)
 * ค่าที่แสดงบนการ์ดคือ "ช่วงที่ผู้ใช้เลือก" ส่วนกราฟพล็อตที่ค่ากลางของช่วง
 * ระดับความรุนแรงมาจาก Backend (evaluatedSeverity) ไม่ประเมินซ้ำที่หน้าจอ
 */
export default function HealthOverview({ health }) {
  const [selected, setSelected] = useState('smbg');

  const latest = {
    smbg: last(health.smbg),
    bp: last(health.bp),
    hba1c: last(health.hba1c),
    ldl: last(health.ldl),
  };

  const charts = useMemo(
    () => ({
      smbg: {
        title: 'ระดับน้ำตาลในเลือด',
        unit: 'mg/dL',
        yLabel: 'ระดับน้ำตาลในเลือด (mg/dL)',
        data: health.smbg.map((d) => ({ date: d.date, value: d.value, label: d.rangeLabel })),
      },
      systolic: {
        title: 'ความดันโลหิตตัวบน (Systolic)',
        unit: 'mmHg',
        yLabel: 'Systolic (mmHg)',
        data: health.bp.map((d) => ({ date: d.date, value: d.systolic, label: d.systolicLabel })),
      },
      diastolic: {
        title: 'ความดันโลหิตตัวล่าง (Diastolic)',
        unit: 'mmHg',
        yLabel: 'Diastolic (mmHg)',
        data: health.bp.map((d) => ({ date: d.date, value: d.diastolic, label: d.diastolicLabel })),
      },
      pulse: {
        title: 'ชีพจร',
        unit: 'ครั้ง/นาที',
        yLabel: 'ชีพจร (ครั้ง/นาที)',
        data: health.bp
          .filter((d) => d.pulse != null)
          .map((d) => ({ date: d.date, value: d.pulse, label: d.pulseLabel })),
      },
      hba1c: {
        title: 'HbA1c',
        unit: '%',
        yLabel: 'HbA1c (%)',
        data: health.hba1c.map((d) => ({ date: d.date, value: d.value, label: d.rangeLabel })),
      },
      ldl: {
        title: 'LDL Cholesterol',
        unit: 'mg/dL',
        yLabel: 'LDL (mg/dL)',
        data: health.ldl.map((d) => ({ date: d.date, value: d.value, label: d.rangeLabel })),
      },
    }),
    [health]
  );

  const chart = charts[selected];

  return (
    <div className="health-overview">
      <div className="dashboard-grid">
        <DataCard
          title="ระดับน้ำตาล (SMBG)"
          value={latest.smbg?.rangeLabel ?? latest.smbg?.value}
          unit="mg/dL"
          dateTime={latest.smbg?.date}
          status={latest.smbg?.severity || 'NORMAL'}
          onClick={() => setSelected('smbg')}
        />
        <DataCard
          title="ความดันโลหิต"
          value={
            latest.bp
              ? `${latest.bp.systolicLabel ?? latest.bp.systolic} / ${latest.bp.diastolicLabel ?? latest.bp.diastolic}`
              : null
          }
          unit="mmHg"
          dateTime={latest.bp?.date}
          status={latest.bp?.severity || 'NORMAL'}
          trendSummary={latest.bp?.pulseLabel ? `ชีพจร ${latest.bp.pulseLabel}` : undefined}
          onClick={() => setSelected('systolic')}
        />
        <DataCard
          title="HbA1c"
          value={latest.hba1c?.rangeLabel ?? latest.hba1c?.value}
          unit="%"
          dateTime={latest.hba1c?.date}
          status={latest.hba1c?.severity || 'NORMAL'}
          onClick={() => setSelected('hba1c')}
        />
        <DataCard
          title="LDL Cholesterol"
          value={latest.ldl?.rangeLabel ?? latest.ldl?.value}
          unit="mg/dL"
          dateTime={latest.ldl?.date}
          status={latest.ldl?.severity || 'NORMAL'}
          onClick={() => setSelected('ldl')}
        />
      </div>

      <div className="tab-bar health-overview-tabs" role="tablist" aria-label="เลือกกราฟที่ต้องการดู">
        {CHART_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={selected === t.key}
            className={`tab-btn ${selected === t.key ? 'active' : ''}`}
            onClick={() => setSelected(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ChartCard title={chart.title} unit={chart.unit} yLabel={chart.yLabel} data={chart.data} />
    </div>
  );
}
