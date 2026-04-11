import Activity from '../models/Activity.js';

/**
 * Standard System Logger
 */
export const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
};

/**
 * Log a user action to the activity system
 */
export const logActivity = async ({
  userId,
  action,
  entityId,
  entityType,
  metadata = {}
}) => {
  try {
    const activity = await Activity.create({
      actorId: userId,
      action,
      entityId,
      entityType,
      metadata
    });
    return activity;
  } catch (error) {
    logger.error(`Failed to log activity: ${error.message}`);
    // Don't throw error to avoid breaking main production flow
    return null;
  }
};
