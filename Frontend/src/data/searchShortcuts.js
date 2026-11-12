import { ROUTES } from '../constants/routes.js';

/**
 * searchShortcuts.js — ข้อมูลฝั่ง Client สำหรับช่องค้นหาบน Header
 *  - SEARCH_HINTS: บอกผู้ใช้ว่า "ค้นหาอะไรได้บ้าง" (แสดงตอนยังไม่พิมพ์)
 *  - PAGE_SHORTCUTS: ทางลัดไปหน้าต่างๆ ของระบบ (จับคู่ในเครื่อง ไม่ต้องเรียกเซิร์ฟเวอร์)
 */

export const SEARCH_HINTS = {
  patient: [
    'ความรู้สุขภาพ — ชื่อบทเรียน หมวดหมู่ หรือเนื้อหา',
    'แผนการดูแล — เป้าหมาย สิ่งที่ต้องทำ ความถี่',
    'นัดหมายวิดีโอคอล — ชื่อพยาบาล หรือเหตุผลที่นัด',
    'พยาบาลผู้ดูแล — ชื่อพยาบาล',
    'ข้อความแชท — คำในข้อความที่เคยสนทนา',
    'หน้าต่างๆ ของระบบ — เช่น บันทึกสุขภาพ โปรไฟล์ ตั้งค่าการแจ้งเตือน',
  ],
  caregiver: [
    'ความรู้สุขภาพของผู้ป่วย — ชื่อบทเรียน หมวดหมู่ หรือเนื้อหา',
    'แผนการดูแลของผู้ป่วย — เป้าหมาย สิ่งที่ต้องทำ',
    'นัดหมายวิดีโอคอลของผู้ป่วย — ชื่อพยาบาล หรือเหตุผลที่นัด',
    'ข้อความแชท — คำในข้อความที่เคยสนทนา',
    'หน้าต่างๆ ของระบบ — เช่น บันทึกสุขภาพ โปรไฟล์ ตั้งค่าการแจ้งเตือน',
    '(ความรู้สุขภาพ/แผนการดูแล/นัดหมาย ค้นหาได้ตามสิทธิ์ที่พยาบาลให้ไว้)',
  ],
  nurse: [
    'ผู้ป่วย — ชื่อ นามสกุล หรือ HN (เฉพาะผู้ป่วยในความดูแลของคุณ)',
    'นัดหมายวิดีโอคอล — ชื่อผู้ป่วย หรือเหตุผลที่นัด',
    'แผนการดูแลที่กำหนดไว้ — เป้าหมาย สิ่งที่ต้องทำ',
    'ความรู้สุขภาพที่มอบหมาย — ชื่อบทเรียน หมวดหมู่',
    'ข้อความแชท — คำในข้อความของผู้ป่วยที่ดูแล',
    'หน้าต่างๆ ของระบบ — เช่น นัดหมาย แชทผู้ป่วย โปรไฟล์',
  ],
};

const patientNotif = ROUTES.PATIENT_NOTIFICATION_SETTINGS;
const caregiverNotif = ROUTES.CAREGIVER_NOTIFICATION_SETTINGS;
const nurseNotif = ROUTES.NURSE_NOTIFICATION_SETTINGS;

