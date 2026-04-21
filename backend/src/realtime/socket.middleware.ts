import type { ExtendedError, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token.js';
import OrganizationMember from '../models/OrganizationMember.js';

/**
 * Socket.io authentication middleware
 */
export const authSocket = async (socket: Socket, next: (err?: ExtendedError | Error) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication failed: No token provided.'));
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return next(new Error('Authentication failed: Invalid token.'));
    }

    // Attach user and organization context to socket
    socket.userId = decoded.userId;
    socket.role = decoded.role;

    // Resolve organizationId from JWT, or handshake query/headers (for switching)
    socket.organizationId = decoded.organizationId || 
                           (socket.handshake.query?.organizationId as string) || 
                           (socket.handshake.headers?.['x-organization-id'] as string);

    // Optional: Validate if user is still an active member of organization
    if (socket.organizationId) {
      const isMember = await OrganizationMember.findOne({
        userId: socket.userId,
        organizationId: socket.organizationId,
        isActive: true
      }).select('_id');

      if (!isMember) {
        return next(new Error('Unauthorized: No active membership found.'));
      }
    }

    next();
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error.'));
  }
};
