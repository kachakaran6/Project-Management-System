import crypto from 'crypto';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import RefreshToken from '../../models/RefreshToken.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { ROLES, ACTIVITY_ACTIONS } from '../../constants/index.js';
import { sendEmail } from '../email/email.service.js';
import { getOtpTemplate, getLoginNotificationTemplate, getWelcomeTemplate } from '../email/email.templates.js';
import { logInfo, logError, logWarn } from '../../services/logService.js';
import { logActivity } from '../../utils/systemTriggers.js';

// ─── OTP constants ────────────────────────────────────────────────────────────

const OTP_LENGTH      = 8;      // 8-digit numeric OTP
const OTP_EXPIRY_MS   = 10 * 60 * 1000;  // 10 minutes
const OTP_MAX_ATTEMPTS = 5;     // max wrong guesses before lockout

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a secure N-digit numeric OTP */
function generateOtp(digits: number = OTP_LENGTH): string {
  const max = Math.pow(10, digits);
  // crypto.randomInt is available in Node 14.10+
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(digits, '0');
}

/** Parse user-agent into a readable device string */
function parseUserAgent(ua: string): string {
  if (!ua) return 'Unknown device';
  if (/mobile/i.test(ua)) return 'Mobile browser';
  if (/chrome/i.test(ua)) return 'Chrome (Desktop)';
  if (/firefox/i.test(ua)) return 'Firefox (Desktop)';
  if (/safari/i.test(ua)) return 'Safari (Desktop)';
  return 'Web browser';
}

// ─── 1. REGISTER ──────────────────────────────────────────────────────────────

/**
 * Register a new user — creates account in UNVERIFIED state,
 * generates OTP, and dispatches verification email.
 *
 * @returns { userId, email } — caller passes these to the OTP step.
 */
export const registerUser = async (userData: Record<string, any>) => {
  const { firstName, lastName, email, password, role: requestedRole } = userData;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (!existingUser.isEmailVerified) {
      // Resend OTP for existing unverified account
      await sendOtp(email);
      return { needsVerification: true, email };
    }
    throw new AppError('User with this email already exists.', 400);
  }

  const hashedPassword = await hashPassword(password);

  const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER, ROLES.USER];
  const role = allowedRoles.includes(requestedRole) ? requestedRole : ROLES.USER;
  const status   = role === ROLES.ADMIN ? 'PENDING_APPROVAL' : 'ACTIVE';
  const isApproved = role !== ROLES.ADMIN;

  // Create user in unverified state
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    requestedRole: role === ROLES.ADMIN ? ROLES.ADMIN : null,
    status,
    accessRequestStatus: role === ROLES.ADMIN ? 'PENDING' : 'NONE',
    accessRequestedAt: role === ROLES.ADMIN ? new Date() : null,
    isApproved,
    isEmailVerified: false,  // Must verify via OTP
  });

  // Send OTP
  await sendOtp(email);

  await logInfo(`New user registered: ${email}`, {
    userId: user._id,
    action: ACTIVITY_ACTIONS.REGISTER_SUCCESS,
    status: 'SUCCESS',
    metadata: { email: user.email, role: user.role }
  });

  const { password: _, ...userWithoutPassword } = user.toObject();
  return { ...userWithoutPassword, needsVerification: true };
};

// ─── 2. SEND OTP ──────────────────────────────────────────────────────────────

/**
 * Generate and email an OTP for an existing (unverified) user.
 * Safe to call multiple times — always replaces the previous OTP.
 */
export const sendOtp = async (email: string) => {
  const user = await User.findOne({ email }).select('+otpCode +otpExpires +otpAttempts');
  if (!user) {
    // Silent return — don't reveal whether email exists
    return;
  }

  if (user.isEmailVerified) {
    throw new AppError('This account is already verified.', 400);
  }

  const otp     = generateOtp();
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);

  // Hash the OTP before storing (like a password — never store plaintext)
  user.otpCode     = crypto.createHash('sha256').update(otp).digest('hex');
  user.otpExpires  = expires;
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  const { subject, html } = getOtpTemplate(user.firstName, otp);
  const result = await sendEmail({ to: email, subject, html });

  if (!result.success) {
    logWarn(`⚠️ OTP email delivery failed for ${email}`, { action: 'OTP_EMAIL_FAILURE', metadata: { email } });
  }

  logInfo(`🔐 OTP sent to ${email}`, { action: 'OTP_SENT', metadata: { email, expires: expires.toISOString() } });
};

