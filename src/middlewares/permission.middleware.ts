import type { NextFunction, Request, Response } from 'express';
import RolePermission from "../models/RolePermission.js";
import OrganizationMember from "../models/OrganizationMember.js";
import { PERMISSIONS } from "../constants/index.js";
import { DEFAULT_ROLE_PERMISSIONS, getRolePermissions, type RoleType, normalizeRoleName } from "../utils/permissionPresets.js";
import { AppError } from "./errorHandler.js";

/**
 * Fallback permissions when DB seed is missing (for new roles)
 * Maps legacy role enums to new role types for backward compatibility
 */
const fallbackPermissionsByRole = {
  SUPER_ADMIN: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
  ADMIN: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
  MANAGER: DEFAULT_ROLE_PERMISSIONS['MANAGER'],
  MEMBER: DEFAULT_ROLE_PERMISSIONS['MEMBER'],
  VIEWER: DEFAULT_ROLE_PERMISSIONS['VIEWER'],
  OWNER: DEFAULT_ROLE_PERMISSIONS['OWNER'],
};

/**
 * requirePermission middleware - Checks if user has required permission
 * Supports both role-based and custom permission overrides
 * 
 * Permission resolution order:
 * 1. Check if OWNER → grant all permissions
 * 2. Check OrganizationMember custom permissions array
 * 3. Fall back to role default permissions from DB or static defaults
 * 
 * @param {string} permission - Required permission string (e.g., 'CREATE_TASK')
 * @returns {Express.Middleware} Middleware function
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, organizationId: ctxOrgId, userId } = req as any;
      
      // Smart organization ID resolution - handle "0" placeholder from frontend
      let organizationId = req.baseUrl.includes('organizations') 
        ? (req.params.orgId || req.params.id) 
        : req.params.orgId;
        
      if (!organizationId || organizationId === '0') {
        organizationId = ctxOrgId;
      }

      if (!role) {
        console.warn(`[PermissionGuard] Denied: No role found for request to ${req.originalUrl}`);
        return res.status(403).json({
          success: false,
          message: "Access denied: No role context.",
        });
      }

      // OWNER should not be blocked by permission checks
      const normalizedRole = (role === 'SUPER_ADMIN' ? 'ADMIN' : role) as RoleType;
      if (normalizedRole === 'OWNER') {
        return next();
      }

      try {
        // Get member-specific permissions from DB
        const memberRecord = organizationId && userId
          ? await OrganizationMember.findOne({
              organizationId,
              userId,
              isActive: true
            }).select('role permissions')
          : null;

        if (memberRecord) {
          console.info(`[PermissionGuard] Found member record for user ${userId} in org ${organizationId}. Role: ${memberRecord.role}`);
        } else if (organizationId) {
          console.warn(`[PermissionGuard] NO member record for user ${userId} in org ${organizationId}`);
        }

        // Combine role-based and custom permissions
        let effectivePermissions: string[] = [];

        if (memberRecord) {
          const actualRole = (memberRecord.role === 'SUPER_ADMIN' ? 'ADMIN' : memberRecord.role) as RoleType;
          // Get role defaults
          const rolePermissions = DEFAULT_ROLE_PERMISSIONS[actualRole] || [];
          // Add any custom overrides
          const customPermissions = memberRecord.permissions || [];
          effectivePermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));
        } else {
          // Fall back to static defaults if member record not found
          effectivePermissions = fallbackPermissionsByRole[role as keyof typeof fallbackPermissionsByRole] || [];
        }

        // Check if permission is in effective set
        if (effectivePermissions.includes(permission)) {
          return next();
        }

        console.warn(
          `[PermissionGuard] Forbidden: Role '${role}' lacks '${permission}' for org '${organizationId || 'GLOBAL'}' at ${req.originalUrl}. Effective permissions count: ${effectivePermissions.length}`
        );
        return res.status(403).json({
          success: false,
          message: `Forbidden: Lack of permission '${permission}' for this role.`,
        });
      } catch (dbError) {
        console.error('[PermissionGuard] DB error checking permissions:', dbError);
        // Fall back to static defaults if DB check fails
        const fallbackPermissions = fallbackPermissionsByRole[role as keyof typeof fallbackPermissionsByRole] || [];
        if (fallbackPermissions.includes(permission)) {
          return next();
        }
        
        return res.status(403).json({
          success: false,
          message: `Forbidden: Permission '${permission}' denied.`,
        });
      }
    } catch (error: unknown) {
      console.error("requirePermission error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while checking permissions.",
      });
    }
  };
};

/**
 * Utility function to check if a user has permission (for use in services)
 * Can be called directly without HTTP context
 */
export const userHasPermission = async (
  userId: string,
  organizationId: string,
  permission: string,
  role?: string
): Promise<boolean> => {
  try {
    const normalizedRole = (role === 'SUPER_ADMIN' ? 'ADMIN' : role) as RoleType;
    
    if (normalizedRole === 'OWNER') {
      return true;
    }

    const memberRecord = await OrganizationMember.findOne({
      organizationId,
      userId,
      isActive: true
    }).select('role permissions');

    if (!memberRecord) {
      return false;
    }

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];
    const customPermissions = memberRecord.permissions || [];
    const effectivePermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));

    return effectivePermissions.includes(permission);
  } catch (error) {
    console.error('[PermissionCheck] Error checking permission:', error);
    return false;
  }
};

