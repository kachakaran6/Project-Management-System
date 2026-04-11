import type { NextFunction, Request, Response } from 'express';
import RolePermission from "../models/RolePermission.js";
import { PERMISSIONS } from "../constants/index.js";

const fallbackPermissionsByRole = {
  SUPER_ADMIN: [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.INVITE_USER,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.MANAGE_WORKSPACE,
  ],
  ADMIN: [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.INVITE_USER,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.MANAGE_WORKSPACE,
  ],
  MANAGER: [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.MANAGE_WORKSPACE,
  ],
  MEMBER: [PERMISSIONS.VIEW_PROJECT],
};

/**
 * requirePermission middleware - Dynamically checks permissions from DB for RBAC
 * @param {string} permission - Required permission string (e.g., 'CREATE_TASK')
 * @returns {Express.Middleware} Middleware function
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, organizationId } = req;

      if (!role) {
        return res.status(403).json({
          success: false,
          message: "Access denied: No role context.",
        });
      }

      // SUPER_ADMIN should not be blocked by missing DB policy rows.
      if (role === "SUPER_ADMIN") {
        return next();
      }

      // Check for permission assigned to this role (global or specific to organization)
      const hasPermission = await RolePermission.findOne({
        role,
        permission,
        isActive: true,
        $or: [
          { organizationId: organizationId }, // Specific to organization
          { organizationId: null }, // System-wide default
        ],
      }).select("_id");

      if (!hasPermission) {
        // Fallback to static defaults when DB seed is missing/incomplete.
        const fallbackPermissions = fallbackPermissionsByRole[role as keyof typeof fallbackPermissionsByRole] || [];
        if (fallbackPermissions.includes(permission)) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: `Forbidden: Lack of permission '${permission}' for this role.`,
        });
      }

      next();
    } catch (error: unknown) {
      console.error("requirePermission error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while checking permissions.",
      });
    }
  };
};
