import jwt from 'jsonwebtoken';

/**
 * Generate Access Token (short-lived)
 * @param {object} payload - JWT data (userId, organizationId, role)
 * @returns {string} Signed JWT
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
  });
};

/**
 * Generate Refresh Token (long-lived)
 * @param {object} payload - JWT data (userId)
 * @returns {string} Signed JWT
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
  });
};

/**
 * Verify Access Token
 * @param {string} token - Signed JWT
 * @returns {object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 * @param {string} token - Signed Refresh Token
 * @returns {object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
