import React, { useState, useMemo } from 'react';
import './ChartCard.css';

const CHART_W = 340;
const CHART_H = 260;
const PAD_LEFT = 58;
const PAD_RIGHT = 14;
const PAD_TOP = 26;
const PAD_BOTTOM = 52;

// วันที่ "YYYY-MM-DD" -> "DD-MM" (วัน-เดือน)
const formatDayMonth = (date) => {
  if (!date) return '';
  const [, m, d] = String(date).slice(0, 10).split('-');
  return d && m ? `${d}-${m}` : String(date);
};

const fmt = (n) => Number(Number(n).toFixed(1));

/**
 * ChartCard — กราฟเส้นแนวโน้ม
 *
 * data: [{ date: 'YYYY-MM-DD', value: number, label?: string }]  เรียงจาก "เก่า -> ใหม่"
 *   - value = ค่าที่ใช้พล็อต (ค่ากลางของช่วงที่ผู้ใช้เลือก เช่น 70–99 => 84.5)
 *   - label = ช่วงที่เลือก (เช่น "70 – 99") ใช้แสดงใน tooltip / ต่ำสุด-สูงสุด
 *
 * การแสดงผล:
 *   - แกนตั้ง (Y) = ค่าตัวชี้วัด พร้อมหน่วย  |  แกนนอน (X) = วัน-เดือน
 *   - ข้อมูล "เก่าอยู่ทางซ้าย" ไล่ไปจนถึง "ใหม่ล่าสุดอยู่ทางขวา" (เรียงตามเวลาปกติ)
 */
export default function ChartCard({ title, data, unit, yLabel, xLabel = 'วัน-เดือน' }) {
  const [range, setRange] = useState(7);

  // กรองตามจำนวน "วัน" ย้อนหลังจริง โดยคงลำดับเดิม (เก่า -> ใหม่) ไว้ตามที่ได้รับมา
  // เพื่อให้ซ้าย = เก่า, ขวา = ใหม่ล่าสุด
  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (range - 1));
    return data.filter(
      (d) => d.date && new Date(`${String(d.date).slice(0, 10)}T00:00:00`) >= cutoff
    );
  }, [data, range]);

  const chartMeta = useMemo(() => {
    if (filtered.length === 0) return null;
    const values = filtered.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const drawW = CHART_W - PAD_LEFT - PAD_RIGHT;
    const drawH = CHART_H - PAD_TOP - PAD_BOTTOM;
    const step = filtered.length > 1 ? drawW / (filtered.length - 1) : 0;

    const coords = filtered.map((d, i) => {
      const x = filtered.length > 1 ? PAD_LEFT + i * step : PAD_LEFT + drawW / 2;
      const y = max === min ? PAD_TOP + drawH / 2 : PAD_TOP + drawH - ((d.value - min) / (max - min)) * drawH;
      return { x, y, value: d.value, date: d.date, label: d.label };
    });

    // 4 เส้น Grid แนวนอน อ้างอิงค่า min-max
    const gridLines = [0, 1, 2, 3].map((i) => {
      const y = PAD_TOP + (drawH / 3) * i;
      const value = fmt(max - ((max - min) / 3) * i);
      return { y, value };
    });

    const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const lowest = filtered.reduce((a, b) => (b.value < a.value ? b : a));
    const highest = filtered.reduce((a, b) => (b.value > a.value ? b : a));
    return { coords, linePoints, min, max, gridLines, drawW, drawH, lowest, highest };
  }, [filtered]);

  const skip = chartMeta ? Math.max(1, Math.ceil(chartMeta.coords.length / 7)) : 1; // ไม่ให้วันที่ทับกันเมื่อมีจุดเยอะ
  const yTitle = yLabel || (unit ? `${title} (${unit})` : title);
  const plotBottom = CHART_H - PAD_BOTTOM;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3>{title}</h3>
        <div className="chart-range-tabs">
          {[7, 14, 30].map((r) => (
            <button key={r} className={`chart-range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
              {r} วัน
            </button>
          ))}
        </div>
      </div>

      {!chartMeta ? (
        <p className="chart-empty">ยังไม่มีข้อมูลในช่วงเวลานี้</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="chart-svg" role="img" aria-label={`กราฟแนวโน้ม ${yTitle} ข้อมูลเก่าอยู่ทางซ้าย ข้อมูลใหม่ล่าสุดอยู่ทางขวา`}>
            {/* แกนตั้ง — เส้น Grid + ตัวเลขค่าอ้างอิง */}
            {chartMeta.gridLines.map((g, i) => (
              <g key={i}>
                <line x1={PAD_LEFT} y1={g.y} x2={CHART_W - PAD_RIGHT} y2={g.y} className="chart-grid-line" />
                <text x={PAD_LEFT - 6} y={g.y + 4} textAnchor="end" className="chart-axis-label">{g.value}</text>
              </g>
            ))}

            {/* ชื่อแกนตั้ง (หมุน 90°) */}
            <text
              transform={`translate(13 ${PAD_TOP + chartMeta.drawH / 2}) rotate(-90)`}
              textAnchor="middle"
              className="chart-axis-title"
            >
              {yTitle}
            </text>

            {/* แกนนอน — เส้นฐาน */}
            <line x1={PAD_LEFT} y1={plotBottom} x2={CHART_W - PAD_RIGHT} y2={plotBottom} className="chart-axis-line" />

            {/* ชื่อแกนนอน */}
            <text x={PAD_LEFT + chartMeta.drawW / 2} y={CHART_H - 6} textAnchor="middle" className="chart-axis-title">
              {xLabel}
            </text>

            {/* เส้นกราฟหลัก */}
            <polyline points={chartMeta.linePoints} fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

            {/* จุดข้อมูล + ค่า + วัน-เดือน */}
            {chartMeta.coords.map((c, i) => (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="5" fill="var(--color-primary-dark)" stroke="var(--color-surface)" strokeWidth="1.5">
                  <title>{`${formatDayMonth(c.date)}: ${c.label ? `${c.label} (พล็อตที่ ${fmt(c.value)})` : fmt(c.value)}`}</title>
                </circle>
                {(chartMeta.coords.length <= 10 || i % skip === 0) && (
                  <text x={c.x} y={c.y - 12} textAnchor="middle" className="chart-point-label">{fmt(c.value)}</text>
                )}
                {i % skip === 0 && (
                  <text
                    x={c.x}
                    y={plotBottom + 16}
                    textAnchor="middle"
                    className="chart-axis-label-x"
                  >
                    {formatDayMonth(c.date)}
                  </text>
                )}
              </g>
            ))}
          </svg>
          
          <div className="chart-minmax">
            <span>ต่ำสุด: {chartMeta.lowest.label || fmt(chartMeta.lowest.value)} {unit}</span>
            <span>สูงสุด: {chartMeta.highest.label || fmt(chartMeta.highest.value)} {unit}</span>
          </div>
        </>
      )}
    </div>
  );
}