import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import RefreshToken from '../../models/RefreshToken.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { ROLES } from '../../constants/index.js';
import crypto from 'crypto';

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
  const { firstName, lastName, email, password, role: requestedRole } = userData;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists.', 400);
  }

  const hashedPassword = await hashPassword(password);
  
  // Logic: 
  // Default is USER (ACTIVE)
  // If ADMIN is requested, set to PENDING_APPROVAL and isApproved = false
  const role = requestedRole === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
  const status = role === ROLES.ADMIN ? 'PENDING_APPROVAL' : 'ACTIVE';
  const isApproved = role !== ROLES.ADMIN;

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    status,
    isApproved
  });

  const { password: _, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

/**
 * Login user
 */
export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Check if Admin is approved
  if (user.role === ROLES.ADMIN && !user.isApproved) {
    throw new AppError('Your Admin account is pending approval by an administrator.', 403);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role
  });

  const refreshTokenValue = generateRefreshToken({ userId: user._id });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    token: refreshTokenValue,
    expiresAt
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status
    }
  };
};

/**
 * Initiate password reset flow
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent return for security

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour

  await user.save({ validateBeforeSave: false });

  // TODO: Send reset email here
  // await sendResetEmail(user.email, resetToken);
  
  return resetToken;
};

/**
 * Reset password using token
 */
export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    throw new AppError('Invalid or expired password reset token.', 400);
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  await user.save();

  // Revoke all existing refresh tokens for security
  await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

  return user;
};

/**
 * Verify email using token
 */
export const verifyEmail = async (token) => {
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token.', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  
  await user.save();

  return user;
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (oldRefreshToken) => {
  const storedToken = await RefreshToken.findOne({ 
    token: oldRefreshToken,
    isRevoked: false 
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token is invalid or expired.', 401);
  }

  const membership = await OrganizationMember.findOne({ 
    userId: storedToken.userId, 
    isActive: true 
  });

  const accessToken = generateAccessToken({
    userId: storedToken.userId,
    organizationId: membership?.organizationId || null,
    role: membership?.role || null
  });

  const newRefreshTokenValue = generateRefreshToken({ userId: storedToken.userId });
  storedToken.isRevoked = true;
  storedToken.replacedByToken = newRefreshTokenValue;
  await storedToken.save();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId: storedToken.userId,
    token: newRefreshTokenValue,
    expiresAt
  });

  return {
    accessToken,
    refreshToken: newRefreshTokenValue
  };
};

/**
 * Logout user
 */
export const logoutUser = async (refreshToken) => {
  await RefreshToken.findOneAndUpdate(
    { token: refreshToken },
    { isRevoked: true }
  );
};
