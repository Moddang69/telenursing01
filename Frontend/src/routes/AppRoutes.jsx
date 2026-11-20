import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import ApprovalRoute from './ApprovalRoute.jsx';
import ConsentRoute from './ConsentRoute.jsx';

import { ROLES } from '../constants/roles.js';
import { ROUTES } from '../constants/routes.js';

// ========================================
// Auth
// ========================================
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import OtpVerificationPage from '../pages/auth/OtpVerificationPage.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx';

import UnauthorizedPage from '../pages/UnauthorizedPage.jsx';
import SessionExpiredPage from '../pages/SessionExpiredPage.jsx';

// ========================================
// Patient Onboarding
// ========================================
import PatientRegistrationPage from '../pages/patient/PatientRegistrationPage.jsx';
import ConsentPage from '../pages/patient/ConsentPage.jsx';

// ========================================
// Patient Layout + Pages
// ========================================
import PatientLayout from '../layouts/PatientLayout.jsx';

import PatientHomePage from '../pages/patient/PatientHomePage.jsx';
import HealthLogPage from '../pages/patient/HealthLogPage.jsx';
import MyCarePage from '../pages/patient/MyCarePage.jsx';
import PatientChatPage from '../pages/patient/PatientChatPage.jsx';
import PatientProfilePage from '../pages/patient/PatientProfilePage.jsx';
import NotificationSettingsPage from '../pages/common/NotificationSettingsPage.jsx';

// Patient Profile Detail Pages
import PatientPersonalInfoDetailPage from '../pages/patient/PatientPersonalInfoDetailPage.jsx';
import PatientConsentDetailPage from '../pages/patient/PatientConsentDetailPage.jsx';

// ========================================
// Patient Video Consultation Flow
// ========================================
import PreConsultCheckPage from '../pages/patient/PreConsultCheckPage.jsx';
import PreConsultQuestionnairePage from '../pages/patient/PreConsultQuestionnairePage.jsx';
import VideoConsultationPage from '../pages/patient/VideoConsultationPage.jsx';

// ========================================
// Nurse Onboarding
// ========================================
import NurseRegistrationPage from '../pages/nurse/NurseRegistrationPage.jsx';
import NursePendingApprovalPage from '../pages/nurse/NursePendingApprovalPage.jsx';

// Nurse Confidentiality Policy
// Public page: สามารถเปิดอ่านได้โดยไม่ต้อง Login
import NurseConfidentialityDetailPage from '../pages/nurse/NurseConfidentialityDetailPage.jsx';

// ========================================
// Nurse Layout + Pages
// ========================================
import NurseLayout from '../layouts/NurseLayout.jsx';

import NurseHomePage from '../pages/nurse/NurseHomePage.jsx';
import NurseChatListPage from '../pages/nurse/NurseChatListPage.jsx';
import NurseChatRoomPage from '../pages/nurse/NurseChatRoomPage.jsx';
import NursePatientListPage from '../pages/nurse/NursePatientListPage.jsx';
import NursePatientDetailPage from '../pages/nurse/NursePatientDetailPage.jsx';
import NurseVideoConsultationPage from '../pages/nurse/NurseVideoConsultationPage.jsx';
import NurseAppointmentsPage from '../pages/nurse/NurseAppointmentsPage.jsx';
import NurseHistoryPage from '../pages/nurse/NurseHistoryPage.jsx';
import NurseProfilePage from '../pages/nurse/NurseProfilePage.jsx';

import SelectNursePage from '../pages/patient/SelectNursePage.jsx';

// ========================================
// Caregiver
// ========================================
import CaregiverLayout from '../layouts/CaregiverLayout.jsx';

import CaregiverHomePage from '../pages/caregiver/CaregiverHomePage.jsx';
import CaregiverHealthLogPage from '../pages/caregiver/CaregiverHealthLogPage.jsx';
import CaregiverMyCarePage from '../pages/caregiver/CaregiverMyCarePage.jsx';
import CaregiverChatPage from '../pages/caregiver/CaregiverChatPage.jsx';
import CaregiverProfilePage from '../pages/caregiver/CaregiverProfilePage.jsx';
import CaregiverRegistrationPage from '../pages/caregiver/CaregiverRegistrationPage.jsx';
import CaregiverLinkPatientPage from '../pages/caregiver/CaregiverLinkPatientPage.jsx';

