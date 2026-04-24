import type { Server as HttpServer } from 'http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './realtime/socket.server.js';
import { logInfo, logError } from './services/logService.js';
import { logger } from './utils/logger.js';
import { startInviteExpiryJob, stopInviteExpiryJob } from './jobs/invite-expiry.job.js';

// ─── Crash Guards (register BEFORE anything async) ────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error(`💥 Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(`💥 Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let server: HttpServer | undefined;

const shutdown = async (signal: string) => {
  logger.warn(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      stopInviteExpiryJob();
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
  logInfo('📦 Database connected successfully', { action: 'DB_CONNECTED', status: 'SUCCESS' });

  // Wrap Express app with HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.io
  initSocket(httpServer);
  startInviteExpiryJob();

  server = httpServer.listen(env.port, () => {
    logInfo('🚀 Server initialization complete', { 
      action: 'SERVER_START', 
      status: 'SUCCESS',
      metadata: { port: env.port, env: env.nodeEnv }
    });
    console.info('─────────────────────────────────────────');
    console.info(`🚀 PMS Orbit running in ${env.nodeEnv} mode`);
    console.info(`🌐 Listening on port ${env.port}`);
    console.info(`📡 Real-time Engine: Enabled (Socket.IO)`);
    console.info(`🔗 Frontend URL: ${env.frontendUrl}`);
    console.info(`❤️  Health check: http://localhost:${env.port}/health`);
    console.info(`🔑 OAuth Google: ${env.googleClientId ? 'Configured' : 'MISSING'}`);
    console.info(`🔑 OAuth GitHub: ${env.githubClientId ? 'Configured' : 'MISSING'}`);
    console.info('─────────────────────────────────────────');
  });

  server.on('error', (err: Error) => {
    logger.error(`🔴 Server error: ${err.message}`);
    process.exit(1);
  });
};

start();
