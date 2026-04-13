import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from "../utils/token.js";
import User from "../models/User.js";
import OrganizationMember from "../models/OrganizationMember.js";

/**
 * requireAuth middleware - Validates JWT and attaches user info to request
 * @param {Express.Request} req - Express Request object
 * @param {Express.Response} res - Express Response object
 * @param {Express.NextFunction} next - Express Next function
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // Fetch full user from DB to ensure role/status is current
    const user = await User.findById(decoded.userId).select('role status isActive isApproved');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // 3. Resolve Organization & Role Context
    const tenantHeader = req.headers['x-organization-id'];
    const headerOrgId = Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader;
    const paramOrgId = req.params.orgId || req.params.id;
    
    let targetOrgId = (headerOrgId || paramOrgId || "").toString().trim();

    // Fallback if no context
    if (!targetOrgId) {
      const membership = await OrganizationMember.findOne({
        userId: user._id,
        isActive: true,
      }).sort({ joinedAt: 1 });
      targetOrgId = membership?.organizationId?.toString() || "";
    }

    req.organizationId = targetOrgId || null;

    // Resolve Role Context (Organization-specific Role > Platform Role)
    let contextRole: string = user.role; 

    if (targetOrgId) {
      const orgMembership = await OrganizationMember.findOne({
        userId: user._id,
        organizationId: targetOrgId,
        isActive: true
      });
      
      if (orgMembership) {
        contextRole = orgMembership.role;
      } else if (user.role !== 'SUPER_ADMIN') {
        contextRole = 'MEMBER'; 
      }
    }

    if (user.role === 'SUPER_ADMIN') {
      contextRole = 'SUPER_ADMIN';
    }

    req.user = {
      id: user._id.toString(),
      role: contextRole,
      platformRole: user.role
    };

    req.role = contextRole;

    next();
  } catch (error: unknown) {
    const authError = error as Error & { name?: string };
    console.error("requireAuth error:", error);
    if (authError.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired.",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Unauthorized access.",
    });
  }
};

/**
 * requireSuperAdmin middleware - Only allows platform owner
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only Super Admins can access this resource.",
    });
  }
  next();
};

/**
 * requireRole middleware - Checks if user has specific organization role
 * @param {Array<string>} roles - Required roles (e.g. ['ADMIN', 'MANAGER'])
 */
export const requireRole = (roles: Array<string | undefined>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role) {
      return res.status(403).json({
        success: false,
        message: "No role assigned in current context.",
      });
    }

    if (!roles.includes(req.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions for this role.",
      });
    }

    next();
  };
};
