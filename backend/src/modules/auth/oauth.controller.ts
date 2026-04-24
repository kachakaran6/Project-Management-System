import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { env } from '../../config/env.js';
import * as authService from './auth.service.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.js';
import { hashRefreshToken, parseDeviceInfo, getRefreshTokenExpiryDate } from '../../utils/session.js';
import Session from '../../models/Session.js';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

/**
 * GET /auth/google
 * Redirects user to Google OAuth consent screen
 */
export const googleAuth = asyncHandler(async (req, res) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${env.frontendUrl}/oauth/callback/google`,
    client_id: env.googleClientId || '',
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  return res.redirect(`${rootUrl}?${qs.toString()}`);
});

/**
 * POST /auth/google/callback
 * Exchanges code for user profile and logs them in
 */
export const googleCallback = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    throw new AppError('Authorization code not provided.', 400);
  }

  // 1. Exchange code for tokens
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId || '',
      client_secret: env.googleClientSecret || '',
      redirect_uri: `${env.frontendUrl}/oauth/callback/google`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResponse.json() as any;
  if (!tokenData.access_token) {
    throw new AppError('Failed to exchange code for Google token.', 401);
  }

  // 2. Fetch user profile
  const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
  const profile = await userResponse.json() as any;

  if (!profile.email) {
    throw new AppError('Email not shared by Google.', 400);
  }

  // 3. Handle user in database
  const user = await authService.handleOAuthUser({
    email: profile.email,
    firstName: profile.given_name || 'Google',
    lastName: profile.family_name || 'User',
    provider: 'google',
    providerId: profile.id,
    avatarUrl: profile.picture,
  });

  // 4. Issue session tokens (reuse login logic)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'Unknown';
  const userAgent = req.headers['user-agent'] || '';

  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });
  const refreshTokenValue = generateRefreshToken({ userId: user._id });
  const refreshTokenHash = hashRefreshToken(refreshTokenValue);
  const { deviceName, deviceType } = parseDeviceInfo(userAgent);

  await Session.create({
    userId: user._id,
    refreshToken: refreshTokenHash,
    deviceName,
    deviceType,
    ipAddress: ip,
    userAgent,
    isActive: true,
    lastActiveAt: new Date(),
    expiresAt: getRefreshTokenExpiryDate(refreshTokenValue),
  });

  res.cookie('refreshToken', refreshTokenValue, refreshCookieOptions as any);

  return res.status(200).json({
    success: true,
    data: { 
      accessToken, 
      refreshToken: refreshTokenValue,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      } 
    },
  });
});

/**
 * GET /auth/github
 */
export const githubAuth = asyncHandler(async (req, res) => {
  const rootUrl = 'https://github.com/login/oauth/authorize';
  const options = {
    client_id: env.githubClientId || '',
    redirect_uri: `${env.frontendUrl}/oauth/callback/github`,
    scope: 'user:email',
    state: Math.random().toString(36).substring(7),
  };

  const qs = new URLSearchParams(options);
  return res.redirect(`${rootUrl}?${qs.toString()}`);
});

/**
 * POST /auth/github/callback
 */
export const githubCallback = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    throw new AppError('Authorization code not provided.', 400);
  }

  // 1. Exchange code for tokens
  const tokenUrl = 'https://github.com/login/oauth/access_token';
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json' 
    },
    body: JSON.stringify({
      code,
      client_id: env.githubClientId || '',
      client_secret: env.githubClientSecret || '',
      redirect_uri: `${env.frontendUrl}/oauth/callback/github`,
    }),
  });

  const tokenData = await tokenResponse.json() as any;
  if (!tokenData.access_token) {
    throw new AppError('Failed to exchange code for GitHub token.', 401);
  }

  // 2. Fetch user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const profile = await userResponse.json() as any;

  // GitHub email might be null if not public, so fetch emails explicitly
  let email = profile.email;
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const emails = await emailsResponse.json() as any[];
    email = emails.find(e => e.primary && e.verified)?.email || emails[0]?.email;
  }

  if (!email) {
    throw new AppError('Email not shared by GitHub.', 400);
  }

  const nameParts = (profile.name || profile.login).split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || 'User';

  // 3. Handle user in database
  const user = await authService.handleOAuthUser({
    email,
    firstName,
    lastName,
    provider: 'github',
    providerId: profile.id.toString(),
    avatarUrl: profile.avatar_url,
  });

  // 4. Issue session tokens
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'Unknown';
  const userAgent = req.headers['user-agent'] || '';

  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });
  const refreshTokenValue = generateRefreshToken({ userId: user._id });
  const refreshTokenHash = hashRefreshToken(refreshTokenValue);
  const { deviceName, deviceType } = parseDeviceInfo(userAgent);

  await Session.create({
    userId: user._id,
    refreshToken: refreshTokenHash,
    deviceName,
    deviceType,
    ipAddress: ip,
    userAgent,
    isActive: true,
    lastActiveAt: new Date(),
    expiresAt: getRefreshTokenExpiryDate(refreshTokenValue),
  });

  res.cookie('refreshToken', refreshTokenValue, refreshCookieOptions as any);

  return res.status(200).json({
    success: true,
    data: { 
      accessToken, 
      refreshToken: refreshTokenValue,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      } 
    },
  });
});
