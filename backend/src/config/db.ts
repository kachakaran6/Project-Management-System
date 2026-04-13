import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connect = async () => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (err: unknown) {
      const error = err as Error;
      lastError = error;
      logger.error(
        `❌ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`,
      );

      if (attempt < MAX_RETRIES) {
        logger.warn(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  logger.error('🔴 Max retries reached. Shutting down.');
  throw lastError ?? new Error('MongoDB connection failed');
};

mongoose.connection.on('connected', () => logger.info('🟢 Mongoose: connected'));
mongoose.connection.on('error', (err: Error) => logger.error(`🔴 Mongoose error: ${err.message}`));
mongoose.connection.on('disconnected', () => logger.warn('🟡 Mongoose: disconnected'));

export const connectDB = connect;

export const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('🔌 MongoDB connection closed.');
};
