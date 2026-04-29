# Telegram Error Alerting System

A production-ready Telegram alerting system that notifies developers of critical issues in real-time.

## Features
- **Trigger**: Automatically sends alerts for `500 Internal Server Error` and significant failures (`403 Forbidden`, `429 Too Many Requests`).
- **Deduplication**: Silences identical errors occurring within a 1-minute window to avoid spam.
- **Grouping**: Tracks repeat occurrences and includes the count in the next alert.
- **Security**: Automatically masks sensitive fields (passwords, tokens, keys) in request payloads.
- **Reliability**: Sends messages asynchronously using native `fetch` (non-blocking). Retries up to 3 times on failure with exponential backoff.
- **Formatting**: Rich MarkdownV2 formatting with code blocks for stack traces and JSON payloads.

## Environment Configuration

Add the following variables to your `.env` file:

```env
# --- Telegram Alerting ---
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=-100xxxxxxxxxx # Private channel/group ID
ENABLE_TELEGRAM_ALERTS=true     # Set to 'true' to enable in Dev/Staging. Defaults to true in Production if keys are present.
APP_NAME="Project Management System"
```

### How to get Bot Token & Chat ID:
1. Message [@BotFather](https://t.me/botfather) on Telegram and create a new bot.
2. Create a private Telegram Group or Channel for developer alerts.
3. Add your bot to that group/channel.
4. Get your Chat ID by forwarding a message from the group to [@GetIDsBot](https://t.me/getidsbot) or using the API: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`.

## Technical Details

### Service Module
The logic resides in `src/services/telegram.service.ts`. It is designed to be completely independent and reusable.

### Global Error Handler Integration
Integrated into `src/middlewares/errorHandler.ts`. It captures both synchronous and asynchronous errors that bubble up to the Express error handler.

### Example Usage (Manual Trigger)
If you need to manually trigger an alert from a service or controller:

```typescript
import { TelegramService } from '../services/telegram.service.js';

try {
  // ... risky logic
} catch (error) {
  // Manual notification (useful for background jobs)
  await TelegramService.notifyError({ error });
  throw error; // Re-throw if you want the global handler to also process it
}
```

### Example Usage (Via Controller)
Throwing an `AppError` or any standard `Error` in an Express route will automatically trigger the alert if it's a 500:

```typescript
export const testError = async (req: Request, res: Response) => {
  throw new Error("Critical Failure: Database connection lost!"); 
  // This will hit the global error handler and send a Telegram alert.
};
```
