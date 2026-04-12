import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_ROOMS } from './socket.events.js';
import * as presenceService from './presence.service.js';

/**
 * Handle Presence Events
 */
export const handlePresence = (socket: Socket, io: Server) => {
  socket.on(SOCKET_EVENTS.PRESENCE_JOIN, ({ workspaceId }: { workspaceId?: string }) => {
    if (!workspaceId) return;

    socket.join(SOCKET_ROOMS.WORKSPACE(workspaceId));
    
    // Track presence
    const activeUsers = presenceService.joinWorkspacePresence(workspaceId, socket.userId!);
    
    // Broadcast updated presence list to room
    io.to(SOCKET_ROOMS.WORKSPACE(workspaceId)).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      workspaceId,
      activeUsers
    });
    
    console.log(`Presence: User ${socket.userId} joined workspace ${workspaceId}`);
  });

  socket.on(SOCKET_EVENTS.PRESENCE_LEAVE, ({ workspaceId }: { workspaceId?: string }) => {
    if (!workspaceId) return;

    socket.leave(SOCKET_ROOMS.WORKSPACE(workspaceId));
    
    const activeUsers = presenceService.leaveWorkspacePresence(workspaceId, socket.userId!);
    
    io.to(SOCKET_ROOMS.WORKSPACE(workspaceId)).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      workspaceId,
      activeUsers
    });
  });
};

/**
 * Handle Real-time Collaboration (Typing Indicators)
 */
export const handleCollaboration = (socket: Socket, io: Server) => {
  socket.on(SOCKET_EVENTS.TYPING_START, ({ taskId }: { taskId?: string }) => {
    if (!taskId) return;
    
    socket.join(SOCKET_ROOMS.TASK(taskId)); // Ensure user is in task room
    
    // Broadcast typing to task room except the sender
    socket.to(SOCKET_ROOMS.TASK(taskId)).emit(SOCKET_EVENTS.TYPING_START, {
      userId: socket.userId,
      taskId
    });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, ({ taskId }: { taskId?: string }) => {
    if (!taskId) return;
    socket.to(SOCKET_ROOMS.TASK(taskId)).emit(SOCKET_EVENTS.TYPING_STOP, {
      userId: socket.userId,
      taskId
    });
  });
};

/**
 * Handle Room Joins (Context Switching)
 */
export const handleRoomContext = (socket: Socket) => {
  // Join organization-level broad room
  if (socket.organizationId) {
    socket.join(SOCKET_ROOMS.ORGANIZATION(socket.organizationId));
  }
  
  // Join user's personal notification room
  socket.join(SOCKET_ROOMS.USER(socket.userId!));

  socket.on('room:join:project', ({ projectId }: { projectId?: string }) => {
    if (projectId) socket.join(SOCKET_ROOMS.PROJECT(projectId));
  });

  socket.on('room:join:task', ({ taskId }: { taskId?: string }) => {
    if (taskId) socket.join(SOCKET_ROOMS.TASK(taskId));
  });
};
