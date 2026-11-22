import { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VIDEO_CALL_STATE as S } from '../constants/statuses.js';
import videoCallService from '../services/videoCallService.js';

// เวลารอสูงสุดก่อนแสดงตัวเลือก Contact/Reschedule
const MAX_WAIT_SECONDS = 60;

const REPORTABLE = ['CONNECTED', 'RECONNECTING', 'DISCONNECTED'];

function friendlyError(err) {
  const msg = String(err?.message || err?.code || '');
  if (/permission|notallowed|denied/i.test(msg)) return 'กรุณาอนุญาตการใช้กล้องและไมโครโฟนในเบราว์เซอร์';
  return err?.message || 'ไม่สามารถเริ่มวิดีโอคอลได้ กรุณาลองใหม่อีกครั้ง';
}

/**
 * useAgoraCall — วิดีโอคอลจริงด้วย Agora RTC (แทน useVideoCallSimulator)
 * interface เหมือน simulator: state, waitSeconds, waitTimedOut, cameraOn, micOn, toggleCamera, toggleMic, endCall
 * เพิ่ม: localRef/remoteRef (container ของภาพ), error, mediaWarning
 *
 * Flow: สร้าง VideoSession → join room (socket) → ขอ token จาก Backend → เปิดกล้อง/ไมค์ → join + publish
 */
