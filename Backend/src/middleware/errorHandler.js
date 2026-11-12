import { env } from '../config/env.js';

/**
 * errorHandler.js
 * Global Error Handler — ต้องเป็น middleware ตัวสุดท้ายที่ mount ใน app.js
 * ป้องกันการรั่วไหลของ Stack Trace ใน Production (NODE_ENV === 'production')
 */

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode === 500) {
    console.error('🔥 UNHANDLED ERROR: - errorHandler.js:15', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || undefined,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export default errorHandler;
