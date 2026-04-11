import { verifyAccessToken } from '../utils/token.js';
import OrganizationMember from '../models/OrganizationMember.js';

/**
 * Socket.io authentication middleware
 */
export const authSocket = async (socket, next) => {
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
    socket.organizationId = decoded.organizationId;
    socket.role = decoded.role;

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
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    next(new Error('Authentication error.'));
  }
};
