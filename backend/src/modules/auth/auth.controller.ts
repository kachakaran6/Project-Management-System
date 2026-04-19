import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logInfo } from '../../services/logService.js';
import type { CookieOptions } from 'express';
import { env } from '../../config/env.js';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction, 
  sameSite: env.isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

/**
 * POST /auth/register
 * Registers a new user and dispatches OTP verification email.
 * Returns { needsVerification: true, email } so the frontend
 * knows to show the OTP step.
 */
export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);

  return res.status(201).json({
    success: true,
    message: result.needsVerification
      ? 'Account created. Please check your email for a verification code.'
      : 'Account created successfully.',
    data: result,
  });
});

/**
 * POST /auth/send-otp
 * (Re)sends an OTP to the given email.
 * Rate-limiting should be enforced at the route/middleware level.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  await authService.sendOtp(email);

  return res.status(200).json({
    success: true,
    message: 'A verification code has been sent to your email.',
  });
});

/**
 * POST /auth/verify-otp
 * Verifies the submitted OTP and marks the user as email-verified.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required.',
    });
  }

  const user = await authService.verifyOtp(email, otp);

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
    data: { user },
  });
});

/**
 * POST /auth/login
 * Authenticates a user (enforces email verification).
 * Also captures IP + User-Agent for login notification email.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, organizationId } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const ip        = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'Unknown';
  const userAgent = req.headers['user-agent'] || '';

  const { accessToken, refreshToken, user } = await authService.loginUser(
    email,
    password,
    organizationId,
    { ip, userAgent },
  );

  // Structured Audit Log
  await logInfo(`User logged in: ${user.email}`, {
    module: 'AUTH',
    action: 'LOGIN_SUCCESS',
    performedBy: {
      userId: (user as any).id || (user as any)._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email
    },
    ip,
    userAgent,
    organizationId: organizationId || null,
    metadata: { method: 'PASSWORD' }
  });

  // Telegram Notification for login (Multi-tenant)
  if (organizationId) {
    try {
      const { broadcastToOrg, formatTelegramMessage } = await import('../notification/telegram.service.js');
      const Organization = (await import('../../models/Organization.js')).default;
      const org = await Organization.findById(organizationId).lean();
      
      const tgMessage = formatTelegramMessage('Admin Login', org?.name || 'Platform', {
        'User': `${user.firstName} ${user.lastName}`,
        'IP Address': ip,
        'Device': userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : '')
      });

      await broadcastToOrg({
        organizationId,
        eventType: 'ADMIN_LOGINS',
        message: tgMessage,
        excludeUserId: (user as any).id || (user as any)._id
      });
    } catch (err) {
      console.error('Login telegram notification failed:', err);
    }
  }

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: { accessToken, user },
  });
});

/**
 * POST /auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'No refresh token provided.',
    });
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await authService.refreshAccessToken(refreshToken);

  res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

  return res.status(200).json({
    success: true,
    message: 'Token refreshed successfully.',
    data: { accessToken },
  });
});

/**
 * GET /auth/me
 * Retrieves full profile details for the authenticated user.
 */
export const me = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const user = await authService.getUserById(req.user.id);

  return res.status(200).json({
    success: true,
    data: {
      user,
      organizations: user.organizations || [],
      organizationId: req.organizationId,
      role: req.role || user?.role,
    },
  });
});

/**
 * PATCH /auth/me
 * Updates the current user's profile details.
 */
export const updateMe = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const { firstName, lastName, bio } = req.body;
  
  const user = await authService.updateProfile(req.user.id, {
    firstName,
    lastName,
    bio
  });

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: { user },
  });
});

/**
 * POST /auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  await authService.forgotPassword(email);

  return res.status(200).json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
  });
});

/**
 * POST /auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and password are required.' });
  }

  await authService.resetPassword(token, password);

  return res.status(200).json({
    success: true,
    message: 'Password reset successful. Please login with your new password.',
  });
});

/**
 * GET /auth/verify-email — legacy token-based flow
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required.' });
  }

  await authService.verifyEmail(token);

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully.',
  });
});

/**
 * POST /auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    await authService.logoutUser(refreshToken);
  }

  res.clearCookie('refreshToken', {
    ...refreshCookieOptions,
    maxAge: undefined,
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * POST /auth/request-organization-access
 * Submit access request for elevated organization permissions.
 */
export const requestOrganizationAccess = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const data = await authService.requestOrganizationAccess(req.user.id, {
    requestedRole: req.body?.requestedRole,
    note: req.body?.note,
  });

  return res.status(200).json({
    success: true,
    message: 'Organization access request submitted successfully.',
    data,
  });
});

/**
 * GET /auth/organization-access-status
 * Returns approval state of organization access request.
 */
export const organizationAccessStatus = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const data = await authService.getOrganizationAccessStatus(req.user.id);

  return res.status(200).json({
    success: true,
    data,
  });
});
