/**
 * Transactional Email Templates
 */

export const getInviteTemplate = (orgName: string, inviteUrl: string) => ({
  subject: `You've been invited to join ${orgName} on PMS Orbit`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2>Hello!</h2>
      <p>You have been invited to join the <strong>${orgName}</strong> organization on PMS Orbit.</p>
      <p>Click the button below to accept your invitation and get started:</p>
      <a href="${inviteUrl}" style="background: #0D6EFD; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
      <p>If the button doesn't work, you can copy and paste this link:</p>
      <p>${inviteUrl}</p>
      <hr />
      <p>If you weren't expecting this invite, you can safely ignore this email.</p>
    </div>
  `
});

export const getWelcomeTemplate = (userName: string) => ({
  subject: 'Welcome to PMS Orbit!',
  html: `
    <div style="font-family: sans-serif;">
      <h2>Welcome aboard, ${userName}!</h2>
      <p>We're excited to have you with us. Explore your workspaces and start collaborating today.</p>
    </div>
  `
});

// ─── OTP Verification Email ────────────────────────────────────────────────────

export const getOtpTemplate = (name: string, otp: string) => ({
  subject: 'Verify your PMS Orbit account — OTP inside',
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0D6EFD 0%, #0958D9 100%); padding: 32px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">PMS Orbit</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">Project Management System</p>
      </div>

      <!-- Body -->
      <div style="padding: 40px 40px 32px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">Verify your email</h2>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Hi <strong style="color: #111827;">${name}</strong>, use the code below to complete your registration. It expires in <strong>10 minutes</strong>.
        </p>

        <!-- OTP Box -->
        <div style="background: #f3f4f6; border-radius: 12px; padding: 28px 20px; text-align: center; margin-bottom: 28px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your verification code</p>
          <div style="letter-spacing: 10px; font-size: 40px; font-weight: 800; color: #0D6EFD; font-family: 'Courier New', monospace; padding: 4px 0;">
            ${otp}
          </div>
        </div>

        <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6;">
          This code is <strong>single-use</strong> and valid for <strong>10 minutes</strong>.<br/>
          If you didn't request this, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding: 20px 40px; text-align: center;">
        <p style="margin: 0; color: #d1d5db; font-size: 12px;">PMS Orbit — Secure &amp; Reliable Project Management</p>
      </div>
    </div>
  `
});

// ─── Login Notification Email ──────────────────────────────────────────────────

export const getLoginNotificationTemplate = (data: {
  name: string;
  loginTime: string;
  ipAddress: string;
  userAgent: string;
}) => ({
  subject: '🔐 New login to your PMS Orbit account',
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 28px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">PMS Orbit</h1>
        <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px;">Security Notification</p>
      </div>

      <!-- Body -->
      <div style="padding: 36px 40px 28px;">
        <div style="display: inline-block; background: #fef9c3; border-radius: 8px; padding: 6px 14px; margin-bottom: 20px;">
          <span style="color: #854d0e; font-size: 13px; font-weight: 600;">🔔 Login Alert</span>
        </div>

        <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">New sign-in detected</h2>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Hi <strong style="color: #111827;">${data.name}</strong>, we noticed a new login to your account.
        </p>

        <!-- Details table -->
        <div style="background: #f9fafb; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 13px; width: 120px;">Time</td>
              <td style="padding: 8px 0; color: #111827; font-size: 13px; font-weight: 600;">${data.loginTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb;">IP Address</td>
              <td style="padding: 8px 0; color: #111827; font-size: 13px; font-weight: 600; border-top: 1px solid #e5e7eb;">${data.ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb;">Device</td>
              <td style="padding: 8px 0; color: #111827; font-size: 13px; font-weight: 600; border-top: 1px solid #e5e7eb;">${data.userAgent}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">
          If this was you, no action is needed. If you don't recognise this activity, please
          <strong style="color: #dc2626;">change your password immediately</strong> and contact support.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding: 18px 40px; text-align: center;">
        <p style="margin: 0; color: #d1d5db; font-size: 12px;">This is an automated security notification. Do not reply.</p>
      </div>
    </div>
  `
});
