/**
 * geolocation.js — ระบุตำแหน่งจริงของผู้ใช้ (แทน mockReverseGeocode.js ที่สร้างที่อยู่ปลอมคงที่)
 *
 * ขั้นตอน: ขอพิกัดจากเบราว์เซอร์ (GPS แม่นยำสูงก่อน → ถ้า timeout/หาไม่เจอ ลองแบบ Wi-Fi/เครือข่าย)
 *          → แปลงพิกัดเป็นที่อยู่ภาษาไทยด้วย OpenStreetMap Nominatim (ไม่ต้องใช้ API key)
 *
 * หลักการ: "พิกัด" คือข้อมูลจริงจากเครื่องผู้ใช้ ส่วน "ชื่อที่อยู่" เป็นการแปลผลโดยบริการภายนอก อาจหาไม่เจอ/คลาดเคลื่อนได้
 *          ถ้าแปลงไม่ได้จะแสดงเป็นพิกัดล้วน — ไม่แต่งที่อยู่ขึ้นมาเอง
 * หมายเหตุ Production: Nominatim สาธารณะมีเงื่อนไขการใช้งาน (ไม่ควรใช้ถี่/ปริมาณมาก) —
 *          ถ้าผู้ใช้เยอะ ให้เปลี่ยน reverseGeocode() เป็นบริการเชิงพาณิชย์ (Google Maps, Longdo Map ฯลฯ)
 */

export class GeoError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // UNSUPPORTED | INSECURE | DENIED | UNAVAILABLE | TIMEOUT
  }
}

export function isGeolocationSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

// 'granted' | 'prompt' | 'denied' | 'unknown' (เบราว์เซอร์เก่า เช่น Safari ก่อน 16 ไม่มี Permissions API สำหรับ geolocation)
export async function getGeolocationPermission() {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch (_) {
    return 'unknown';
  }
}

// ติดตามการเปลี่ยนสิทธิ์ (เช่น ผู้ใช้ไปเปิดอนุญาตในตั้งค่าเบราว์เซอร์แล้วกลับมา) — คืนฟังก์ชันยกเลิก
export function watchGeolocationPermission(onChange) {
  let status = null;
  let cancelled = false;
  const handler = () => onChange(status.state);
  navigator.permissions
    ?.query?.({ name: 'geolocation' })
    .then((s) => {
      if (cancelled) return;
      status = s;
      status.addEventListener?.('change', handler);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    status?.removeEventListener?.('change', handler);
  };
}

const getPosition = (options) =>
  new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

const toGeoError = (err) => {
  if (err?.code === 1) return new GeoError('DENIED', 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง');
  if (err?.code === 3) return new GeoError('TIMEOUT', 'ค้นหาตำแหน่งนานเกินไป');
  return new GeoError('UNAVAILABLE', 'ไม่สามารถระบุตำแหน่งของอุปกรณ์ได้');
};

/** ขอพิกัดปัจจุบัน — ต้องเรียกจากการกดปุ่มของผู้ใช้ (หรือเมื่อได้สิทธิ์แล้ว) เพื่อให้เบราว์เซอร์ยอมแสดงหน้าต่างขอสิทธิ์ */
export async function getCurrentCoordinates() {
  if (!isGeolocationSupported()) throw new GeoError('UNSUPPORTED', 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new GeoError('INSECURE', 'ต้องเปิดเว็บผ่าน HTTPS จึงจะระบุตำแหน่งได้');
  }

  let pos;
  try {
    // 1) GPS แม่นยำสูง (ไม่ใช้พิกัดเก่าที่แคชไว้)
    pos = await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  } catch (err) {
    if (err?.code === 1) throw toGeoError(err); // ปฏิเสธสิทธิ์ — ลองซ้ำไม่มีประโยชน์
    try {
      // 2) หา GPS ไม่ทัน/ไม่เจอ (เช่น อยู่ในอาคาร, คอมพิวเตอร์ไม่มี GPS) → ใช้ Wi-Fi/เครือข่ายประมาณตำแหน่ง
      pos = await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
    } catch (err2) {
      throw toGeoError(err2);
    }
  }
  const { latitude, longitude, accuracy } = pos.coords;
  return { lat: latitude, lng: longitude, accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null };
}

// ประกอบที่อยู่แบบไทยจากผลของ Nominatim (บ้านเลขที่ ถนน หมู่บ้าน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)
function formatThaiAddress(data) {
  const a = data?.address;
  if (!a) return data?.display_name || null;
  const parts = [
    a.house_number,
    a.road,
    a.village || a.hamlet || a.neighbourhood,
    a.suburb,
    a.city_district || a.district || a.county,
    a.town || a.city || a.municipality,
    a.state,
    a.postcode,
  ].filter(Boolean);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.length ? unique.join(' ') : data.display_name || null;
}

/** พิกัด → ที่อยู่ (ภาษาไทย) — ล้มเหลว/ช้าเกิน คืน null (ไม่ throw) */
export async function reverseGeocode(lat, lng, { timeoutMs = 7000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url =
      'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=th' +
      `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return formatThaiAddress(await res.json());
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** ระบุตำแหน่งจริง → { lat, lng, accuracy, address, location } (location = ข้อความที่เก็บลงแบบสอบถาม) */
export async function locateCurrentPosition() {
  const { lat, lng, accuracy } = await getCurrentCoordinates();
  const address = await reverseGeocode(lat, lng);
  const coords = `พิกัด: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const location = address ? `${address} (${coords})` : `${coords} (ไม่พบชื่อที่อยู่ของพิกัดนี้)`;
  return { lat, lng, accuracy, address, location };
}

export const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
