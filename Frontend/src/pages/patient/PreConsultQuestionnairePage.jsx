import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validators } from '../../utils/validators.js';
import { mockReverseGeocode } from '../../utils/mockReverseGeocode.js';
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

export default function PreConsultQuestionnairePage() {
  const navigate = useNavigate();

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

  const [gpsStatus, setGpsStatus] = useState('idle');
  // idle | requesting | granted | denied

  const [errors, setErrors] = useState({});

  // ========================================
  // Request GPS Location
  // ========================================
  const requestLocation = () => {
    setGpsStatus('requesting');

    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const address = mockReverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude
        );

        setForm((f) => ({
          ...f,
          location: address,
        }));

        setGpsStatus('granted');
      },
      () => {
        setGpsStatus('denied');
      }
    );
  };

  // ========================================
  // Request GPS automatically
  // when entering this page
  // ========================================
  useEffect(() => {
    requestLocation();
  }, []);

  // ========================================
  // Toggle Symptoms
  // ========================================
  const toggleSymptom = (key) => {
    setForm((f) => {
      const has = f.symptoms.includes(key);

      const symptoms = has
        ? f.symptoms.filter((s) => s !== key)
        : [...f.symptoms, key];

      return {
        ...f,
        symptoms,
      };
    });
  };

  // ========================================
  // Submit
  // ========================================
  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {
      location: !form.location
        ? 'ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาต GPS'
        : '',

      emergencyContact:
        validators.required(
          form.emergencyContact,
          'เบอร์ติดต่อฉุกเฉิน'
        ) ||
        validators.phone(form.emergencyContact),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      return;
    }

    // TODO:
    // ส่งข้อมูลไป Backend จริง
    navigate('/patient/waiting-room', {
      state: {
        questionnaire: form,
      },
    });
  };

  return (
    <main className="questionnaire-page">
      <form
        className="questionnaire-card"
        onSubmit={handleSubmit}
        noValidate
      >
        <h1>แบบสอบถามก่อนพบพยาบาล</h1>

        {/* ========================================
            Current Location - GPS ONLY
        ======================================== */}
        <div className="form-group">
          <label className="form-label">
            ตำแหน่งปัจจุบัน (ระบุอัตโนมัติจาก GPS)
          </label>

          <input
            className={`form-input ${
              errors.location ? 'input-error' : ''
            }`}
            readOnly
            value={
              form.location ||
              (
                gpsStatus === 'requesting'
                  ? 'กำลังค้นหาตำแหน่ง...'
                  : 'ยังไม่สามารถระบุตำแหน่งได้'
              )
            }
          />

          {errors.location && (
            <span className="form-error-message">
              {errors.location}
            </span>
          )}

          {/* GPS Denied */}
          {gpsStatus === 'denied' && (
            <div className="gps-fallback-note">
              ⚠️ ไม่สามารถเข้าถึงตำแหน่ง GPS ได้
              กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ของท่าน
              แล้วลองใหม่

              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 8 }}
                onClick={requestLocation}
              >
                ลองขอตำแหน่งอีกครั้ง
              </button>
            </div>
          )}

          {/* GPS Granted */}
          {gpsStatus === 'granted' && (
            <p className="gps-success-note">
              📍 ระบุตำแหน่งสำเร็จจาก GPS
            </p>
          )}
        </div>

        {/* ========================================
            Emergency Contact
        ======================================== */}
        <div className="form-group">
          <label
            htmlFor="emergencyContact"
            className="form-label"
          >
            เบอร์ติดต่อฉุกเฉิน
          </label>

          <input
            id="emergencyContact"
            className={`form-input ${
              errors.emergencyContact
                ? 'input-error'
                : ''
            }`}
            placeholder="0812345678"
            value={form.emergencyContact}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                emergencyContact: e.target.value,
              }))
            }
          />

          {errors.emergencyContact && (
            <span className="form-error-message">
              {errors.emergencyContact}
            </span>
          )}
        </div>

        {/* ========================================
            Latest Health Values
        ======================================== */}
        <div className="form-row">
          <div className="form-group">
            <label
              htmlFor="latestGlucose"
              className="form-label"
            >
              ระดับน้ำตาลล่าสุด (ถ้ามี)
            </label>

            <input
              id="latestGlucose"
              className="form-input"
              placeholder="เช่น 140 mg/dL"
              value={form.latestGlucose}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  latestGlucose: e.target.value,
                }))
              }
            />
          </div>

          <div className="form-group">
            <label
              htmlFor="latestBP"
              className="form-label"
            >
              ความดันโลหิตล่าสุด (ถ้ามี)
            </label>

            <input
              id="latestBP"
              className="form-input"
              placeholder="เช่น 130/85 mmHg"
              value={form.latestBP}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  latestBP: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* ========================================
            Pain Level
        ======================================== */}
        <div className="form-group">
          <label
            htmlFor="painLevel"
            className="form-label"
          >
            ระดับความเจ็บปวด (0-10): {form.painLevel}
          </label>

          <input
            id="painLevel"
            type="range"
            min="0"
            max="10"
            className="range-slider"
            value={form.painLevel}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                painLevel: Number(e.target.value),
              }))
            }
          />
        </div>

        {/* ========================================
            Symptoms
        ======================================== */}
        <fieldset className="form-group">
          <legend className="form-label">
            อาการที่พบ (เลือกได้มากกว่า 1 ข้อ)
          </legend>

          <div className="symptom-grid">
            {SYMPTOM_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={`symptom-chip ${
                  form.symptoms.includes(opt.key)
                    ? 'selected'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.symptoms.includes(
                    opt.key
                  )}
                  onChange={() =>
                    toggleSymptom(opt.key)
                  }
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
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  otherSymptom: e.target.value,
                }))
              }
            />
          )}
        </fieldset>

        {/* ========================================
            Hospitalization
        ======================================== */}
        <label
          className="consent-checkbox-row"
          style={{ margin: '16px 0' }}
        >
          <input
            type="checkbox"
            checked={form.hospitalizedLastMonth}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                hospitalizedLastMonth:
                  e.target.checked,
              }))
            }
          />

          <span>
            เข้ารับการรักษาในโรงพยาบาลภายใน
            1 เดือนที่ผ่านมา
          </span>
        </label>

        {/* ========================================
            Submit
        ======================================== */}
        <button
          type="submit"
          className="btn-primary btn-large"
          disabled={gpsStatus === 'requesting'}
        >
          ส่งแบบสอบถามและเข้าห้องรอ
        </button>
      </form>
    </main>
  );
}