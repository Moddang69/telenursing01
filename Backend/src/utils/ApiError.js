/**
 * ApiError.js
 * Custom Error Class เพื่อให้ Controller/Middleware throw error พร้อม statusCode ที่ชัดเจน
 * ใช้คู่กับ errorHandler.js middleware กลาง
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // แยก Error ที่คาดการณ์ได้ ออกจาก Bug จริง
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
