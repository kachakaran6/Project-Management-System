import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

const normalizeFromAddress = (value?: string) => {
  const fallback = 'PMS Orbit <onboarding@resend.dev>';

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
  try {
    if (!resend) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const from = normalizeFromAddress(env.emailFrom);

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
    logger.error(`❌ Error sending email to ${to}: ${emailError.message}`);

    // Non-blocking error handling generally preferred for emails
    // But in critical flows, you might want to rethrow
    return { success: false, error: emailError.message };
  }
};
