import { useState, useRef, useCallback } from 'react';
import { availabilityService } from '../services/availabilityService.js';

/**
 * useAvailabilityCheck — ตรวจค่าซ้ำกับระบบสำหรับ 1 ช่อง ('email' | 'hn' | 'licenseNumber')
 *  status: idle | checking | available | taken | error   (error = ตรวจไม่ได้ เช่น เน็ตหลุด — ไม่บล็อกผู้ใช้ Backend ตรวจซ้ำตอนลงทะเบียนอยู่แล้ว)
 *  verified: (เฉพาะ email ที่ taken) false = เคยลงทะเบียนแต่ยังไม่ได้ยืนยัน OTP
 *  check(value)  — ตรวจทันที (เรียกตอน blur) ผลที่ตอบช้ากว่าคำขอใหม่จะถูกทิ้ง
 *  ensure(value) — ใช้ตอน submit: ถ้าเพิ่งตรวจค่านี้ไปแล้วใช้ผลเดิม ไม่ยิงซ้ำ
 *  reset()       — เรียกเมื่อผู้ใช้แก้ค่า
 */
export function useAvailabilityCheck(field) {
  const [state, setState] = useState({ status: 'idle', verified: null, value: '' });
  const stateRef = useRef(state);
  stateRef.current = state;
  const seqRef = useRef(0);

  const reset = useCallback(() => {
    seqRef.current += 1;
    setState({ status: 'idle', verified: null, value: '' });
  }, []);

  const check = useCallback(
    async (raw) => {
      const value = String(raw || '').trim();
      if (!value) {
        reset();
        return 'idle';
      }
      const seq = ++seqRef.current;
      setState({ status: 'checking', verified: null, value });
      try {
        const data = await availabilityService.check({ [field]: value });
        const result = data?.[field];
        if (seq !== seqRef.current) return null; // มีคำขอใหม่กว่าแล้ว — ทิ้งผลนี้
        const status = result ? (result.available ? 'available' : 'taken') : 'error';
        setState({ status, verified: result?.verified ?? null, value });
        return status;
      } catch (_) {
        if (seq === seqRef.current) setState({ status: 'error', verified: null, value });
        return 'error';
      }
    },
    [field, reset]
  );

  const ensure = useCallback(
    async (raw) => {
      const value = String(raw || '').trim();
      const cur = stateRef.current;
      if (value && cur.value === value && (cur.status === 'available' || cur.status === 'taken')) return cur.status;
      return check(value);
    },
    [check]
  );

  return { ...state, check, ensure, reset };
}

export default useAvailabilityCheck;
