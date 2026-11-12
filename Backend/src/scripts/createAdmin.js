/**
 * createAdmin.js
 * -----------------------------------------------------------------------
 * สคริปต์สำหรับสร้างบัญชี Admin คนแรก (Bootstrap)
 *
 * เหตุผลที่ต้องมีไฟล์นี้: POST /api/auth/register ปฏิเสธ role='admin' โดยตั้งใจ
 * (ดู auth.service.js — "Role ไม่ถูกต้องสำหรับการลงทะเบียนสาธารณะ") เพื่อความปลอดภัย
 * ไม่ให้ใครก็ได้สมัครเป็น Admin ผ่านหน้าเว็บสาธารณะ ต้องสร้างผ่านสคริปต์นี้ (รันตรงในเซิร์ฟเวอร์/DB)
 * เท่านั้น — Admin ไม่มี Profile collection แยก (ดู User.js) จึงสร้างแค่ User record เดียวพอ
 *
 * วิธีใช้ (รันจากโฟลเดอร์ Backend/):
 *   node src/scripts/createAdmin.js <email> <password> [firstName] [lastName]
 *
 * ตัวอย่าง:
 *   node src/scripts/createAdmin.js admin@telenursing.local Admin@12345
 *
 * หลังจากนั้น login ด้วยอีเมล/รหัสผ่านนี้ที่หน้า Login ปกติได้เลย (role จะเป็น admin อัตโนมัติ)
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';

async function main() {
  const [, , email, password, firstName = 'System', lastName = 'Admin'] = process.argv;

  if (!email || !password) {
    console.error('❌ ใช้งานผิดรูปแบบ ต้องระบุอีเมลและรหัสผ่าน - createAdmin.js:29');
    console.error('วิธีใช้: node src/scripts/ <email> <password> [firstName] [lastName] - createAdmin.js:30');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร - createAdmin.js:35');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`ℹ️  มีบัญชี Admin สำหรับอีเมลนี้อยู่แล้ว (${email})  ไม่ต้องสร้างซ้ำ - createAdmin.js:44`);
    } else {
      console.error(`❌ อีเมลนี้ถูกใช้เป็นบัญชี role="${existing.role}" อยู่แล้ว ใช้อีเมลอื่น - createAdmin.js:46`);
    }
    await mongoose.disconnect();
    process.exit(existing.role === 'admin' ? 0 : 1);
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const admin = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    roleRefId: null, // Admin ไม่มี Profile collection แยก
    accountStatus: 'ACTIVE',
    emailVerified: true, // ข้าม OTP เพราะสร้างผ่านสคริปต์ฝั่ง Server โดยตรง เชื่อถือได้อยู่แล้ว
  });

  console.log('✅ สร้างบัญชี Admin สำเร็จ - createAdmin.js:63');
  console.log(`Email: ${admin.email} - createAdmin.js:64`);
  console.log(`User ID: ${admin._id} - createAdmin.js:65`);
  console.log('เข้าสู่ระบบได้ที่หน้า Login ปกติด้วยอีเมล/รหัสผ่านนี้ - createAdmin.js:66');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ เกิดข้อผิดพลาด: - createAdmin.js:73', err.message);
  process.exit(1);
});