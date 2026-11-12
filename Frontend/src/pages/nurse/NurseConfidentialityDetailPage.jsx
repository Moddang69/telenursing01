import React from 'react';
import Accordion from '../../components/common/Accordion.jsx';
import { confidentialitySections} from '../../data/mockConfidentialityContent.js';
import '../patient/ConsentPage.css';

export default function NurseConfidentialityDetailPage() {
  const accordionItems = confidentialitySections.map((s) => ({ title: s.title, content: <p>{s.content}</p> }));
  return (
    <div className="consent-detail-page">
      <h1>นโยบายการรักษาความลับและการคุ้มครองข้อมูลสุขภาพผู้ป่วย</h1>
      <p className="consent-intro">
        เพื่อเป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และมาตรฐานจริยธรรมวิชาชีพ
        บุคลากรผู้เข้าถึงระบบทุกคนต้องรับทราบและปฏิบัติตามนโยบายนี้อย่างเคร่งครัด
      </p>
      <Accordion items={accordionItems} />
      {/*<p className="consent-status-note">เวอร์ชันนโยบาย: {CONFIDENTIALITY_VERSION}</p>*/}
    </div>
  );
}