export const PAGE_SHORTCUTS = {
  patient: [
    { label: 'หน้าหลัก', to: ROUTES.PATIENT_HOME, keywords: ['home', 'นัดหมาย', 'วิดีโอคอล', 'ปรึกษา', 'พยาบาล'] },
    { label: 'บันทึกสุขภาพ', to: ROUTES.PATIENT_HEALTH_LOG, keywords: ['น้ำตาล', 'ความดัน', 'hba1c', 'ldl', 'อาหาร', 'ออกกำลังกาย', 'กราฟ', 'ประวัติ'] },
    { label: 'การดูแลของฉัน', to: ROUTES.PATIENT_MY_CARE, keywords: ['แผนการดูแล', 'ความรู้สุขภาพ', 'บทเรียน'] },
    { label: 'แชทกลุ่มดูแลสุขภาพ', to: ROUTES.PATIENT_CHAT, keywords: ['ข้อความ', 'chat', 'พยาบาล', 'ผู้ดูแล'] },
    { label: 'โปรไฟล์', to: ROUTES.PATIENT_PROFILE, keywords: ['ข้อมูลส่วนตัว', 'เปลี่ยนพยาบาล', 'ความยินยอม', 'ลบข้อมูล', 'ขนาดตัวอักษร', 'ธีม', 'ออกจากระบบ'] },
    { label: 'ตั้งค่าการแจ้งเตือน', to: patientNotif, keywords: ['แจ้งเตือน', 'notification', 'อุปกรณ์'] },
    { label: 'การแจ้งเตือนก่อนการวิดีโอคอล', to: `${patientNotif}/video-call`, keywords: ['แจ้งเตือน', 'ล่วงหน้า', 'วิดีโอคอล', 'นัดหมาย'] },
  ],
  caregiver: [
    { label: 'หน้าหลัก', to: ROUTES.CAREGIVER_HOME, keywords: ['home', 'นัดหมาย', 'วิดีโอคอล', 'ผู้ป่วย'] },
    { label: 'บันทึกสุขภาพ', to: ROUTES.CAREGIVER_HEALTH_LOG, keywords: ['น้ำตาล', 'ความดัน', 'hba1c', 'ldl', 'อาหาร', 'ออกกำลังกาย', 'กราฟ', 'ประวัติ'] },
    { label: 'การดูแลของผู้ป่วย', to: ROUTES.CAREGIVER_MY_CARE, keywords: ['แผนการดูแล', 'ความรู้สุขภาพ', 'บทเรียน'] },
    { label: 'แชทกลุ่มดูแลผู้ป่วย', to: ROUTES.CAREGIVER_CHAT, keywords: ['ข้อความ', 'chat', 'พยาบาล'] },
    { label: 'โปรไฟล์', to: ROUTES.CAREGIVER_PROFILE, keywords: ['ข้อมูลผู้ดูแล', 'ความสัมพันธ์', 'ขนาดตัวอักษร', 'ธีม', 'ออกจากระบบ'] },
    { label: 'ตั้งค่าการแจ้งเตือน', to: caregiverNotif, keywords: ['แจ้งเตือน', 'notification', 'อุปกรณ์'] },
    { label: 'การแจ้งเตือนก่อนการวิดีโอคอล', to: `${caregiverNotif}/video-call`, keywords: ['แจ้งเตือน', 'ล่วงหน้า', 'วิดีโอคอล', 'นัดหมาย'] },
  ],
  nurse: [
    { label: 'หน้าหลัก (รายชื่อผู้ป่วย)', to: ROUTES.NURSE_HOME, keywords: ['home', 'ผู้ป่วย', 'รายชื่อ', 'hn'] },
    { label: 'นัดหมาย', to: ROUTES.NURSE_APPOINTMENTS, keywords: ['วิดีโอคอล', 'ปรึกษา', 'appointment'] },
    { label: 'แชทผู้ป่วย', to: ROUTES.NURSE_CHAT, keywords: ['ข้อความ', 'chat', 'ผู้ป่วย'] },
    { label: 'ประวัติการปรึกษา', to: ROUTES.NURSE_HISTORY, keywords: ['history', 'ประวัติ', 'บันทึกการปรึกษา'] },
    { label: 'โปรไฟล์', to: ROUTES.NURSE_PROFILE, keywords: ['ข้อมูลพยาบาล', 'ขนาดตัวอักษร', 'ธีม', 'ออกจากระบบ'] },
    { label: 'ตั้งค่าการแจ้งเตือน', to: nurseNotif, keywords: ['แจ้งเตือน', 'notification', 'อุปกรณ์'] },
    { label: 'การแจ้งเตือนก่อนการวิดีโอคอล', to: `${nurseNotif}/video-call`, keywords: ['แจ้งเตือน', 'ล่วงหน้า', 'วิดีโอคอล', 'นัดหมาย'] },
  ],
};

// ทางลัดที่ตรงกับคำค้น: ทุกคำ (คั่นด้วยช่องว่าง) ต้องปรากฏใน ชื่อหน้า หรือคำสำคัญ
export function matchShortcuts(role, query) {
  const tokens = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return (PAGE_SHORTCUTS[role] || [])
    .filter((s) => {
      const haystack = `${s.label} ${s.keywords.join(' ')}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    })
    .slice(0, 4)
    .map((s) => ({ id: s.to, icon: 'page', title: s.label, subtitle: 'ไปที่หน้านี้', link: s.to }));
}