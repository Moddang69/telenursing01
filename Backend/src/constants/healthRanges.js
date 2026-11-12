export const SEVERITY_ORDER = ['NORMAL', 'WARNING', 'HIGH', 'CRITICAL'];

export const HEALTH_RANGES = {
  // ---------------- น้ำตาลในเลือด (mg/dL) ----------------
  smbg: [
    { key: 'glu_lt70', short: 'ต่ำกว่า 70', min: 20, max: 69, plot: 54.5, severity: 'CRITICAL',
      meaning: 'น้ำตาลต่ำอันตราย – เสี่ยงช็อกหมดสติ' },
    { key: 'glu_70_99', short: '70 – 99', min: 70, max: 99, plot: 84.5, severity: 'NORMAL',
      meaning: 'ดีเยี่ยม – ควบคุมได้ดีเยี่ยม' },
    { key: 'glu_100_125', short: '100 – 125', min: 100, max: 125, plot: 112.5, severity: 'NORMAL',
      meaning: 'ดี – ควบคุมได้ดี' },
    { key: 'glu_126_249', short: '126 – 249', min: 126, max: 249, plot: 187.5, severity: 'WARNING',
      meaning: 'เริ่มสูง – ควรควบคุมอาหาร' },
    { key: 'glu_gte250', short: '250 ขึ้นไป', min: 250, max: 600, plot: 325, severity: 'CRITICAL',
      meaning: 'สูงวิกฤต/อันตราย – เสี่ยงภาวะแทรกซ้อนเฉียบพลัน/เลือดเป็นกรด' },
  ],

  // ---------------- ความดันโลหิต Systolic (mmHg) ----------------
  systolic: [
    { key: 'sys_lt90', short: 'ต่ำกว่า 90', min: 60, max: 89, plot: 74.5, severity: 'WARNING',
      meaning: 'ความดันต่ำ – เสี่ยงหน้ามืด เวียนศีรษะ วูบ' },
    { key: 'sys_90_120', short: '90 – 120', min: 90, max: 120, plot: 105, severity: 'NORMAL',
      meaning: 'ปกติ – เลือดไปเลี้ยงร่างกายได้ปกติ' },
    { key: 'sys_121_139', short: '121 – 139', min: 121, max: 139, plot: 130, severity: 'WARNING',
      meaning: 'เฝ้าระวัง/เริ่มสูง – ก่อนความดันโลหิตสูง ควรปรับพฤติกรรม' },
    { key: 'sys_gte140', short: '140 ขึ้นไป', min: 140, max: 260, plot: 160, severity: 'HIGH',
      meaning: 'สูง/อันตราย – เข้าข่ายโรคความดันโลหิตสูง (หากเกิน 180/120 ต้องพบแพทย์ทันที)' },
  ],

  // ---------------- ความดันโลหิต Diastolic (mmHg) ----------------
  diastolic: [
    { key: 'dia_lt60', short: 'ต่ำกว่า 60', min: 30, max: 59, plot: 49.5, severity: 'WARNING',
      meaning: 'ความดันต่ำ – เสี่ยงหน้ามืด เวียนศีรษะ วูบ' },
    { key: 'dia_60_80', short: '60 – 80', min: 60, max: 80, plot: 70, severity: 'NORMAL',
      meaning: 'ปกติ' },
    { key: 'dia_81_89', short: '81 – 89', min: 81, max: 89, plot: 85, severity: 'WARNING',
      meaning: 'เฝ้าระวัง/เริ่มสูง' },
    { key: 'dia_gte90', short: '90 ขึ้นไป', min: 90, max: 160, plot: 105, severity: 'HIGH',
      meaning: 'สูง/อันตราย – เข้าข่ายโรคความดันโลหิตสูง' },
  ],

  // ---------------- ชีพจร (ครั้ง/นาที) ----------------
  pulse: [
    { key: 'pulse_lt60', short: 'ต่ำกว่า 60', min: 30, max: 59, plot: 49.5, severity: 'WARNING',
      meaning: 'ช้ากว่าปกติ – หากเป็นนักกีฬาถือว่าปกติ แต่คนทั่วไปอาจใจสั่น เวียนศีรษะ หรือหมดสติได้' },
    { key: 'pulse_60_100', short: '60 – 100', min: 60, max: 100, plot: 80, severity: 'NORMAL',
      meaning: 'ปกติ – อัตราการเต้นของหัวใจขณะพักของคนสุขภาพดี' },
    { key: 'pulse_gt100', short: 'มากกว่า 100', min: 101, max: 250, plot: 120, severity: 'HIGH',
      meaning: 'เร็วกว่าปกติ/อันตราย – อาจเกิดจากไข้สูง ขาดน้ำ ช็อก หรือโรคหัวใจ (เกิน 130-140 ควรตรวจด่วน)' },
  ],

  // ---------------- HbA1c (%) — ช่วงที่เสนอ ----------------
  hba1c: [
    { key: 'a1c_lt57', short: 'ต่ำกว่า 5.7', min: 3, max: 5.6, plot: 4.8, severity: 'NORMAL',
      meaning: 'ปกติ/ดีเยี่ยม' },
    { key: 'a1c_57_64', short: '5.7 – 6.4', min: 5.7, max: 6.4, plot: 6.05, severity: 'NORMAL',
      meaning: 'ตามเป้าหมายดีมาก' },
    { key: 'a1c_65_69', short: '6.5 – 6.9', min: 6.5, max: 6.9, plot: 6.7, severity: 'WARNING',
      meaning: 'ตามเป้าหมาย' },
    { key: 'a1c_70_89', short: '7.0 – 8.9', min: 7, max: 8.9, plot: 7.95, severity: 'HIGH',
      meaning: 'เริ่มสูงกว่าเป้าหมาย – ควรเข้มงวดเรื่องอาหาร (ลดแป้ง/ของหวาน) ออกกำลังกายเพิ่ม' },
    { key: 'a1c_gte90', short: '9.0 ขึ้นไป', min: 9, max: 20, plot: 10.5, severity: 'CRITICAL',
      meaning: 'สูงวิกฤต/ควบคุมไม่ได้ – เสี่ยงต่อภาวะแทรกซ้อนระยะยาว' },
  ],

  // ---------------- LDL (mg/dL) — ช่วงที่เสนอ ----------------
  ldl: [
    { key: 'ldl_lt100', short: 'ต่ำกว่า 100', min: 0, max: 99, plot: 74.5, severity: 'NORMAL',
      meaning: 'ระดับที่เหมาะสม' },
    { key: 'ldl_100_129', short: '100 – 129', min: 100, max: 129, plot: 114.5, severity: 'NORMAL',
      meaning: 'ใกล้เคียงระดับที่เหมาะสม' },
    { key: 'ldl_130_159', short: '130 – 159', min: 130, max: 159, plot: 144.5, severity: 'WARNING',
      meaning: 'ค่อนข้างสูง – ควรควบคุมอาหารและออกกำลังกาย' },
    { key: 'ldl_160_189', short: '160 – 189', min: 160, max: 189, plot: 174.5, severity: 'HIGH',
      meaning: 'สูง – ควรปรึกษาแพทย์' },
    { key: 'ldl_gte190', short: '190 ขึ้นไป', min: 190, max: 500, plot: 210, severity: 'CRITICAL',
      meaning: 'สูงมาก – ควรพบแพทย์โดยเร็ว' },
  ],
};

