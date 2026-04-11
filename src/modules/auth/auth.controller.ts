import * as authService from './auth.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);

  return res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    data: user
  });
});

/**
 * Login user and return tokens
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, organizationId } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required.' 
    });
  }

  const { accessToken, refreshToken, user } = await authService.loginUser(email, password, organizationId);

  // Securely set refreshToken in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: { accessToken, user }
  });
});

/**
 * Refresh access token
 */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ 
      success: false, 
      message: 'No refresh token provided.' 
    });
  }

  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(refreshToken);

  // Update refreshToken in cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.status(200).json({
    success: true,
    message: 'Token refreshed successfully.',
    data: { accessToken }
  });
});

/**
 * Get current user profile (me)
 */
export const me = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
      organizationId: req.organizationId,
      role: req.role
    }
  });
});

/**
 * Initiate forgot password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  await authService.forgotPassword(email);

  return res.status(200).json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.'
  });
});

/**
 * Reset password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and password are required.' });
  }

  await authService.resetPassword(token, password);

  return res.status(200).json({
    success: true,
    message: 'Password reset successful. Please login with your new password.'
  });
});

/**
 * Verify email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required.' });
  }

  await authService.verifyEmail(token);

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully.'
  });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (refreshToken) {
    await authService.logoutUser(refreshToken);
  }

  res.clearCookie('refreshToken');

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
});
