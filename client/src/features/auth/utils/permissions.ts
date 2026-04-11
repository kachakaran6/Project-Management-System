import { Role } from "@/types/organization.types";

export const PERMISSIONS = {
  MANAGE_TASKS: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  DELETE_PROJECT: ["SUPER_ADMIN", "ADMIN"],
  INVITE_MEMBERS: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  MANAGE_BILLING: ["SUPER_ADMIN", "ADMIN"],
  VIEW_REPORT: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Higher-order permission check for multiple or specific role requirements.
 */
export function checkAccess(role: Role, requiredRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    MANAGER: 2,
    MEMBER: 1,
  };

  return hierarchy[role] >= hierarchy[requiredRole];
}
