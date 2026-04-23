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

  let result;
  try {
    result = await authService.loginUser(email, password, organizationId, { ip, userAgent });
  } catch (error: any) {
    if (organizationId) {
      import('../../utils/systemTriggers.js').then(({ logActivity }) => {
        logActivity({
          userId: '000000000000000000000000',
          organizationId,
          action: 'FAILED_LOGIN',
          resourceType: 'AUTH',
          resourceId: organizationId,
          message: `Failed login attempt for ${email}`,
          metadata: { ip, userAgent, email }
        });
      }).catch(() => {});
    }
    throw error;
  }

  const { accessToken, refreshToken, user } = result;

  // Capture Activity for System Pipeline (includes Telegram)
  if (organizationId) {
    import('../../utils/systemTriggers.js').then(({ logActivity }) => {
      logActivity({
        userId: (user as any).id || (user as any)._id,
        organizationId,
        action: 'USER_LOGIN',
        resourceType: 'AUTH',
        resourceId: (user as any).id || (user as any)._id,
        message: `User logged in from ${userAgent.substring(0, 20)}...`,
        metadata: {
          ip,
          device: userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : ''),
          method: 'PASSWORD'
        }
      });
    }).catch(err => console.error('Failed to log login activity:', err));
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
  const ip        = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'Unknown';
  const userAgent = req.headers['user-agent'] || '';

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'No refresh token provided.',
    });
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await authService.refreshAccessToken(refreshToken, { ip, userAgent });

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
    
    // Capture Activity for System Pipeline
    if (req.user && req.organizationId) {
       import('../../utils/systemTriggers.js').then(({ logActivity }) => {
        logActivity({
          userId: req.user.id,
          organizationId: req.organizationId,
          action: 'USER_LOGOUT',
          resourceType: 'AUTH',
          resourceId: req.user.id,
          message: 'User logged out'
        });
      }).catch(err => console.error('Failed to log logout activity:', err));
    }
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
 * POST /auth/logout-all
 * Compatibility endpoint that now invalidates all DB-backed sessions.
 */
export const logoutAll = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  await authService.logoutAllUserSessions(req.user.id);

  res.clearCookie('refreshToken', {
    ...refreshCookieOptions,
    maxAge: undefined,
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out from all devices.',
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
