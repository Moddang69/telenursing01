import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import '../auth/AuthForm.css';
import './PatientProfilePage.css';

// 1. สร้างตัวแปลงค่าความสัมพันธ์เป็นภาษาไทย
const relationshipMap = {
  parent: 'พ่อ/แม่',
  child: 'บุตร',
  spouse: 'คู่สมรส',
  sibling: 'พี่น้อง',
  other: 'อื่นๆ',
};

export default function PatientPersonalInfoDetailPage() {
  const { user } = useAuth();

  // 2. ฟังก์ชันสำหรับจัดการการแสดงผลผู้ดูแล
  const getCaregiverDisplay = () => {
    if (!user?.caregiverName) return '-';
    // ถ้าระบุว่า "อื่นๆ" ให้ดึงข้อความที่พิมพ์ไว้ใน caregiverOther มาแสดง
    if (user.caregiverName === 'other') {
      return user.caregiverOther ? `อื่นๆ (${user.caregiverOther})` : 'อื่นๆ';
    }
    // แปลงค่าภาษาอังกฤษเป็นไทยผ่าน relationshipMap
    return relationshipMap[user.caregiverName] || user.caregiverName;
  };

  const fields = [
    ['ชื่อ-นามสกุล', user?.name],
    ['HN', user?.hn],
    ['วันเดือนปีเกิด', user?.dob],
    ['เพศ', user?.gender === 'male' ? 'ชาย' : user?.gender === 'female' ? 'หญิง' : '-'],
    ['เบอร์โทรศัพท์', user?.phone],
    ['เบอร์ติดต่อสำรอง', user?.secondaryContact],
    ['ผู้ดูแล', getCaregiverDisplay()], // 3. เรียกใช้ฟังก์ชันแปลงข้อความตรงนี้
    ['ที่อยู่ปัจจุบัน', user?.address],
    ['โรคประจำตัวร่วม', user?.comorbidities || 'ไม่มี'],
    ['ประวัติการแพ้ยา', user?.drugAllergies || 'ไม่มี'],
  ];

  return (
    <div className="profile-page">
      <section className="profile-section">
        <h2>ข้อมูลส่วนตัวโดยละเอียด</h2>
        <table className="info-detail-table">
          <tbody>
            {fields.map(([label, value]) => (
              <tr key={label}>
                <td className="info-label">{label}</td>
                <td>{value || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="info-edit-note">
          ⓘ หากต้องการแก้ไขข้อมูล กรุณาติดต่อพยาบาลผู้ดูแลของท่าน
        </p>
      </section>
    </div>
  );
}