// ========================================
// Admin Layout + Pages
// ========================================
import AdminLayout from '../layouts/AdminLayout.jsx';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminNurseManagementPage from '../pages/admin/AdminNurseManagementPage.jsx';
import AdminPatientManagementPage from '../pages/admin/AdminPatientManagementPage.jsx';
import AdminDataRequestsPage from '../pages/admin/AdminDataRequestsPage.jsx';
import AdminCaregiverLinksPage from '../pages/admin/AdminCaregiverLinksPage.jsx';
import AdminAuditLogPage from '../pages/admin/AdminAuditLogPage.jsx';

// ========================================
// Common
// ========================================
import PlaceholderPage from '../pages/PlaceholderPage.jsx';

// ========================================
// App Routes
// ========================================

export default function AppRoutes() {
  return (
    <Routes>

      {/* ==================================================
          PUBLIC ROUTES
      ================================================== */}

      {/* Login */}
      <Route
        path={ROUTES.LOGIN}
        element={<LoginPage />}
      />

      {/* Register */}
      <Route
        path={ROUTES.REGISTER}
        element={<RegisterPage />}
      />

      {/* OTP Verification */}
      <Route
        path={`${ROUTES.REGISTER}/otp`}
        element={<OtpVerificationPage />}
      />

      {/* Forgot Password */}
      <Route
        path={`${ROUTES.FORGOT_PASSWORD}/*`}
        element={<ForgotPasswordPage />}
      />

      {/* Unauthorized */}
      <Route
        path={ROUTES.UNAUTHORIZED}
        element={<UnauthorizedPage />}
      />

      {/* Session Expired */}
      <Route
        path={ROUTES.SESSION_EXPIRED}
        element={<SessionExpiredPage />}
      />


      {/* ==================================================
          PUBLIC NURSE CONFIDENTIALITY POLICY

          เปิดอ่านได้โดยไม่ต้อง Login

          ใช้สำหรับ:
          Nurse Registration
              ↓
          กด [นโยบายการรักษาความลับข้อมูลผู้ป่วย]
              ↓
          เปิดหน้านี้
      ================================================== */}

      <Route
        path="/nurse/confidentiality-policy"
        element={<NurseConfidentialityDetailPage />}
      />


      {/* ==================================================
          NURSE REGISTRATION
      ================================================== */}

      <Route
        path="/nurse/registration"
        element={<NurseRegistrationPage />}
      />


      {/* ==================================================
          CAREGIVER REGISTRATION
      ================================================== */}

      <Route
        path="/caregiver/registration"
        element={<CaregiverRegistrationPage />}
      />


      {/* ==================================================
          PATIENT ONBOARDING
      ================================================== */}

      {/* Patient Registration */}
      {/*
        🔧 FIX (root cause ของ "ไม่พบข้อมูลบัญชีผู้ใช้งาน กรุณาเริ่มลงทะเบียนใหม่อีกครั้ง"):
        เดิม Route นี้ถูกครอบด้วย <ProtectedRoute><RoleRoute> ซึ่งต้อง login มาก่อนถึงจะเข้าได้
        แต่ PatientRegistrationPage.jsx ถูกออกแบบให้เป็นขั้นตอนที่ 2 ของการสมัคร (รับ accountData
        ผ่าน location.state จาก RegisterPage.jsx แล้วค่อยเรียก register() เอง) — ซึ่งต้องเข้าถึงได้
        "ก่อน" มีบัญชีอยู่แล้ว (isAuthenticated เป็น false อยู่) ProtectedRoute จึง redirect ไป /login
        ทันทีโดยไม่แสดงฟอร์มเลย และข้อมูลที่ navigate() ส่งมาถูกทิ้งไปเงียบๆ (เทียบกับ
        /nurse/registration ที่ไม่ได้ครอบ ProtectedRoute เลย ถูกต้องอยู่แล้วตั้งแต่แรก)
        แก้โดยเอา ProtectedRoute/RoleRoute ออก ให้เป็น Route สาธารณะเหมือนกับฝั่งพยาบาล
      */}
      <Route
        path={ROUTES.PATIENT_REGISTRATION}
        element={<PatientRegistrationPage />}
      />


      {/* Patient Consent — หน้ายินยอมใหม่หลังถอนความยินยอม (ไม่ครอบด้วย ConsentRoute เพื่อไม่ให้ redirect วน) */}
      <Route
        path={ROUTES.PATIENT_CONSENT}
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.PATIENT]}>
              <ConsentPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.PATIENT_SELECT_NURSE}
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.PATIENT]}>
              <SelectNursePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* เปิดจากลิงก์ในฟอร์มลงทะเบียน — ไม่แสดงปุ่มถอนความยินยอม */}
      <Route
        path="/patient/consent-policy"
        element={<PatientConsentDetailPage showWithdrawOption={false} />
        }
      />

      {/* ==================================================
          PATIENT PRE-CONSULTATION

          Protected:
          Login
          ↓
          Patient Role
          ↓
          Pre-Consultation
      ================================================== */}

      {/* Pre Consult Check */}

      <Route
  path="/patient/pre-consult-check"
  element={
    <ProtectedRoute>
      <RoleRoute allow={[ROLES.PATIENT, ROLES.CAREGIVER]}>
        <PreConsultCheckPage />
      </RoleRoute>
    </ProtectedRoute>
  }
