/**
 * Real-time event constants for consistent communication across frontend and backend.
 */

export const SOCKET_EVENTS = {
  // Connection / Presence
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  PRESENCE_JOIN: 'presence:join',
  PRESENCE_LEAVE: 'presence:leave',
  PRESENCE_UPDATE: 'presence:update', // List of active users
  
  // Tasks
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  
  // Comments
  COMMENT_ADDED: 'comment:added',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  
  // Real-time Collaboration
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  
  // Notifications / Personal
  NOTIFICATION_NEW: 'notification:new'
};

export const SOCKET_ROOMS = {
  ORGANIZATION: (orgId) => `organization:${orgId}`,
  WORKSPACE: (workspaceId) => `workspace:${workspaceId}`,
  PROJECT: (projectId) => `project:${projectId}`,
  TASK: (taskId) => `task:${taskId}`,
  USER: (userId) => `user:${userId}`
};
