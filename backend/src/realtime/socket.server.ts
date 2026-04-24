import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { authSocket } from './socket.middleware.js';
import * as handlers from './socket.handlers.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from './socket.events.js';
import { env } from '../config/env.js';

let io: Server | undefined;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - Node.js HTTP server instance
 */
export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });
  const socketServer = io;

  // Apply Auth Middleware
  socketServer.use(authSocket);

  socketServer.on('connection', (socket) => {
    console.log(`Socket Connected: User ${socket.userId} (${socket.id})`);

    // Setup room context (Org, User rooms)
    handlers.handleRoomContext(socket);

    // Initialize modular handlers
    handlers.handlePresence(socket, socketServer);
    handlers.handleCollaboration(socket, socketServer);

    socket.on('disconnect', () => {
      console.log(`Socket Disconnected: ${socket.id}`);
    });
  });

  return socketServer;
};

/**
 * Helper to get the IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Utility: Emit to specific room
 */
export const emitToRoom = (room: string, event: string, data: unknown) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Utility: Emit to multiple users
 */
export const emitToUsers = (userIds: unknown[], event: string, data: unknown) => {
  if (io) {
    const socketServer = io;
    userIds.forEach((userId) => {
      socketServer.to(SOCKET_ROOMS.USER(userId)).emit(event, data);
    });
  }
};

/**
 * Utility: Force logout a user from all devices in real-time
 */
export const emitForceLogout = (userId: string) => {
  if (io) {
    io.to(SOCKET_ROOMS.USER(userId)).emit(SOCKET_EVENTS.FORCE_LOGOUT);
  }
};
