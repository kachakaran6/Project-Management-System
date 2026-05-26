import { deleteStaleDrafts } from '../modules/task/task.service.js';
import { logger } from '../utils/logger.js';

let intervalHandle: NodeJS.Timeout | null = null;

export const startDraftCleanupJob = () => {
  if (intervalHandle) return;

  const run = async () => {
    try {
      const deletedCount = await deleteStaleDrafts();
      if (deletedCount > 0) {
        logger.info(`Draft cleanup job removed ${deletedCount} stale drafts.`);
      }
    } catch (error) {
      logger.warn(`Draft cleanup job failed: ${(error as Error).message}`);
    }
  };

  void run();
  intervalHandle = setInterval(() => {
    void run();
  }, 24 * 60 * 60 * 1000); // Run once every 24 hours
};

export const stopDraftCleanupJob = () => {
  if (!intervalHandle) return;

  clearInterval(intervalHandle);
  intervalHandle = null;
};
