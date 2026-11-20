import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, MapPin, AlertTriangle } from 'lucide-react';
import { validators } from '../../utils/validators.js';
import {
  locateCurrentPosition,
  getGeolocationPermission,
  watchGeolocationPermission,
} from '../../utils/geolocation.js';
import appointmentService from '../../services/appointmentService.js';
import videoCallService from '../../services/videoCallService.js';
import './PreConsultQuestionnairePage.css';

const SYMPTOM_OPTIONS = [
  { key: 'dry_mouth', label: 'ปากแห้ง / กระหายน้ำมาก' },
  { key: 'frequent_urination', label: 'ปัสสาวะบ่อย' },
  { key: 'numbness', label: 'มือ/เท้าชา' },
  { key: 'slow_healing_wound', label: 'แผลหายช้า' },
  { key: 'dizziness', label: 'เวียนหัว / หน้ามืด' },
  { key: 'none', label: 'ไม่มีอาการผิดปกติ' },
  { key: 'other', label: 'อื่นๆ' },
];

// ข้อความแจ้งผู้ใช้ตามสาเหตุที่ระบุตำแหน่งไม่ได้
const GPS_PROBLEM = {
  denied: 'เบราว์เซอร์ถูกตั้งค่าไม่อนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดอนุญาตตามขั้นตอนด้านล่าง แล้วกดเชื่อมต่อตำแหน่งอีกครั้ง',
  unavailable: 'ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS/บริการตำแหน่งของอุปกรณ์ หรือย้ายไปบริเวณที่รับสัญญาณได้ แล้วลองอีกครั้ง',
  timeout: 'ค้นหาตำแหน่งนานเกินไป กรุณาตรวจสอบว่าเปิด GPS และอินเทอร์เน็ตอยู่ แล้วลองอีกครั้ง',
  unsupported: 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง กรุณาใช้ Chrome, Safari หรือ Edge เวอร์ชันล่าสุด',
  insecure: 'ต้องเปิดเว็บผ่านที่อยู่ที่ขึ้นต้นด้วย https:// จึงจะระบุตำแหน่งได้',
};

