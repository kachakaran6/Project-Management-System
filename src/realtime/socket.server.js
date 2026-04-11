import { Server } from 'socket.io';
import { authSocket } from './socket.middleware.js';
import * as handlers from './socket.handlers.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from './socket.events.js';

let io;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - Node.js HTTP server instance
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // In production, replace with specific origins
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Apply Auth Middleware
  io.use(authSocket);

  io.on('connection', (socket) => {
    console.log(`Socket Connected: User ${socket.userId} (${socket.id})`);

    // Setup room context (Org, User rooms)
    handlers.handleRoomContext(socket);

    // Initialize modular handlers
    handlers.handlePresence(socket, io);
    handlers.handleCollaboration(socket, io);

    socket.on('disconnect', () => {
      console.log(`Socket Disconnected: ${socket.id}`);
    });
  });

  return io;
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
export const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Utility: Emit to multiple users
 */
export const emitToUsers = (userIds, event, data) => {
  if (io) {
    userIds.forEach(userId => {
      io.to(SOCKET_ROOMS.USER(userId)).emit(event, data);
    });
  }
};
