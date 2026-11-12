
import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(
      `✅ MongoDB Connected: ${mongoose.connection.host}/${mongoose.connection.name}`
    );

  } catch (error) {
    console.error('❌ MongoDB Connection Error: - db.js:19', error.message);
    process.exit(1);
  }
}

// Connection Events
mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connection established - db.js:26');
});

mongoose.connection.on('disconnected', () => {
  console.warn('🔴 MongoDB disconnected - db.js:30');
  console.log('Connection state: - db.js:31', mongoose.connection.readyState);
});

mongoose.connection.on('reconnected', () => {
  console.log('🟢 MongoDB reconnected - db.js:35');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB runtime error: - db.js:39', error.message);
});

export default mongoose;
