import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * socketAuth.js
 * Socket.io Middleware — ตรวจ JWT จาก handshake.auth.token
 * ต้องผ่านก่อนที่ Client จะ emit event ใดๆ ได้ (ป้องกัน Anonymous Socket Connection)
 */
export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Unauthorized: missing token'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    socket.user = {
      userId: decoded.userId,
      role: decoded.role,
      roleRefId: decoded.roleRefId,
    };
    next();
  } catch (err) {
    next(new Error('Unauthorized: invalid or expired token'));
  }
}

export default socketAuthMiddleware;
