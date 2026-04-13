import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Configure Transporter
 * In a real production system, you'd use SendGrid, AWS SES or Mailgun transport.
 * This setup defaults to development-friendly Ethereal/SMTP.
 */
const transportOptions: SMTPTransport.Options & { family?: number } = {
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465, // true for 465, false for 587 or other ports
  family: env.smtpFamily,
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
};

const transporter = nodemailer.createTransport(transportOptions);

/**
 * Send a generic transactional email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  try {
    const from = env.emailFrom || env.smtpUser || 'noreply@antigravity.io';

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
    // Non-blocking error handling generally preferred for emails
    // But in critical flows, you might want to rethrow
    return { success: false, error: emailError.message };
  }
};
