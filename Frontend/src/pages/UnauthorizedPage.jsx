import React from 'react';
import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="state-page" role="alert">
      <h1>ไม่มีสิทธิ์เข้าถึง</h1>
      <p>คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้</p>
      <Link to="/login" className="btn-primary">
        กลับสู่หน้าเข้าสู่ระบบ
      </Link>
    </div>
  );
}