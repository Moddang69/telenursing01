export const ROUTES = Object.freeze({
  // Public / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  UNAUTHORIZED: '/unauthorized',
  SESSION_EXPIRED: '/session-expired',

  // Patient onboarding (blocking flow)
  PATIENT_REGISTRATION: '/patient/registration',
  PATIENT_CONSENT: '/patient/consent',
  PATIENT_SELECT_NURSE: '/patient/select-nurse',
  PATIENT_PRE_CONSULT_CHECK: '/patient/pre-consult-check',

  // Patient main
  PATIENT_HOME: '/patient/home',
  PATIENT_HEALTH_LOG: '/patient/health-log',
  PATIENT_MY_CARE: '/patient/my-care',
  PATIENT_CHAT: '/patient/chat',
  PATIENT_PROFILE: '/patient/profile',
  PATIENT_NOTIFICATION_SETTINGS: '/patient/profile/notifications',

  // Caregiver
  CAREGIVER_LINK_PATIENT: '/caregiver/link-patient',
  CAREGIVER_HOME: '/caregiver/home',
  CAREGIVER_HEALTH_LOG: '/caregiver/health-log',
  CAREGIVER_MY_CARE: '/caregiver/my-care',
  CAREGIVER_CHAT: '/caregiver/chat',
  CAREGIVER_PROFILE: '/caregiver/profile',
  CAREGIVER_NOTIFICATION_SETTINGS: '/caregiver/profile/notifications',

  // Nurse
  NURSE_PENDING_APPROVAL: '/nurse/pending-approval',
  NURSE_CONFIDENTIALITY: '/nurse/confidentiality-policy',
  NURSE_HOME: '/nurse/home',
  NURSE_APPOINTMENTS: '/nurse/appointments',
  NURSE_PATIENTS: '/nurse/patients',
  NURSE_HISTORY: '/nurse/history',
  NURSE_PROFILE: '/nurse/profile',
  NURSE_NOTIFICATION_SETTINGS: '/nurse/profile/notifications',
  NURSE_CHAT: '/nurse/chat',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_PATIENTS: '/admin/patients',
  ADMIN_NURSES: '/admin/nurses',
  ADMIN_ASSIGNMENTS: '/admin/assignments',
  ADMIN_DATA_REQUESTS: '/admin/data-requests',
  ADMIN_CAREGIVER_LINKS: '/admin/caregiver-links',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
});