import agoraToken from 'agora-token';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

// agora-token เป็น CommonJS — ใช้ default import แล้ว destructure เพื่อให้ทำงานใน ESM ได้แน่นอน
const { RtcTokenBuilder, RtcRole } = agoraToken;

/**
 * agora.service.js
 * ออก RTC Token ให้ Client เข้าห้องวิดีโอคอลของ Agora
 * - App Certificate อยู่ฝั่ง Server เท่านั้น
 * - channelName = appointmentId (1 นัดหมาย = 1 ห้อง เหมือน Room ของ socket.io)
 * - uid = 0 หมายถึง Token ใช้ได้กับทุก uid (Client ให้ Agora สุ่ม uid ให้เอง)
 */
export function buildRtcToken({ channelName, uid = 0 }) {
  if (!env.AGORA_APP_ID || !env.AGORA_APP_CERTIFICATE) {
    throw new ApiError(503, 'ระบบวิดีโอคอลยังไม่ได้ตั้งค่า Agora (AGORA_APP_ID / AGORA_APP_CERTIFICATE)');
  }

  const ttl = env.AGORA_TOKEN_TTL_SECONDS;
  const token = RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERTIFICATE,
    String(channelName),
    uid,
    RtcRole.PUBLISHER,
    ttl, // token expire (วินาที นับจากตอนออก)
    ttl // privilege expire
  );

  return {
    appId: env.AGORA_APP_ID,
    channel: String(channelName),
    token,
    uid,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };
}

export default { buildRtcToken };