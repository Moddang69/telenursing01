import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * ใช้ MongoMemoryReplSet (ไม่ใช่ MongoMemoryServer) เพราะ Mongoose Transaction
 * (mongoose.startSession() + session.commitTransaction()) ต้องรันบน Replica Set เท่านั้น
 * MongoServerError: "Transaction numbers are only allowed on a replica set member or mongos"
 */
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();

  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_unit_tests_only';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  process.env.NODE_ENV = 'test'; // สำคัญ: ให้ otp.service.js ข้าม cooldown check (ดู FIX 2)

  await mongoose.connect(uri);
}, 60000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});
