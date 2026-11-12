import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { corsOptions } from './config/corsOptions.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

/**
 * app.js
 * ประกอบ Express Application ทั้งหมด (Middleware Global + Route Mounting)
 * ไม่มีการ .listen() ในไฟล์นี้ — แยกไปที่ server.js ตามที่ออกแบบใน Phase 5
 */

const app = express();

// อยู่หลัง Reverse Proxy (Caddy/Nginx/Render ฯลฯ) — ให้ req.ip เป็น IP ผู้ใช้จริง (AuditLog ใช้ req.ip)
app.set('trust proxy', 1);

// ---------- Global Middleware ----------
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' })); // จำกัดขนาด payload ป้องกัน DoS แบบ payload ใหญ่เกินจำเป็น
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Log ทุก request ระหว่างพัฒนา
}

// ---------- Routes ----------
app.use('/api', routes);

// ---------- 404 + Global Error Handler (ต้องอยู่ท้ายสุดเสมอ) ----------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;