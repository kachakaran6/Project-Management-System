import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as authService from '../auth/auth.service.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { hashRefreshToken } from '../../utils/session.js';

const getRefreshTokenFromRequest = (req: any): string | undefined => {
  return req.cookies?.refreshToken || req.body?.refreshToken;
};

export const getSessions = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new AppError('Not authenticated.', 401);
  }

  const currentRefreshToken = getRefreshTokenFromRequest(req);
  const sessions = await authService.getUserActiveSessions(req.user.id, currentRefreshToken);

  return res.status(200).json({
    success: true,
    data: { sessions },
  });
});

export const logoutSession = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new AppError('Not authenticated.', 401);
  }

  const sessionId = req.body?.sessionId as string | undefined;
  const currentRefreshToken = getRefreshTokenFromRequest(req);
  let shouldClearCookie = false;

  if (sessionId) {
    const loggedOutSession = await authService.logoutSessionById(req.user.id, sessionId);
    if (currentRefreshToken && loggedOutSession.refreshToken === hashRefreshToken(currentRefreshToken)) {
      shouldClearCookie = true;
    }
  } else if (currentRefreshToken) {
    await authService.logoutUser(currentRefreshToken);
    shouldClearCookie = true;
  } else {
    throw new AppError('No session identifier provided.', 400);
  }

  if (shouldClearCookie) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Session logged out successfully.',
  });
});

export const logoutAllSessions = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new AppError('Not authenticated.', 401);
  }

  await authService.logoutAllUserSessions(req.user.id);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out from all devices.',
  });
});
