import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Configure Transporter
 * In a real production system, you'd use SendGrid, AWS SES or Mailgun transport.
 * This setup defaults to development-friendly Ethereal/SMTP.
 */
const transporter = nodemailer.createTransport({
  host: env.smtpHost || 'smtp.ethereal.email',
  port: env.smtpPort || 587,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
});

/**
 * Send a generic transactional email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Antigravity PMS" <${env.emailFrom || 'noreply@antigravity.io'}>`,
      to,
      subject,
      html
    });

    logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`❌ Error sending email to ${to}: ${error.message}`);
    // Non-blocking error handling generally preferred for emails
    // But in critical flows, you might want to rethrow
    return { success: false, error: error.message };
  }
};
