import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { AccessibilityProvider } from './context/AccessibilityContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

/**
 * App.jsx
 * ทำหน้าที่เป็น Composition Root เท่านั้น:
 * - ประกอบ Context Providers ตามลำดับที่ถูกต้อง
 * - Render AppRoutes ซึ่งเก็บ Route ทั้งหมดแยกไว้ที่ src/routes/
 *
 * ห้ามเพิ่ม UI Markup หรือ Business Logic ที่นี่โดยตรง
 */
function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}

export default App;