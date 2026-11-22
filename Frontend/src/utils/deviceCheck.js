/**
 * deviceCheck.js — ตรวจกล้อง/ไมโครโฟนจริงด้วย navigator.mediaDevices.getUserMedia
 * (แทนการจำลองผล "พร้อมใช้งาน" เสมอของเดิม)
 *
 * ต้องเปิดผ่าน HTTPS (หรือ localhost) และผู้ใช้ต้องกดอนุญาตที่หน้าต่างของเบราว์เซอร์
 * requestDeviceStream คืน MediaStream ที่เปิดอยู่ — ผู้เรียกต้องเรียก stopStream() เมื่อใช้เสร็จ
 * (ถ้าไม่ปล่อย กล้อง/ไมค์จะถูกจองไว้และ Agora เปิดใช้ในห้องวิดีโอคอลไม่ได้)
 */

export class DeviceCheckError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // DENIED | NOT_FOUND | IN_USE | UNSUPPORTED | INSECURE | UNKNOWN
  }
}

const toDeviceError = (err) => {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new DeviceCheckError('DENIED', 'ถูกบล็อกสิทธิ์การเข้าถึง');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new DeviceCheckError('NOT_FOUND', 'ไม่พบอุปกรณ์');
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new DeviceCheckError('IN_USE', 'อุปกรณ์ถูกโปรแกรมอื่นใช้งานอยู่');
    default:
      return new DeviceCheckError('UNKNOWN', 'ตรวจสอบอุปกรณ์ไม่สำเร็จ');
  }
};

/** kind: 'video' | 'audio' */
export async function requestDeviceStream(kind) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw typeof window !== 'undefined' && window.isSecureContext === false
      ? new DeviceCheckError('INSECURE', 'ต้องเปิดเว็บผ่าน HTTPS')
      : new DeviceCheckError('UNSUPPORTED', 'เบราว์เซอร์ไม่รองรับ');
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(kind === 'video' ? { video: true } : { audio: true });
  } catch (err) {
    throw toDeviceError(err);
  }
  const track = (kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks())[0];
  if (!track || track.readyState !== 'live') {
    stopStream(stream);
    throw new DeviceCheckError('NOT_FOUND', 'ไม่พบอุปกรณ์');
  }
  return stream;
}

export function stopStream(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

// คำแนะนำแก้ปัญหาตามสาเหตุ
export function deviceHint(kind, code) {
  const what = kind === 'video' ? 'กล้อง' : 'ไมโครโฟน';
  switch (code) {
    case 'DENIED':
      return `เบราว์เซอร์ไม่อนุญาตให้ใช้${what} — กดไอคอนแม่กุญแจ/ตั้งค่าข้างช่องที่อยู่เว็บ เลือกอนุญาต${what} แล้วกด “ลองใหม่” (iPhone/iPad: ตั้งค่า → Safari → ${what})`;
    case 'NOT_FOUND':
      return `ไม่พบ${what}ในอุปกรณ์นี้ กรุณาเสียบ/เปิด${what} แล้วกด “ลองใหม่”`;
    case 'IN_USE':
      return `${what}อาจถูกแอปอื่นใช้อยู่ (เช่น Zoom, LINE, แท็บอื่น) กรุณาปิดแอปนั้นแล้วกด “ลองใหม่”`;
    case 'INSECURE':
      return 'ต้องเปิดเว็บผ่านที่อยู่ที่ขึ้นต้นด้วย https:// จึงจะใช้กล้อง/ไมค์ได้';
    case 'UNSUPPORTED':
      return 'เบราว์เซอร์นี้ไม่รองรับ กรุณาใช้ Chrome, Safari หรือ Edge เวอร์ชันล่าสุด';
    default:
      return `ตรวจสอบ${what}ไม่สำเร็จ กรุณากด “ลองใหม่”`;
  }
}
