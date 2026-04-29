import os from 'os';
import { env } from '../config/env.js';
import packageJson from '../../package.json' assert { type: 'json' };

// Cache for deduplication: key -> { count, lastSent }
const errorCache = new Map<string, { count: number; lastSent: number }>();
const DEDUPLICATION_WINDOW_MS = 60000; // 1 minute

export interface ErrorAlertContext {
  error: Error | any;
  req?: any;
  statusCode?: number;
}

/**
 * Service to handle production error alerting via Telegram.
 */
export class ErrorAlertService {
  /**
   * Masks sensitive fields in a request payload to prevent leaking secrets.
   */
  private static sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    
    const sanitized = JSON.parse(JSON.stringify(payload));
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'cvv', 'card', 'cookie', 'session'];

    const mask = (obj: any) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '********';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          mask(obj[key]);
        }
      }
    };

    mask(sanitized);
    return sanitized;
  }

  /**
   * Escapes special characters for Telegram MarkdownV2.
   */
  private static escapeMarkdownV2(text: string): string {
    if (!text) return '';
    // Characters to escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  /**
   * Sends the formatted message to the configured Telegram channel.
   * Implements retry logic (up to 3 times).
   */
  private static async send(message: string, retryCount = 0): Promise<void> {
    const { telegramBotToken, telegramChatId, isProduction, enableTelegramAlerts } = env;

    // Send only in Production or if explicitly enabled via ENV toggle
    if (!isProduction && !enableTelegramAlerts) return;
    if (!telegramBotToken || !telegramChatId) {
      if (isProduction) {
        console.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing. Error alerts disabled.');
      }
      return;
    }

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'MarkdownV2',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error: any) {
      if (retryCount < 3) {
        const backoff = Math.pow(2, retryCount) * 1000;
        console.warn(`Telegram alert failed. Retrying in ${backoff}ms... (${retryCount + 1}/3)`);
        setTimeout(() => this.send(message, retryCount + 1), backoff);
      } else {
        console.error('CRITICAL: Telegram alerting failed after maximum retries.', error.message);
      }
    }
  }

  /**
   * Main entry point for notifying errors.
   */
  public static async notifyError(context: ErrorAlertContext) {
    try {
      const { error, req, statusCode = 500 } = context;
      const errorMessage = error.message || 'Unknown Internal Server Error';
      const stackTrace = error.stack || 'No stack trace provided';
      const endpoint = req?.originalUrl || 'N/A';
      const method = req?.method || 'N/A';
      
      // 1. Deduplication Logic
      const cacheKey = `${method}-${endpoint}-${errorMessage}`;
      const now = Date.now();
      const cached = errorCache.get(cacheKey);

      if (cached && (now - cached.lastSent) < DEDUPLICATION_WINDOW_MS) {
        cached.count++;
        return; // Skip sending, just increment count for next window
      }

      const repeatCount = cached ? cached.count + 1 : 1;
      errorCache.set(cacheKey, { count: 0, lastSent: now });

      // 2. Prepare Context Data
      const timestamp = new Date().toISOString();
      const environment = env.nodeEnv.toUpperCase();
      const appName = env.appName;
      const appVersion = packageJson.version || '1.0.0';
      const serverName = os.hostname();

      // 3. Construct Message
      let message = `🚨 *${this.escapeMarkdownV2(appName)} Error Alert* 🚨\n\n`;
      message += `*Environment:* ${this.escapeMarkdownV2(environment)}\n`;
      message += `*Status:* ${statusCode}\n`;
      message += `*Error:* \`${this.escapeMarkdownV2(errorMessage)}\`\n`;

      if (repeatCount > 1) {
        message += `*Repeated:* ${repeatCount} times in the last minute\n`;
      }

      if (req) {
        const userId = req.user?.id || 'Guest';
        const userEmail = req.user?.email || 'N/A';
        const device = req.headers['user-agent'] || 'Unknown';

        message += `\n*Request Context:*\n`;
        message += `*Method:* ${method}\n`;
        message += `*URL:* ${this.escapeMarkdownV2(endpoint)}\n`;
        message += `*User:* ${this.escapeMarkdownV2(userEmail)} (${this.escapeMarkdownV2(userId)})\n`;
        message += `*Platform:* ${this.escapeMarkdownV2(device)}\n`;

        if (req.body && Object.keys(req.body).length > 0) {
          const sanitizedBody = this.sanitizePayload(req.body);
          const bodyStr = JSON.stringify(sanitizedBody, null, 2);
          message += `\n*Payload:*\n\`\`\`json\n${this.escapeMarkdownV2(bodyStr)}\n\`\`\`\n`;
        }
      }

      message += `\n*Instance Details:*\n`;
      message += `*Version:* ${this.escapeMarkdownV2(appVersion)}\n`;
      message += `*Server:* ${this.escapeMarkdownV2(serverName)}\n`;
      message += `*Timestamp:* ${this.escapeMarkdownV2(timestamp)}\n`;

      message += `\n*Stack Trace:*\n\`\`\`text\n${this.escapeMarkdownV2(stackTrace.substring(0, 1500))}${stackTrace.length > 1500 ? '...' : ''}\n\`\`\``;

      // 4. Send Message (Non-blocking)
      this.send(message).catch(err => console.error('Telegram background send failed:', err));

    } catch (criticalErr) {
      // Ensure alerting service never crashes the main application
      console.error('FATAL: Error in Telegram Alerting Service:', criticalErr);
    }
  }
}
