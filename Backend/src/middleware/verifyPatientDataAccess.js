import { verifySelfAccess } from './verifySelfAccess.js';
import { verifyCareTeamAccess } from './verifyCareTeamAccess.js';
import { verifyCaregiverLinkAccess } from './verifyCaregiverLinkAccess.js';

/**
 * verifyPatientDataAccess.js
 * รวม 3 Data Scoping Middleware เป็นชุดเดียว สำหรับ Route ที่ต้องรองรับทั้ง 3 Role
 * (Patient self, Nurse careteam, Caregiver link+permission) เข้าถึงข้อมูลของ Patient คนเดียวกัน
 *
 * Usage: verifyPatientDataAccess()                      -> อ่านอย่างเดียว ไม่ตรวจ permission เฉพาะ
 *        verifyPatientDataAccess('assistHealthLog')      -> ตรวจ permission เฉพาะสำหรับ Caregiver ที่จะเขียนข้อมูล
 *
 * ลำดับการรัน: verifySelfAccess -> verifyCareTeamAccess -> verifyCaregiverLinkAccess
 * แต่ละ Middleware จะ next() ทันทีถ้า req.user.role ไม่ตรงกับที่ตนรับผิดชอบ (ดู Phase 9)
 */
export function verifyPatientDataAccess(requiredCaregiverPermission = null) {
  const caregiverCheck = verifyCaregiverLinkAccess(requiredCaregiverPermission);

  return [verifySelfAccess, verifyCareTeamAccess, caregiverCheck];
}

export default verifyPatientDataAccess;
