import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

let retryCount = 0;

const connect = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    retryCount = 0;
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err: unknown) {
    retryCount++;
    const error = err as Error;
    logger.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      logger.warn(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(connect, RETRY_DELAY_MS);
    } else {
      logger.error('🔴 Max retries reached. Shutting down.');
      process.exit(1);
    }
  }
};

mongoose.connection.on('connected', () => logger.info('🟢 Mongoose: connected'));
mongoose.connection.on('error', (err: Error) => logger.error(`🔴 Mongoose error: ${err.message}`));
mongoose.connection.on('disconnected', () => logger.warn('🟡 Mongoose: disconnected'));

export const connectDB = connect;

export const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('🔌 MongoDB connection closed.');
};
