export const validators = {
  required(value, fieldName = 'ข้อมูลนี้') {
    if (value === undefined || value === null || String(value).trim() === '') {
      return `กรุณากรอก${fieldName}`;
    }
    return '';
  },

  email(value) {
    if (!value) return '';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value) ? '' : 'รูปแบบอีเมลไม่ถูกต้อง';
  },

  phone(value) {
    if (!value) return '';
    const re = /^0[0-9]{9}$/;
    return re.test(value) ? '' : 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก เริ่มด้วย 0';
  },

  password(value) {
    if (!value) return '';
    if (value.length < 8) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
    if (!/[A-Z]/.test(value)) return 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว';
    if (!/[0-9]/.test(value)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
    return '';
  },

  confirmPassword(value, original) {
    if (!value) return '';
    return value === original ? '' : 'รหัสผ่านไม่ตรงกัน';
  },

  numeric(value, fieldName = 'ข้อมูลนี้') {
    if (value === '' || value === undefined || value === null) return '';
    return /^-?\d+(\.\d+)?$/.test(String(value)) ? '' : `${fieldName}ต้องเป็นตัวเลขเท่านั้น`;
  },

  range(value, min, max, fieldName = 'ค่านี้') {
    if (value === '' || value === undefined || value === null) return '';
    const num = Number(value);
    if (Number.isNaN(num)) return `${fieldName}ต้องเป็นตัวเลข`;
    if (num < min || num > max) return `${fieldName}ต้องอยู่ระหว่าง ${min} ถึง ${max}`;
    return '';
  },

  date(value, fieldName = 'วันที่') {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? `${fieldName}ไม่ถูกต้อง` : '';
  },
};

/**
 * ประเมินความเข้มแข็งของรหัสผ่าน (0-4)
 * ใช้เฉพาะแสดงผล UI (Password Strength Indicator) — ไม่ใช่ Security Enforcement จริง
 */
export function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0-4
}