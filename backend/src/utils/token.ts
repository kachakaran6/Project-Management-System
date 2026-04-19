import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

type TokenPayload = jwt.JwtPayload & {
  userId?: string;
  organizationId?: string | null;
  role?: string | null;
};

/**
 * Generate Access Token (short-lived)
 * @param {object} payload - JWT data (userId, organizationId, role)
 * @returns {string} Signed JWT
 */
export const generateAccessToken = (payload: Record<string, unknown>) => {
  const options: SignOptions = {
    expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn']
  };

  return jwt.sign(payload, env.jwtAccessSecret! as Secret, options);
};

/**
 * Generate Refresh Token (long-lived)
 * @param {object} payload - JWT data (userId)
 * @returns {string} Signed JWT
 */
export const generateRefreshToken = (payload: Record<string, unknown>) => {
  const options: SignOptions = {
    expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn'],
    jwtid: crypto.randomUUID()
  };

  return jwt.sign(payload, env.jwtRefreshSecret! as Secret, options);
};

/**
 * Verify Access Token
 * @param {string} token - Signed JWT
 * @returns {object} Decoded payload
 */
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
};

/**
 * Verify Refresh Token
 * @param {string} token - Signed Refresh Token
 * @returns {object} Decoded payload
 */
export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
};
