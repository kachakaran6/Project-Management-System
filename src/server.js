import type { Server as HttpServer } from 'http';
import dns from 'node:dns';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './realtime/socket.server.js';
import { logger } from './utils/logger.js';

// Render can return IPv6 first for SMTP hosts; prefer IPv4 to avoid ENETUNREACH.
dns.setDefaultResultOrder('ipv4first');

// ─── Crash Guards (register BEFORE anything async) ────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error(`💥 Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`💥 Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let server;

const shutdown = async (signal) => {
  logger.warn(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      logger.info('🔒 HTTP server closed.');
      await disconnectDB();
      logger.info('👋 Process exiting cleanly.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const start = async () => {
  // Connect to DB first — only serve traffic when ready
  await connectDB();

  // Wrap Express app with HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.io
  initSocket(httpServer);

  server = httpServer.listen(env.port, () => {
    logger.info('─────────────────────────────────────────');
    logger.info(`🚀 Server running in ${env.nodeEnv} mode`);
    logger.info(`🌐 Listening on port ${env.port}`);
    logger.info(`📡 Real-time Engine: Enabled (Socket.IO)`);
    logger.info(`❤️  Health check: http://localhost:${env.port}/health`);
    logger.info('─────────────────────────────────────────');
  });

  server.on('error', (err) => {
    logger.error(`🔴 Server error: ${err.message}`);
    process.exit(1);
  });
};

start();
