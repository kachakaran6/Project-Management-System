/**
 * Permission Presets - Defines which permissions each role gets by default
 * These are fallback defaults; individual member permissions can override via permissions array
 */
import { PERMISSIONS } from '../constants/index.js';

export type RoleType = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  OWNER: 100,
  ADMIN: 90,
  MANAGER: 70,
  MEMBER: 50,
  VIEWER: 10,
};

/**
 * Default permissions for each role
 * OWNER: All permissions (infrastructure level)
 * ADMIN: Nearly all, except MANAGE_BILLING and VIEW_ANALYTICS (finance/reporting)
 * MANAGER: Project, task, page, member management
 * MEMBER: Task work, commenting, viewing
 * VIEWER: Read-only access
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  OWNER: Object.values(PERMISSIONS),

  ADMIN: [
    // Projects
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.DELETE_PROJECT,
    // Tasks
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.MOVE_TASK,
    // Comments
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_COMMENT,
    PERMISSIONS.DELETE_COMMENT,
    // Members
    PERMISSIONS.INVITE_USER,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBER,
    PERMISSIONS.CHANGE_MEMBER_ROLE,
    // Pages
    PERMISSIONS.CREATE_PAGE,
    PERMISSIONS.VIEW_PAGE,
    PERMISSIONS.EDIT_PAGE,
    PERMISSIONS.DELETE_PAGE,
    PERMISSIONS.VIEW_PRIVATE_PAGE,
    // Workspace
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_ANALYTICS,
    // Exclude MANAGE_BILLING (finance only)
  ],

  MANAGER: [
    // Projects
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.EDIT_PROJECT,
    // Tasks (not delete)
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.MOVE_TASK,
    // Comments
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_COMMENT,
    PERMISSIONS.DELETE_COMMENT,
    // Members (invite and change role, but not remove)
    PERMISSIONS.INVITE_USER,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.CHANGE_MEMBER_ROLE,
    // Pages
    PERMISSIONS.CREATE_PAGE,
    PERMISSIONS.VIEW_PAGE,
    PERMISSIONS.EDIT_PAGE,
    PERMISSIONS.VIEW_PRIVATE_PAGE,
    // Workspace
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.VIEW_ANALYTICS,
  ],

  MEMBER: [
    // Projects (read-only except own)
    PERMISSIONS.VIEW_PROJECT,
    // Tasks (full access to own)
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.MOVE_TASK,
    // Comments
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_COMMENT,
    PERMISSIONS.DELETE_COMMENT,
    // Pages
    PERMISSIONS.VIEW_PAGE,
    PERMISSIONS.VIEW_PRIVATE_PAGE,
  ],

  VIEWER: [
    // Read-only access
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.VIEW_PAGE,
  ],
};

/**
 * Get all permissions for a role (including any custom overrides)
 * Used by permission middleware and UI
 */
export function getRolePermissions(
  role: RoleType,
  customPermissions?: string[]
): string[] {
  const basePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
  
  // If custom permissions are provided, merge them
  if (customPermissions && customPermissions.length > 0) {
    return Array.from(new Set([...basePermissions, ...customPermissions]));
  }
  
  return basePermissions;
}

/**
 * Check if a user with a given role has a specific permission
 * Accounts for role hierarchy (OWNER always has all permissions)
 */
export function hasPermission(
  role: RoleType,
  requiredPermission: string,
  customPermissions?: string[]
): boolean {
  // OWNER always has all permissions
  if (role === 'OWNER') {
    return true;
  }

  const permissions = getRolePermissions(role, customPermissions);
  return permissions.includes(requiredPermission);
}

/**
 * Get suggested permissions for UI based on current role
 * Used when inviting users or assigning roles
 */
export function getAvailableRolesForAssignment(actorRole: RoleType): RoleType[] {
  const actorLevel = ROLE_HIERARCHY[actorRole];
  
  return (Object.keys(ROLE_HIERARCHY) as RoleType[]).filter(
    (role) => ROLE_HIERARCHY[role] < actorLevel
  );
}

/**
 * Convert legacy role names to new role names (backward compatibility)
 */
export function normalizeRoleName(legacyRole: string): RoleType {
  const normalizedLegacy = legacyRole.toUpperCase();
  if (normalizedLegacy === 'SUPER_ADMIN') return 'ADMIN';
  if (normalizedLegacy === 'OWNER') return 'OWNER';
  if (normalizedLegacy === 'ADMIN') return 'ADMIN';
  if (normalizedLegacy === 'MANAGER') return 'MANAGER';
  if (normalizedLegacy === 'MEMBER') return 'MEMBER';
  return 'VIEWER';
}
