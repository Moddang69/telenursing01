/**
 * MOCK Reverse Geocoding — จำลองการแปลงพิกัด GPS เป็นที่อยู่แบบไทย
 * TODO: เชื่อมต่อ Reverse Geocoding API จริง (เช่น Google Maps, Longdo Map) ในระบบ Production
 * ห้ามถือว่าพิกัด GPS เป็นที่อยู่ที่ยืนยันแล้วโดยอัตโนมัติ — ควรให้ผู้ป่วยตรวจสอบอีกครั้งหากเป็นไปได้
 */
export function mockReverseGeocode(lat, lng) {
  // Mock คงที่สำหรับ Prototype — ในระบบจริงต้อง query จาก API ตามพิกัดจริง
  return `บ้านเลขที่ 12 ต.ในเมือง อ.เมือง จ.สงขลา (พิกัด: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}