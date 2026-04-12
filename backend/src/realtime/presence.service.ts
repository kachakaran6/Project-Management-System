/**
 * Presence Service: Tracking online users per workspace
 * In a production scale system, this would be backed by Redis.
 * But using a memory-based Map ensures logic readiness for scaling.
 */

const presenceMap = new Map<string, Set<string>>(); // key: workspaceId, value: Set(userIds)

/**
 * Add a user to a workspace presence list
 * @param {string} workspaceId 
 * @param {string} userId 
 * @returns {Array<string>} list of active users in workspace
 */
export const joinWorkspacePresence = (workspaceId: string, userId: string) => {
  if (!presenceMap.has(workspaceId)) {
    presenceMap.set(workspaceId, new Set());
  }
  const users = presenceMap.get(workspaceId)!;
  users.add(userId);
  return Array.from(users);
};

/**
 * Remove a user from workspace presence list
 * @param {string} workspaceId 
 * @param {string} userId 
 * @returns {Array<string>} updated list of active users
 */
export const leaveWorkspacePresence = (workspaceId: string, userId: string) => {
  if (presenceMap.has(workspaceId)) {
    const users = presenceMap.get(workspaceId)!;
    users.delete(userId);
    if (users.size === 0) {
      presenceMap.delete(workspaceId);
      return [];
    }
  }
  return presenceMap.has(workspaceId) ? Array.from(presenceMap.get(workspaceId)!) : [];
};

/**
 * Get all online users across a specific workspace
 * @param {string} workspaceId 
 */
export const getActiveUsers = (workspaceId: string) => {
  return presenceMap.has(workspaceId) ? Array.from(presenceMap.get(workspaceId)!) : [];
};
