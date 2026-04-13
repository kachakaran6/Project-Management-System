import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';

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
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn']
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET! as Secret, options);
};

/**
 * Generate Refresh Token (long-lived)
 * @param {object} payload - JWT data (userId)
 * @returns {string} Signed JWT
 */
export const generateRefreshToken = (payload: Record<string, unknown>) => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as SignOptions['expiresIn']
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET! as Secret, options);
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