/>

      {/* Pre Consult Questionnaire */}
      <Route
        path="/patient/pre-consult-questionnaire"
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.PATIENT, ROLES.CAREGIVER]}>
              <PreConsultQuestionnairePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Waiting Room / Video Consultation */}
      <Route
        path="/patient/waiting-room"
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.PATIENT, ROLES.CAREGIVER]}>
              <VideoConsultationPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />


      {/* ==================================================
          PATIENT MAIN APPLICATION

          Protected:
          Login
          ↓
          Patient Role
          ↓
          Consent
          ↓
          Patient Layout
      ================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.PATIENT]}>
              <ConsentRoute>
                <PatientLayout title="Telenursing" />
              </ConsentRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      >

        {/* Patient Home */}

        <Route
          path={ROUTES.PATIENT_HOME}
          element={<PatientHomePage />}
        />


        {/* Health Log */}

        <Route
          path={ROUTES.PATIENT_HEALTH_LOG}
          element={<HealthLogPage />}
        />


        {/* My Care */}

        <Route
          path={ROUTES.PATIENT_MY_CARE}
          element={<MyCarePage />}
        />


        {/* Chat กับพยาบาล (Realtime) */}

        <Route
          path={ROUTES.PATIENT_CHAT}
          element={<PatientChatPage />}
        />


        {/* Patient Profile */}

        <Route
          path={ROUTES.PATIENT_PROFILE}
          element={<PatientProfilePage />}
        />

        {/* Patient Notification Settings: การแจ้งเตือน > การแจ้งเตือนก่อนการวิดีโอคอล */}

        <Route
          path={`${ROUTES.PATIENT_NOTIFICATION_SETTINGS}/*`}
          element={
            <NotificationSettingsPage
              basePath={ROUTES.PATIENT_NOTIFICATION_SETTINGS}
              profilePath={ROUTES.PATIENT_PROFILE}
            />
          }
        />


        {/* Personal Information Detail */}

        <Route
          path="/patient/profile/personal-info"
          element={<PatientPersonalInfoDetailPage />}
        />


        {/* Consent Detail */}

        {/* เปิดจากหน้า Profile (อยู่ใน PatientLayout ที่มี ConsentRoute ครอบอยู่ = ใช้งานระบบแล้ว) — แสดงปุ่มถอนความยินยอม */}
        <Route
          path="/patient/profile/consent"
          element={<PatientConsentDetailPage showWithdrawOption={true} />}
        />

      </Route>


      {/* ==================================================
          CAREGIVER
      ================================================== */}

      {/* Caregiver Link Patient */}

      <Route
        path={ROUTES.CAREGIVER_LINK_PATIENT}
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.CAREGIVER]}>
              <CaregiverLinkPatientPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />


      {/* Caregiver Main Application */}

      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.CAREGIVER]}>
              <CaregiverLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >

        {/* Caregiver Home */}

        <Route
          path={ROUTES.CAREGIVER_HOME}
          element={<CaregiverHomePage />}
        />


        {/* Caregiver Health Log */}

        <Route
          path={ROUTES.CAREGIVER_HEALTH_LOG}
          element={<CaregiverHealthLogPage />}
        />


        {/* Caregiver My Care */}

        <Route
          path={ROUTES.CAREGIVER_MY_CARE}
          element={<CaregiverMyCarePage />}
        />


        {/* Caregiver Chat (Realtime) */}

        <Route
          path={ROUTES.CAREGIVER_CHAT}
          element={<CaregiverChatPage />}
        />


        {/* Caregiver Profile */}

        <Route
          path={ROUTES.CAREGIVER_PROFILE}
          element={<CaregiverProfilePage />}
        />

        {/* Caregiver Notification Settings */}

        <Route
          path={`${ROUTES.CAREGIVER_NOTIFICATION_SETTINGS}/*`}
          element={
            <NotificationSettingsPage
              basePath={ROUTES.CAREGIVER_NOTIFICATION_SETTINGS}
              profilePath={ROUTES.CAREGIVER_PROFILE}
            />
          }
        />

      </Route>


      {/* ==================================================
          NURSE ONBOARDING

          หมายเหตุ:
          Nurse ยอมรับนโยบายตั้งแต่ Registration
          และหลังสมัครจะไป Pending Approval โดยตรง
      ================================================== */}

      {/* Nurse Pending Approval */}

      <Route
        path={ROUTES.NURSE_PENDING_APPROVAL}
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.NURSE]}>
              <NursePendingApprovalPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />


      {/* ==================================================
          NURSE MAIN APPLICATION

          Protected:
          Login
          ↓
          Nurse Role
          ↓
          Admin Approval
          ↓
          Nurse Layout
      ================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.NURSE]}>
              <ApprovalRoute>
                <NurseLayout />
              </ApprovalRoute>
            </RoleRoute>
          </ProtectedRoute>
        }
      >

        {/* Nurse Home */}

        <Route
          path={ROUTES.NURSE_HOME}
          element={<NurseHomePage />}
        />


        {/* Nurse Chat — รายการแชทผู้ป่วยหลายคน + ห้องแชทรายบุคคล */}

        <Route
          path={ROUTES.NURSE_CHAT}
          element={<NurseChatListPage />}
        />

        <Route
          path="/nurse/chat/:patientId"
          element={<NurseChatRoomPage />}
        />


        {/* Nurse Appointments */}

        <Route
          path={ROUTES.NURSE_APPOINTMENTS}
          element={<NurseAppointmentsPage />}
        />

        {/* Nurse Patient Detail */}

        <Route
          path="/nurse/patients/:patientId"
          element={<NursePatientDetailPage />}
        />

        {/* Nurse Video Consultation */}

        <Route
          path="/nurse/patients/:patientId/video"
          element={<NurseVideoConsultationPage />}
        />


        {/* Nurse History */}

        <Route
          path={ROUTES.NURSE_HISTORY}
          element={<NurseHistoryPage />}
        />


        {/* Nurse Profile */}

        <Route
          path={ROUTES.NURSE_PROFILE}
          element={<NurseProfilePage />}
        />

        {/* Nurse Notification Settings */}

        <Route
          path={`${ROUTES.NURSE_NOTIFICATION_SETTINGS}/*`}
          element={
            <NotificationSettingsPage
              basePath={ROUTES.NURSE_NOTIFICATION_SETTINGS}
              profilePath={ROUTES.NURSE_PROFILE}
            />
          }
        />

      </Route>


      {/* ==================================================
          ADMIN MAIN APPLICATION

          Protected:
          Login
          ↓
          Admin Role
          ↓
          Admin Layout
      ================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <RoleRoute allow={[ROLES.ADMIN]}>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >

        {/* Admin Dashboard */}

        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={<AdminDashboardPage />}
        />


        {/* Admin Nurse Management */}

        <Route
          path={ROUTES.ADMIN_NURSES}
          element={<AdminNurseManagementPage />}
        />


        {/* Admin Patient Management */}

        <Route
          path={ROUTES.ADMIN_PATIENTS}
          element={<AdminPatientManagementPage />}
        />


        {/* Admin Data Requests */}

        <Route
          path={ROUTES.ADMIN_DATA_REQUESTS}
          element={<AdminDataRequestsPage />}
        />

        {/* Admin Caregiver Link Approval */}

        <Route
          path={ROUTES.ADMIN_CAREGIVER_LINKS}
          element={<AdminCaregiverLinksPage />}
        />

        {/* Admin Audit Log */}

        <Route
          path={ROUTES.ADMIN_AUDIT_LOGS}
          element={<AdminAuditLogPage />}
        />

      </Route>


      {/* ==================================================
          DEFAULT ROUTES
      ================================================== */}

      {/* เปิดเว็บไซต์ครั้งแรก → Login */}

      <Route
        path="/"
        element={
          <Navigate
            to={ROUTES.LOGIN}
            replace
          />
        }
      />


      {/* ไม่พบหน้า */}

      <Route
        path="*"
        element={
          <PlaceholderPage
            title="404 Not Found"
          />
        }
      />

    </Routes>
  );
}