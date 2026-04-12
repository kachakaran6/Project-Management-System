import { expireStaleInvites } from '../modules/invite/invite.service.js';
import { logger } from '../utils/logger.js';

let intervalHandle: NodeJS.Timeout | null = null;

export const startInviteExpiryJob = () => {
  if (intervalHandle) return;

  const run = async () => {
    try {
      await expireStaleInvites();
    } catch (error) {
      logger.warn(`Invite expiry job failed: ${(error as Error).message}`);
    }
  };

  void run();
  intervalHandle = setInterval(() => {
    void run();
  }, 15 * 60 * 1000);
};

export const stopInviteExpiryJob = () => {
  if (!intervalHandle) return;

  clearInterval(intervalHandle);
  intervalHandle = null;
};