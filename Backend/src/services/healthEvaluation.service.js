import ApiError from '../utils/ApiError.js';
import { getRange, worstSeverity, isBpCombinationPossible } from '../constants/healthRanges.js';

const DISCLAIMER =
  'Placeholder clinical rule — replace with validated clinical guideline before clinical use.';

function need(metric, key, label) {
  const range = getRange(metric, key);
  if (!range) throw new ApiError(400, `กรุณาเลือกช่วงค่า${label}ให้ถูกต้อง`);
  return range;
}

const withMsg = (range, label, unit) => ({
  severity: range.severity,
  message: `${label} ${range.short} ${unit} — ${range.meaning} — ${DISCLAIMER}`,
});

export function evaluateSmbg({ rangeKey }) {
  return withMsg(need('smbg', rangeKey, 'น้ำตาลในเลือด'), 'น้ำตาลในเลือด', 'mg/dL');
}

export function evaluateBloodPressure({ systolicRangeKey, diastolicRangeKey, pulseRangeKey }) {
  const sys = need('systolic', systolicRangeKey, ' Systolic');
  const dia = need('diastolic', diastolicRangeKey, ' Diastolic');
  const pulse = pulseRangeKey ? need('pulse', pulseRangeKey, 'ชีพจร') : null;

  const severity = worstSeverity([sys.severity, dia.severity, pulse?.severity].filter(Boolean));
  const pulseText = pulse ? ` ชีพจร ${pulse.short} ครั้ง/นาที` : '';
  return {
    severity,
    message: `ความดันโลหิต ${sys.short}/${dia.short} mmHg${pulseText} — ${DISCLAIMER}`,
  };
}

export function evaluateHba1c({ rangeKey }) {
  return withMsg(need('hba1c', rangeKey, ' HbA1c'), 'HbA1c', '%');
}

export function evaluateLdl({ rangeKey }) {
  return withMsg(need('ldl', rangeKey, ' LDL'), 'LDL', 'mg/dL');
}

/**
 * evaluate: dispatcher ตาม type ของ HealthRecord
 */
export function evaluate(type, payload) {
  switch (type) {
    case 'SMBG':
      return evaluateSmbg(payload.smbg || {});
    case 'BLOOD_PRESSURE':
      return evaluateBloodPressure(payload.bloodPressure || {});
    case 'HBA1C':
      return evaluateHba1c(payload.hba1c || {});
    case 'LDL':
      return evaluateLdl(payload.ldl || {});
    default:
      return { severity: null, message: DISCLAIMER };
  }
}

/**
 * buildRecordFromRanges
 * รับ body จาก Client (มีแต่ rangeKey) -> คืน sub-document ที่พร้อมบันทึก + severity/message
 * ค่าตัวเลข (value / systolic / diastolic / pulse) ถูกกำหนดที่ Backend จากค่ากลางของช่วงเท่านั้น
 */
export function buildRecordFromRanges(type, body) {
  switch (type) {
    case 'SMBG': {
      const range = need('smbg', body.smbg?.rangeKey, 'น้ำตาลในเลือด');
      const data = {
        smbg: {
          value: range.plot,
          rangeKey: range.key,
          measurementType: body.smbg?.measurementType || 'other',
        },
      };
      return { data, ...evaluate(type, data) };
    }
    case 'BLOOD_PRESSURE': {
      const sysKey = body.bloodPressure?.systolicRangeKey;
      const diaKey = body.bloodPressure?.diastolicRangeKey;
      const pulseKey = body.bloodPressure?.pulseRangeKey || null;
      const sys = need('systolic', sysKey, ' Systolic');
      const dia = need('diastolic', diaKey, ' Diastolic');
      const pulse = pulseKey ? need('pulse', pulseKey, 'ชีพจร') : null;

      if (!isBpCombinationPossible(sysKey, diaKey)) {
        throw new ApiError(400, 'ค่า Systolic ต้องไม่ต่ำกว่าค่า Diastolic กรุณาเลือกช่วงค่าใหม่');
      }

      const data = {
        bloodPressure: {
          systolic: sys.plot,
          diastolic: dia.plot,
          pulse: pulse ? pulse.plot : null,
          systolicRangeKey: sys.key,
          diastolicRangeKey: dia.key,
          pulseRangeKey: pulse ? pulse.key : null,
        },
      };
      return { data, ...evaluate(type, data) };
    }
    case 'HBA1C': {
      const range = need('hba1c', body.hba1c?.rangeKey, ' HbA1c');
      const data = { hba1c: { value: range.plot, rangeKey: range.key } };
      return { data, ...evaluate(type, data) };
    }
    case 'LDL': {
      const range = need('ldl', body.ldl?.rangeKey, ' LDL');
      const data = { ldl: { value: range.plot, rangeKey: range.key } };
      return { data, ...evaluate(type, data) };
    }
    default:
      throw new ApiError(400, 'type ไม่ถูกต้อง');
  }
}

export default {
  evaluate,
  evaluateSmbg,
  evaluateBloodPressure,
  evaluateHba1c,
  evaluateLdl,
  buildRecordFromRanges,
};
