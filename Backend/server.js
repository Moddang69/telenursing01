import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { initVideoCallSocket } from './src/sockets/videoCallSocket.js';
import { initNotificationService } from './src/services/notification.service.js';
import { startReminderScheduler } from './src/services/notificationScheduler.js';
import { startRetentionScheduler } from './src/services/dataRetention.service.js';

// Import models เพื่อให้ Mongoose ลงทะเบียน Schema ก่อน Server เริ่มรับ Request
import './src/models/index.js';

async function startServer() {
  await connectDB();

  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN.split(',').map((o) => o.trim()), // รองรับหลายโดเมน เหมือน corsOptions.js
      credentials: true,
    },
  });

  // ให้ REST Controller (เช่น chat fallback) ส่ง event เข้า Socket Room ได้
  app.set('io', io);

  // Phase 12 — Real-time Layer: WebRTC Signaling + Chat (แยกจาก REST API ทั้งหมด)
  initVideoCallSocket(io);

  // ระบบแจ้งเตือน: Socket.io (Realtime) + ตัวตั้งเวลาแจ้งเตือนล่วงหน้าก่อนวิดีโอคอล (ไม่รันตอนเทสต์)
  initNotificationService(io);
  if (env.NODE_ENV !== 'test') startReminderScheduler();

  // ลบข้อมูลที่เกินอายุการเก็บตามประเภท (31 / 90 / 200 วัน; ประเภทที่เก็บถาวรไม่ถูกแตะ)
  if (env.NODE_ENV !== 'test') startRetentionScheduler();

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT} - server.js:41`);
    console.log(`Environment: ${env.NODE_ENV} - server.js:42`);
    console.log(`Health check: http://localhost:${env.PORT}/api/health - server.js:43`);
    console.log(`Socket.io ready for WebRTC signaling + Realtime chat - server.js:44`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server: - server.js:49', err);
  process.exit(1);
});