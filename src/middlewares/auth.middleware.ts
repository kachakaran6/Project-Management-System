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

    // Attach user to request
    req.user = {
      id: decoded.userId as string,
      role: decoded.role,
    };

    req.role = decoded.role;

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