export function useAgoraCall({ appointmentId, onRejoin }) {
  const [state, setState] = useState(S.WAITING_FOR_NURSE);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState('');
  const [mediaWarning, setMediaWarning] = useState('');
  const [wasConnected, setWasConnected] = useState(false); // เคยเห็น/ได้ยินอีกฝั่งจริงแล้ว (= การปรึกษาเกิดขึ้นแล้ว)
  const [leftEarly, setLeftEarly] = useState(false); // วางสายก่อนคู่สนทนาเข้า: นัดหมายยังไม่เสร็จสิ้น เข้าร่วมใหม่ได้
  const [sessionKey, setSessionKey] = useState(0); // เพิ่มค่า = เริ่มเข้าห้องใหม่ (rejoin)

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const ctxRef = useRef({ client: null, mic: null, cam: null, teardown: null });
  const endedRef = useRef(false);
  const remoteCountRef = useRef(0);
  const everConnectedRef = useRef(false);

  // นับเวลารอ
  useEffect(() => {
    if (state !== S.WAITING_FOR_NURSE) return undefined;
    const t = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (!appointmentId) return undefined;

    let cancelled = false;
    endedRef.current = false;
    remoteCountRef.current = 0;
    everConnectedRef.current = false;
    setWasConnected(false);

    // aborted: ผู้ใช้กดวางสายระหว่างที่ยังเตรียมเข้าห้องอยู่ → หยุดขั้นตอนที่เหลือ (กันเข้าห้องหลังกดวางไปแล้ว)
    const ctx = { client: null, mic: null, cam: null, teardown: null, aborted: false };
    ctxRef.current = ctx;

    // ปิดกล้อง/ไมค์และออกจากห้อง (เรียกซ้ำได้อย่างปลอดภัย)
    const teardown = async () => {
      try { ctx.mic?.stop(); ctx.mic?.close(); } catch (_) { /* ignore */ }
      try { ctx.cam?.stop(); ctx.cam?.close(); } catch (_) { /* ignore */ }
      ctx.mic = null;
      ctx.cam = null;
      const client = ctx.client;
      ctx.client = null;
      if (client) {
        try {
          client.removeAllListeners();
          await client.leave();
        } catch (_) { /* ignore */ }
      }
    };
    ctx.teardown = teardown;

    const setIfActive = (next) => {
      if (endedRef.current) return;
      setState(next);
    };

    const report = (s) => {
      if (REPORTABLE.includes(s)) videoCallService.sendConnectionState(appointmentId, s);
    };

    const unsubscribeEnded = videoCallService.subscribeCallEnded(() => {
      endedRef.current = true;
      setState(S.CALL_ENDED);
      teardown();
    });

    (async () => {
      try {
        if (cancelled || ctx.aborted) return;
        AgoraRTC.setLogLevel(3); // แสดงเฉพาะ Error

        // 1) สร้าง/ดึง VideoSession ก่อน แล้วค่อย join-room (join-room ต้องมี session อยู่แล้ว)
        await videoCallService.createOrGetSession(appointmentId);
        if (cancelled || ctx.aborted) return;
        try {
          videoCallService.joinRoom(appointmentId);
        } catch (_) {
          // socket ไม่พร้อมไม่ใช่เรื่องร้ายแรง — วิดีโอผ่าน Agora ยังใช้ได้
        }

        // 2) ขอ token (Backend ตรวจสิทธิ์/Consent/สถานะนัดหมายให้)
        const cred = await videoCallService.getAgoraToken(appointmentId);
        if (cancelled || ctx.aborted) return;

        // 3) เปิดไมค์/กล้อง — ถ้าอย่างใดอย่างหนึ่งใช้ไม่ได้ ยังเข้าห้องต่อได้
        const warnings = [];
        try {
          ctx.mic = await AgoraRTC.createMicrophoneAudioTrack();
        } catch (_) {
          warnings.push('ไมโครโฟน');
        }
        try {
          ctx.cam = await AgoraRTC.createCameraVideoTrack();
        } catch (_) {
          warnings.push('กล้อง');
        }
        if (cancelled || ctx.aborted) { await teardown(); return; }
        if (warnings.length) {
          setMediaWarning(`ไม่สามารถใช้${warnings.join('และ')}ได้ กรุณาอนุญาตสิทธิ์ในเบราว์เซอร์ (ท่านยังรับชม/รับฟังอีกฝั่งได้)`);
        }
        setCameraOn(!!ctx.cam);
        setMicOn(!!ctx.mic);
        if (ctx.cam && localRef.current) ctx.cam.play(localRef.current);

        // 4) เตรียม client + event
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        ctx.client = client;

        client.on('user-joined', () => {
          remoteCountRef.current += 1;
          setIfActive(S.CONNECTING);
        });

        client.on('user-published', async (user, mediaType) => {
          try {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video' && user.videoTrack && remoteRef.current) {
              user.videoTrack.play(remoteRef.current);
            }
            if (mediaType === 'audio') user.audioTrack?.play();
            everConnectedRef.current = true;
            setWasConnected(true);
            setIfActive(S.CONNECTED);
            report('CONNECTED');
          } catch (e) {
            console.error('Agora subscribe failed: - useAgoraCall.js:144', e);
          }
        });

        client.on('user-left', () => {
          remoteCountRef.current = Math.max(0, remoteCountRef.current - 1);
          if (remoteCountRef.current === 0) {
            setIfActive(S.DISCONNECTED);
            report('DISCONNECTED');
          }
        });

        client.on('connection-state-change', (cur) => {
          if (cur === 'RECONNECTING') {
            setIfActive(S.RECONNECTING);
            report('RECONNECTING');
          } else if (cur === 'CONNECTED') {
            setIfActive(remoteCountRef.current > 0 ? S.CONNECTED : S.WAITING_FOR_NURSE);
          } else if (cur === 'DISCONNECTED') {
            setIfActive(S.DISCONNECTED);
            report('DISCONNECTED');
          }
        });

        // Token ใกล้หมดอายุ → ขอใหม่แล้วต่ออายุโดยไม่หลุดสาย
        client.on('token-privilege-will-expire', async () => {
          try {
            const fresh = await videoCallService.getAgoraToken(appointmentId);
            await client.renewToken(fresh.token);
          } catch (e) {
            console.error('Renew Agora token failed: - useAgoraCall.js:174', e);
          }
        });

        // 5) join + publish (uid = 0 → ให้ Agora สุ่ม uid ให้)
        await client.join(cred.appId, cred.channel, cred.token, cred.uid || null);
        if (cancelled || ctx.aborted) { await teardown(); return; }

        const toPublish = [ctx.mic, ctx.cam].filter(Boolean);
        if (toPublish.length) await client.publish(toPublish);
        if (cancelled || ctx.aborted) { await teardown(); return; }
      } catch (err) {
        if (cancelled || ctx.aborted) return;
        console.error('Agora call failed: - useAgoraCall.js:187', err);
        setError(friendlyError(err));
        await teardown();
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeEnded();
      teardown();
    };
  }, [appointmentId, sessionKey]);

  // วางสาย: ออกจากห้อง Agora แล้วแจ้ง Backend
  //  - เคยเชื่อมต่อกับอีกฝั่งแล้ว → Backend ปิดนัดหมายเป็น "เสร็จสิ้น" + แจ้งอีกฝั่ง (state = CALL_ENDED)
  //  - คู่สนทนายังไม่เข้า/ยังไม่เคยคุยกัน → แค่ออกจากห้อง นัดหมายยังไม่เสร็จสิ้น (leftEarly = true) เรียก rejoin() เพื่อเข้าใหม่ได้
  // คืน { completed }
  const endCall = useCallback(async (consultationNote) => {
    const connected = everConnectedRef.current;
    endedRef.current = true;
    ctxRef.current.aborted = true;

    const ackPromise = appointmentId
      ? videoCallService.endCall(appointmentId, consultationNote, connected).catch(() => null)
      : Promise.resolve(null);
    await ctxRef.current.teardown?.();
    const ack = await ackPromise;

    // ไม่ได้ ack (socket หลุด) → ตัดสินจากที่ client รู้เอง
    const completed = ack ? !!ack.completed : connected;
    if (completed) setState(S.CALL_ENDED);
    else setLeftEarly(true);
    return { completed };
  }, [appointmentId]);

  // เข้าร่วมวิดีโอคอลใหม่ (หลังวางสายก่อนคู่สนทนาเข้า)
  const rejoin = useCallback(() => {
    endedRef.current = false;
    setLeftEarly(false);
    setError('');
    setMediaWarning('');
    setWaitSeconds(0);
    setState(S.WAITING_FOR_NURSE);
    setSessionKey((k) => k + 1);
    onRejoin?.();
  }, [onRejoin]);

  const toggleCamera = useCallback(async () => {
    const track = ctxRef.current.cam;
    if (!track) return;
    const next = !track.enabled;
    await track.setEnabled(next);
    setCameraOn(next);
  }, []);

  const toggleMic = useCallback(async () => {
    const track = ctxRef.current.mic;
    if (!track) return;
    const next = !track.enabled;
    await track.setEnabled(next);
    setMicOn(next);
  }, []);

  return {
    state,
    waitSeconds,
    waitTimedOut: waitSeconds >= MAX_WAIT_SECONDS && state === S.WAITING_FOR_NURSE,
    cameraOn,
    micOn,
    toggleCamera,
    toggleMic,
    endCall,
    error,
    mediaWarning,
    wasConnected,
    leftEarly,
    rejoin,
    localRef,
    remoteRef,
  };
}

export default useAgoraCall;