import { env } from './env.js';

/**
 * corsOptions.js (อัปเดต — Phase 16)
 * รองรับ Frontend Origin หลายค่า (Dev + Production) แยกด้วย comma ใน .env
 * เช่น FRONTEND_ORIGIN=http://localhost:5173,https://telenursing.example.com
 */
const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((o) => o.trim());

export const corsOptions = {
  origin: (origin, callback) => {
    // อนุญาต request ที่ไม่มี origin (เช่น Postman, Server-to-Server) เฉพาะ Dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} ไม่ได้รับอนุญาต`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