// ─── 3. VERIFY OTP ────────────────────────────────────────────────────────────

/**
 * Verify the OTP for an email address.
 * On success → marks isEmailVerified = true.
 * Enforces attempt limit to prevent brute-force.
 */
export const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select('+otpCode +otpExpires +otpAttempts');
  if (!user) {
    throw new AppError('Invalid verification request.', 400);
  }

  if (user.isEmailVerified) {
    throw new AppError('This account is already verified.', 400);
  }

  // Attempt limit guard
  if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw new AppError(
      'Too many incorrect attempts. Please request a new OTP.',
      429,
    );
  }

  // Expiry check
  if (!user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  // Constant-time comparison
  const hashedInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
  const isMatch     = user.otpCode === hashedInput;

  if (!isMatch) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await user.save({ validateBeforeSave: false });
    const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
    throw new AppError(
      `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      400,
    );
  }

  // Mark verified and clear OTP fields
  user.isEmailVerified = true;
  user.otpCode         = undefined;
  user.otpExpires      = undefined;
  user.otpAttempts     = 0;
  await user.save({ validateBeforeSave: false });

  await logInfo(`Email verified: ${email}`, {
    userId: user._id,
    action: ACTIVITY_ACTIONS.OTP_VERIFIED,
    status: 'SUCCESS'
  });

  // Send welcome email (non-blocking)
  const { subject, html } = getWelcomeTemplate(user.firstName);
  sendEmail({ to: user.email, subject, html }).catch(() => {});

  const { password: _p, ...publicUser } = user.toObject();
  return publicUser;
};

// ─── 4. LOGIN ─────────────────────────────────────────────────────────────────

/**
 * Authenticate a user, enforce email verification, issue tokens,
 * and dispatch a login notification email.
 */
export const loginUser = async (
  email: any,
  password: any,
  _organizationId?: any,
  meta?: { ip?: string; userAgent?: string },
) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    logWarn(`Failed login attempt for ${email}`, { 
      action: ACTIVITY_ACTIONS.LOGIN_FAILURE, 
      status: 'FAILURE',
      ip: meta?.ip,
      userAgent: meta?.userAgent
    });
    throw new AppError('Invalid email or password.', 401);
  }

  // ── Email verification gate ──────────────────────────────────────────────
  if (!user.isEmailVerified) {
    throw new AppError(
      'Please verify your email before logging in. Check your inbox for the OTP.',
      403,
    );
  }

  // ── Admin approval gate ──────────────────────────────────────────────────
  if (user.role === ROLES.ADMIN && !user.isApproved) {
    throw new AppError(
      'Your Admin account is pending approval by an administrator.',
      403,
    );
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshTokenValue = generateRefreshToken({ userId: user._id });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    token: refreshTokenValue,
    expiresAt,
  });

  // ── Login notification email (non-blocking) ───────────────────────────────
  try {
    const loginTime = new Date().toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
    const { subject, html } = getLoginNotificationTemplate({
      name:      user.firstName,
      loginTime,
      ipAddress: meta?.ip || 'Unknown',
      userAgent: parseUserAgent(meta?.userAgent || ''),
    });
    sendEmail({ to: user.email, subject, html }).catch(() => {});
  } catch { /* non-fatal */ }

  await logInfo(`User logged in: ${email}`, {
    userId: user._id,
    action: ACTIVITY_ACTIONS.LOGIN_SUCCESS,
    status: 'SUCCESS',
    ip: meta?.ip, 
    userAgent: meta?.userAgent,
    metadata: { device: parseUserAgent(meta?.userAgent || '') }
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id:        user._id,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      role:      user.role,
      status:    user.status,
    },
  };
};

// ─── 5. FORGOT PASSWORD ───────────────────────────────────────────────────────

export const forgotPassword = async (email: any) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent for security

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = (Date.now() + 3600000) as any; // 1 hour

  await user.save({ validateBeforeSave: false });
  return resetToken;
};

// ─── 6. RESET PASSWORD ────────────────────────────────────────────────────────

export const resetPassword = async (token: any, newPassword: any) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken:   hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    throw new AppError('Invalid or expired password reset token.', 400);
  }

  user.password             = await hashPassword(newPassword);
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });
  return user;
};

// ─── 12. REQUEST ORGANIZATION ACCESS ───────────────────────────────────────

export const requestOrganizationAccess = async (
  id: string,
  payload: { requestedRole?: string; note?: string } = {},
) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
    throw new AppError('You already have elevated access.', 400);
  }

  if (user.accessRequestStatus === 'PENDING') {
    throw new AppError('Your access request is already pending review.', 400);
  }

  user.requestedRole = 'ADMIN';
  user.accessRequestStatus = 'PENDING';
  user.accessRequestNote = payload.note?.trim() || undefined;
  user.accessRequestedAt = new Date();
  user.accessReviewedAt = undefined;
  user.status = 'PENDING_APPROVAL';
  user.isApproved = false;

  await user.save({ validateBeforeSave: false });

  return {
    status: user.accessRequestStatus,
    requestedRole: user.requestedRole,
    requestedAt: user.accessRequestedAt,
    reviewedAt: user.accessReviewedAt,
    note: user.accessRequestNote,
  };
};

// ─── 13. GET ORGANIZATION ACCESS STATUS ────────────────────────────────────

export const getOrganizationAccessStatus = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return {
    status: user.accessRequestStatus || 'NONE',
    requestedRole: user.requestedRole || null,
    requestedAt: user.accessRequestedAt || null,
    reviewedAt: user.accessReviewedAt || null,
    note: user.accessRequestNote || null,
    currentRole: user.role,
  };
};

// ─── 7. VERIFY EMAIL (token-based, original flow) ───────────────────────────

export const verifyEmail = async (token: any) => {
  const user = await User.findOne({
    emailVerificationToken:   token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token.', 400);
  }

  user.isEmailVerified          = true;
  user.emailVerificationToken   = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return user;
};

// ─── 8. REFRESH TOKEN ────────────────────────────────────────────────────────

export const refreshAccessToken = async (oldRefreshToken: any) => {
  const storedToken = await RefreshToken.findOne({
    token:     oldRefreshToken,
    isRevoked: false,
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token is invalid or expired.', 401);
  }

  const user = await User.findById(storedToken.userId);
  if (!user) {
    throw new AppError('User associated with this token no longer exists.', 401);
  }

  const membership = await OrganizationMember.findOne({
    userId:   storedToken.userId,
    isActive: true,
  });

  const accessToken = generateAccessToken({
    userId:         storedToken.userId,
    organizationId: membership?.organizationId || null,
    role:           membership?.role || user.role || null,
    platformRole:   user.role, // Explicitly keep platform role
  });

  const newRefreshTokenValue = generateRefreshToken({ userId: storedToken.userId });
  storedToken.isRevoked       = true;
  storedToken.replacedByToken = newRefreshTokenValue;
  await storedToken.save();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId:    storedToken.userId,
    token:     newRefreshTokenValue,
    expiresAt,
  });

  return { accessToken, refreshToken: newRefreshTokenValue };
};

// ─── 9. LOGOUT ────────────────────────────────────────────────────────────────

export const logoutUser = async (refreshToken: any) => {
  await RefreshToken.findOneAndUpdate(
    { token: refreshToken },
    { isRevoked: true },
  );
};

// ─── 10. GET USER BY ID ──────────────────────────────────────────────────────

export const getUserById = async (id: string) => {
  const user = await User.findById(id).lean();
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Fetch all active memberships for this user
  const memberships = await OrganizationMember.find({ userId: id, isActive: true })
    .populate({
      path: 'organizationId',
      select: 'name slug logoUrl'
    })
    .lean();

  const organizations = memberships
    .filter((m: any) => m.organizationId) // Guard against broken references
    .map((m: any) => ({
      id: String(m.organizationId._id),
      name: String(m.organizationId.name),
      slug: m.organizationId.slug ? String(m.organizationId.slug) : undefined,
      role: String(m.role),
      joinedAt: m.createdAt,
    }));
  
  const { password: _, ...publicUser } = user;
  return { 
    ...publicUser, 
    id: String(user._id),
    organizations 
  };
};

// ─── 11. UPDATE PROFILE ─────────────────────────────────────────────────────

export const updateProfile = async (id: string, updateData: { firstName?: string; lastName?: string; bio?: string }) => {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const { password: _, ...publicUser } = user.toObject({ virtuals: true });
  return publicUser;
};

