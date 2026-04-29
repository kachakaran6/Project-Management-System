import os from 'os';
import { env } from '../../config/env.js';
import packageJson from '../../../package.json' with { type: 'json' };
import { ErrorSeverity, ErrorClassifier } from './errorClassifier.js';

// Stateful stores for aggregation and deduplication
const errorCounts = new Map<string, { count: number; firstSeen: number }>();
const lastSentAlerts = new Map<string, number>();

const DEDUPLICATION_WINDOW_MS = 60000; // 1 minute
const CLEANUP_INTERVAL_MS = 3600000; // 1 hour

export interface ErrorAlertContext {
  error: Error | any;
  req?: any;
  statusCode?: number;
}

/**
 * Production-grade Smart Error Alerting Service
 */
export class ErrorAlertService {
  /**
   * Sanitizes request payload to mask secrets
   */
  private static sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    try {
      const sanitized = JSON.parse(JSON.stringify(payload));
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'cvv', 'card', 'cookie'];
      
      const mask = (obj: any) => {
        for (const key in obj) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            obj[key] = '********';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            mask(obj[key]);
          }
        }
      };
      mask(sanitized);
      return sanitized;
    } catch {
      return '[Unparseable Payload]';
    }
  }

  private static escapeHTML(text: string): string {
    if (!text) return '';
    return text.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m] || m));
  }

  /**
   * Core send logic with retry and environment gating
   */
  private static async sendToTelegram(message: string, retryCount = 0): Promise<void> {
    const { telegramBotToken, telegramChatId, isProduction, enableTelegramAlerts } = env;

    if (!isProduction && !enableTelegramAlerts) return;
    if (!telegramBotToken || !telegramChatId) return;

    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API Error: ${response.statusText}`);
      }
    } catch (error: any) {
      if (retryCount < 2) {
        const backoff = Math.pow(2, retryCount) * 1000;
        setTimeout(() => this.sendToTelegram(message, retryCount + 1), backoff);
      }
    }
  }

  /**
   * Primary entry point for intelligent alerting
   */
  public static async notifyError(context: ErrorAlertContext) {
    try {
      const { error, req, statusCode = 500 } = context;
      const severity = ErrorClassifier.classify(error, statusCode);
      
      // Ignore Low/Medium severity for Telegram
      if (severity === ErrorSeverity.LOW || severity === ErrorSeverity.MEDIUM) return;

      const errorMessage = error.message || 'Internal Error';
      const endpoint = req?.originalUrl || 'N/A';
      const method = req?.method || 'N/A';
      const cacheKey = `${severity}-${method}-${endpoint}-${errorMessage}`;
      
      const now = Date.now();
      
      // 1. Threshold & Aggregation Logic
      const stats = errorCounts.get(cacheKey) || { count: 0, firstSeen: now };
      stats.count++;
      
      // Reset window if it's too old
      if (now - stats.firstSeen > env.highSeverityWindowMs) {
        stats.count = 1;
        stats.firstSeen = now;
      }
      errorCounts.set(cacheKey, stats);

      // 2. Alert Gating (Deduplication + Severity Rules)
      const lastSent = lastSentAlerts.get(cacheKey) || 0;
      const shouldNotify = ErrorClassifier.shouldNotify(severity, stats.count, env.highSeverityThreshold);

      if (!shouldNotify || (now - lastSent < DEDUPLICATION_WINDOW_MS)) {
        return;
      }

      lastSentAlerts.set(cacheKey, now);

      // 3. Format & Send
      const message = this.formatMessage(context, severity, stats.count);
      this.sendToTelegram(message).catch(err => console.error('SmartAlert Background Fail:', err));

    } catch (err) {
      console.error('CRITICAL: Smart Error System Failure:', err);
    }
  }

  private static formatMessage(context: ErrorAlertContext, severity: ErrorSeverity, count: number): string {
    const { error, req, statusCode = 500 } = context;
    const timestamp = new Date().toISOString();
    const appVersion = packageJson.version || '1.0.0';
    const severityEmoji = severity === ErrorSeverity.CRITICAL ? '🚨' : '⚠️';
    
    let msg = `<b>${severityEmoji} ${severity} ERROR ALERT</b>\n`;
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `<b>Project:</b> ${this.escapeHTML(env.appName)}\n`;
    msg += `<b>Environment:</b> ${this.escapeHTML(env.nodeEnv.toUpperCase())}\n`;
    msg += `<b>Error Type:</b> ${this.escapeHTML(error.name || 'Error')}\n`;
    msg += `<b>Message:</b> <code>${this.escapeHTML(error.message)}</code>\n`;
    
    if (count > 1) {
      msg += `<b>Occurrences:</b> ${count} times in the last window\n`;
    }

    if (req) {
      const user = req.user ? `${req.user.email} (${req.user.id})` : 'Anonymous';
      msg += `\n<b>Request Details:</b>\n`;
      msg += `<b>Endpoint:</b> [${req.method}] ${this.escapeHTML(req.originalUrl)}\n`;
      msg += `<b>Status:</b> ${statusCode}\n`;
      msg += `<b>User:</b> ${this.escapeHTML(user)}\n`;
      msg += `<b>Platform:</b> ${this.escapeHTML(req.headers['user-agent'] || 'Unknown')}\n`;

      if (req.body && Object.keys(req.body).length > 0) {
        const body = JSON.stringify(this.sanitizePayload(req.body), null, 2);
        msg += `\n<b>Payload:</b>\n<pre>${this.escapeHTML(body)}</pre>\n`;
      }
    }

    msg += `\n<b>Technical Context:</b>\n`;
    msg += `<b>Version:</b> ${this.escapeHTML(appVersion)}\n`;
    msg += `<b>Instance:</b> ${this.escapeHTML(os.hostname())}\n`;
    msg += `<b>Timestamp:</b> ${this.escapeHTML(timestamp)}\n`;

    const stack = error.stack || 'No stack trace';
    msg += `\n<b>Stack Trace:</b>\n<pre><code class="language-text">${this.escapeHTML(stack.substring(0, 1500))}</code></pre>`;

    return msg;
  }
}

// Periodic cleanup of stale cache
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of errorCounts.entries()) {
    if (now - val.firstSeen > CLEANUP_INTERVAL_MS) errorCounts.delete(key);
  }
  for (const [key, val] of lastSentAlerts.entries()) {
    if (now - val > CLEANUP_INTERVAL_MS) lastSentAlerts.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