export default function PreConsultQuestionnairePage() {
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [form, setForm] = useState({
    location: '',
    emergencyContact: '',
    latestGlucose: '',
    latestBP: '',
    painLevel: 0,
    symptoms: [],
    otherSymptom: '',
    hospitalizedLastMonth: false,
  });

  // gpsStatus: idle | requesting | granted | denied | unavailable | timeout | unsupported | insecure
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [coords, setCoords] = useState(null); // { lat, lng, accuracy }
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ========================================
  // เชื่อมต่อตำแหน่งจริง (เรียกจากปุ่ม หรืออัตโนมัติเมื่อเคยอนุญาตไว้แล้ว)
  // ========================================
  const requestLocation = useCallback(async () => {
    setGpsStatus('requesting');
    setErrors((e) => ({ ...e, location: '' }));
    try {
      const result = await locateCurrentPosition();
      if (!mountedRef.current) return;
      setCoords({ lat: result.lat, lng: result.lng, accuracy: result.accuracy });
      setForm((f) => ({ ...f, location: result.location }));
      setGpsStatus('granted');
    } catch (err) {
      if (!mountedRef.current) return;
      setGpsStatus((err?.code || 'UNAVAILABLE').toLowerCase());
    }
  }, []);

  // เข้าหน้านี้: ถ้าเคยอนุญาตไว้แล้วค่อยขอตำแหน่งอัตโนมัติ — ถ้ายังไม่เคยตอบ ให้ผู้ใช้กดปุ่มเอง
  // (การเด้งขอสิทธิ์เองตอนเปิดหน้า ผู้ใช้มักปัดทิ้ง/เบราว์เซอร์บางตัวบล็อก ทำให้ค้างที่ "กำลังค้นหา" และกดส่งไม่ได้)
  useEffect(() => {
    let active = true;
    getGeolocationPermission().then((perm) => {
      if (!active) return;
      if (perm === 'granted') requestLocation();
      else if (perm === 'denied') setGpsStatus('denied');
    });
    // ผู้ใช้ไปเปิดอนุญาตในตั้งค่าเบราว์เซอร์แล้วกลับมา → เชื่อมต่อให้ทันที
    const stopWatch = watchGeolocationPermission((perm) => {
      if (perm === 'granted') requestLocation();
      if (perm === 'denied') setGpsStatus('denied');
    });
    return () => {
      active = false;
      stopWatch();
    };
  }, [requestLocation]);

  const toggleSymptom = (key) => {
    setForm((f) => {
      const has = f.symptoms.includes(key);
      return { ...f, symptoms: has ? f.symptoms.filter((s) => s !== key) : [...f.symptoms, key] };
    });
  };

  // ========================================
  // ส่งแบบสอบถาม → บันทึกลงนัดหมาย (พยาบาลจะเห็นในห้องวิดีโอคอล) → เข้าห้องรอ
  // ========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const newErrors = {
      location: !form.location || !coords ? 'กรุณากด "เชื่อมต่อตำแหน่ง" ก่อนส่งแบบสอบถาม' : '',
      emergencyContact:
        validators.required(form.emergencyContact, 'เบอร์ติดต่อฉุกเฉิน') || validators.phone(form.emergencyContact),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      // นัดหมายเดียวกับที่หน้าวิดีโอคอลจะเข้า (กฎเลือกเดียวกันทั้งผู้ป่วยและพยาบาล)
      const apt = await videoCallService.findJoinableAppointment();
      if (!apt) {
        setSubmitError('ไม่พบนัดหมายที่ถึงเวลา กรุณาตรวจสอบหน้านัดหมายของท่าน');
        return;
      }

      await appointmentService.submitPreConsult(apt.id, {
        location: form.location,
        gpsCoordinates: { lat: coords.lat, lng: coords.lng },
        emergencyContact: form.emergencyContact.trim(),
        latestGlucose: form.latestGlucose.trim(),
        latestBP: form.latestBP.trim(),
        painLevel: form.painLevel,
        symptoms: form.symptoms,
        otherSymptom: form.symptoms.includes('other') ? form.otherSymptom.trim() : '',
        hospitalizedLastMonth: form.hospitalizedLastMonth,
      });

      navigate('/patient/waiting-room', { state: { questionnaire: form } });
    } catch (err) {
      setSubmitError(err?.message || 'ส่งแบบสอบถามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const gpsBusy = gpsStatus === 'requesting';
  const gpsFailed = GPS_PROBLEM[gpsStatus];
  const lowAccuracy = coords?.accuracy != null && coords.accuracy > 500;

  return (
    <main className="questionnaire-page">
      <form className="questionnaire-card" onSubmit={handleSubmit} noValidate>
        <h1>แบบสอบถามก่อนพบพยาบาล</h1>

        {submitError && <div className="alert-error" role="alert">{submitError}</div>}

        {/* ========================================
            ตำแหน่งปัจจุบัน — ต้องเป็นตำแหน่งจริงจาก GPS เท่านั้น
        ======================================== */}
        <div className="form-group">
          <label className="form-label" htmlFor="gps-location">ตำแหน่งปัจจุบัน (ระบุจาก GPS ของอุปกรณ์)</label>

          <input
            id="gps-location"
            className={`form-input ${errors.location ? 'input-error' : ''}`}
            readOnly
            value={form.location || (gpsBusy ? 'กำลังค้นหาตำแหน่ง...' : 'ยังไม่ได้เชื่อมต่อตำแหน่ง')}
          />
          {errors.location && <span className="form-error-message">{errors.location}</span>}

          <div className="gps-actions">
            <button
              type="button"
              className={gpsStatus === 'granted' ? 'btn-secondary' : 'btn-primary'}
              onClick={requestLocation}
              disabled={gpsBusy}
            >
              {gpsBusy
                ? <><Clock size={16} className="inline-icon" /> กำลังเชื่อมต่อตำแหน่ง...</>
                : gpsStatus === 'granted'
                ? <><RefreshCw size={16} className="inline-icon" /> อัปเดตตำแหน่งอีกครั้ง</>
                : <><MapPin size={16} className="inline-icon" /> เชื่อมต่อตำแหน่ง</>}
            </button>
          </div>

          {gpsStatus === 'granted' && (
            <p className="gps-success-note" role="status">
              <MapPin size={16} className="inline-icon" /> เชื่อมต่อตำแหน่งสำเร็จ
              {coords?.accuracy != null && ` (ความแม่นยำประมาณ ${coords.accuracy} เมตร)`}
            </p>
          )}
          {gpsStatus === 'granted' && lowAccuracy && (
            <p className="gps-fallback-note" role="status">
              <AlertTriangle size={16} className="inline-icon" /> ตำแหน่งที่ได้ค่อนข้างคลาดเคลื่อน หากอยู่ในอาคารหรือใช้คอมพิวเตอร์ ลองเปิด GPS หรือใช้โทรศัพท์แล้วกดอัปเดตตำแหน่งอีกครั้ง
            </p>
          )}

          {gpsFailed && (
            <div className="gps-fallback-note" role="alert">
              <AlertTriangle size={16} className="inline-icon" /> {gpsFailed}
              {gpsStatus === 'denied' && (
                <ol className="gps-help-steps">
                  <li><strong>Chrome / Edge (คอมพิวเตอร์และ Android):</strong> กดไอคอนแม่กุญแจหรือไอคอนตั้งค่าข้างช่องที่อยู่เว็บ → เลือก “ตำแหน่ง/Location” → “อนุญาต”</li>
                  <li><strong>iPhone / iPad (Safari):</strong> ตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → บริการตำแหน่ง → เปิด และเลือก “เว็บไซต์ของ Safari” เป็น “ขณะใช้งานแอป”</li>
                  <li>จากนั้นกลับมาที่หน้านี้แล้วกดปุ่ม “เชื่อมต่อตำแหน่ง” อีกครั้ง</li>
                </ol>
              )}
            </div>
          )}
        </div>

        {/* ========================================
            Emergency Contact
        ======================================== */}
        <div className="form-group">
          <label htmlFor="emergencyContact" className="form-label">เบอร์ติดต่อฉุกเฉิน</label>
          <input
            id="emergencyContact"
            className={`form-input ${errors.emergencyContact ? 'input-error' : ''}`}
            placeholder="0812345678"
            inputMode="tel"
            value={form.emergencyContact}
            onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
            onBlur={() =>
              setErrors((er) => ({
                ...er,
                emergencyContact:
                  validators.required(form.emergencyContact, 'เบอร์ติดต่อฉุกเฉิน') ||
                  validators.phone(form.emergencyContact),
              }))
            }
          />
          {errors.emergencyContact && <span className="form-error-message">{errors.emergencyContact}</span>}
        </div>

        {/* ========================================
            Latest Health Values
        ======================================== */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="latestGlucose" className="form-label">ระดับน้ำตาลล่าสุด (ถ้ามี)</label>
            <input
              id="latestGlucose"
              className="form-input"
              placeholder="เช่น 140 mg/dL"
              value={form.latestGlucose}
              onChange={(e) => setForm((f) => ({ ...f, latestGlucose: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="latestBP" className="form-label">ความดันโลหิตล่าสุด (ถ้ามี)</label>
            <input
              id="latestBP"
              className="form-input"
              placeholder="เช่น 130/85 mmHg"
              value={form.latestBP}
              onChange={(e) => setForm((f) => ({ ...f, latestBP: e.target.value }))}
            />
          </div>
        </div>

        {/* ========================================
            Pain Level
        ======================================== */}
        <div className="form-group">
          <label htmlFor="painLevel" className="form-label">ระดับความเจ็บปวด (0-10): {form.painLevel}</label>
          <input
            id="painLevel"
            type="range"
            min="0"
            max="10"
            className="range-slider"
            value={form.painLevel}
            onChange={(e) => setForm((f) => ({ ...f, painLevel: Number(e.target.value) }))}
          />
        </div>

        {/* ========================================
            Symptoms
        ======================================== */}
        <fieldset className="form-group">
          <legend className="form-label">อาการที่พบ (เลือกได้มากกว่า 1 ข้อ)</legend>

          <div className="symptom-grid">
            {SYMPTOM_OPTIONS.map((opt) => (
              <label key={opt.key} className={`symptom-chip ${form.symptoms.includes(opt.key) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.symptoms.includes(opt.key)}
                  onChange={() => toggleSymptom(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {form.symptoms.includes('other') && (
            <input
              className="form-input"
              style={{ marginTop: 8 }}
              placeholder="ระบุอาการอื่นๆ"
              value={form.otherSymptom}
              onChange={(e) => setForm((f) => ({ ...f, otherSymptom: e.target.value }))}
            />
          )}
        </fieldset>

        {/* ========================================
            Hospitalization
        ======================================== */}
        <label className="consent-checkbox-row" style={{ margin: '16px 0' }}>
          <input
            type="checkbox"
            checked={form.hospitalizedLastMonth}
            onChange={(e) => setForm((f) => ({ ...f, hospitalizedLastMonth: e.target.checked }))}
          />
          <span>เข้ารับการรักษาในโรงพยาบาลภายใน 1 เดือนที่ผ่านมา</span>
        </label>

        <button type="submit" className="btn-primary btn-large" disabled={gpsBusy || submitting}>
          {submitting ? 'กำลังส่งแบบสอบถาม...' : 'ส่งแบบสอบถามและเข้าห้องรอ'}
        </button>
      </form>
    </main>
  );
}