export function getRange(metric, key) {
  return (HEALTH_RANGES[metric] || []).find((r) => r.key === key) || null;
}

export function isValidRangeKey(metric, key) {
  return !!getRange(metric, key);
}

export function worstSeverity(list) {
  let idx = -1;
  for (const s of list) {
    const i = SEVERITY_ORDER.indexOf(s);
    if (i > idx) idx = i;
  }
  return idx >= 0 ? SEVERITY_ORDER[idx] : null;
}

/**
 * ตรวจเงื่อนไข "Systolic ห้ามต่ำกว่า Diastolic" เมื่อเลือกเป็นช่วง
 * ผิดก็ต่อเมื่อ ค่าสูงสุดที่เป็นไปได้ของ Systolic < ค่าต่ำสุดที่เป็นไปได้ของ Diastolic
 * เช่น Systolic "ต่ำกว่า 90" (สูงสุด 89) + Diastolic "90 ขึ้นไป" (ต่ำสุด 90) => เป็นไปไม่ได้
 */
export function isBpCombinationPossible(systolicKey, diastolicKey) {
  const sys = getRange('systolic', systolicKey);
  const dia = getRange('diastolic', diastolicKey);
  if (!sys || !dia) return false;
  return sys.max >= dia.min;
}

export default HEALTH_RANGES;
