import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import dns from 'dns';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

dns.setDefaultResultOrder('ipv4first');

dns.lookup(env.smtpHost || 'smtp.ethereal.email', (err, address, family) => {
  if (err) {
    logger.warn(`SMTP DNS lookup failed: ${err.message}`);
    return;
  }

  logger.info(`SMTP host resolved: ${address} (IPv${family})`);
});

/**
 * Configure Transporter
 * In a real production system, you'd use SendGrid, AWS SES or Mailgun transport.
 * This setup defaults to development-friendly Ethereal/SMTP.
 */
const transportOptions: SMTPTransport.Options & { family?: number } = {
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465, // true for 465, false for 587 or other ports
  family: env.smtpFamily || 4,
  connectionTimeout: env.smtpConnectionTimeoutMs,
  greetingTimeout: env.smtpGreetingTimeoutMs,
  socketTimeout: env.smtpSocketTimeoutMs,
  debug: env.smtpDebug,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
};

const transporter = nodemailer.createTransport(transportOptions);

const sendWithSendGrid = async ({
  to,
  from,
  subject,
  html,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
}) => {
  if (!env.sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${payload}`);
  }

  return { messageId: response.headers.get('x-message-id') || 'sendgrid-accepted' };
};

/**
 * Send a generic transactional email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  try {
    const from = env.emailFrom || env.smtpUser || 'noreply@antigravity.io';

    if (env.emailProvider === 'sendgrid') {
      const apiResult = await sendWithSendGrid({ to, from, subject, html });
      logger.info(`📧 Email sent via SendGrid to ${to}: ${apiResult.messageId}`);
      return { success: true, messageId: apiResult.messageId };
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html
    });

    logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const emailError = error as Error;
    logger.error(`❌ Error sending email to ${to}: ${emailError.message}`);

    if (env.emailProvider === 'smtp' && env.sendgridApiKey) {
      try {
        const from = env.emailFrom || env.smtpUser || 'noreply@antigravity.io';
        const fallbackResult = await sendWithSendGrid({ to, from, subject, html });
        logger.warn(`SMTP failed; fallback email sent via SendGrid to ${to}: ${fallbackResult.messageId}`);
        return { success: true, messageId: fallbackResult.messageId };
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        logger.error(`❌ SendGrid fallback failed for ${to}: ${fallbackMessage}`);
      }
    }

    // Non-blocking error handling generally preferred for emails
    // But in critical flows, you might want to rethrow
    return { success: false, error: emailError.message };
  }
};
