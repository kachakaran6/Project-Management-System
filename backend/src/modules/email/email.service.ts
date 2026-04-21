import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

/**
 * Configure Nodemailer Transporter
 */
const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465, // Use SSL/TLS for port 465
  auth: (env.smtpUser && env.smtpPass) ? {
    user: env.smtpUser,
    pass: env.smtpPass,
  } : undefined,
  debug: env.smtpDebug,
  connectionTimeout: env.smtpConnectionTimeoutMs,
  greetingTimeout: env.smtpGreetingTimeoutMs,
  socketTimeout: env.smtpSocketTimeoutMs,
});

const normalizeFromAddress = (value?: string) => {
  const fallback = 'PMS Orbit <noreply@pms-orbit.io>';

  if (!value) {
    return fallback;
  }

  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  const angleMatch = trimmed.match(/^(.+?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>$/);

  if (angleMatch) {
    return `${angleMatch[1].trim()} <${angleMatch[2].trim()}>`;
  }

  if (/^[^<>\s]+@[^<>\s]+$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
};

/**
 * Send a generic transactional email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const from = normalizeFromAddress(env.emailFrom);

  // 1. Try Resend if configured
  if (resend) {
    try {
      const result = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      logger.info(`📧 Email sent via Resend to ${to}: ${result.data?.id ?? 'accepted'}`);
      return { success: true, messageId: result.data?.id ?? 'accepted' };
    } catch (error: unknown) {
      const emailError = error as Error;
      logger.error(`❌ Resend failed: ${emailError.message}. Falling back to SMTP...`);
    }
  }

  // 2. Fallback to SMTP
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    logger.info(`📧 Email sent via SMTP to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const emailError = error as Error;
    logger.error(`❌ SMTP failed: ${emailError.message}`);
    return { success: false, error: emailError.message || 'Unknown email delivery error' };
  }
};
