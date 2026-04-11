import Activity from '../models/Activity.js';

/**
 * Standard System Logger
 */
export const logger = {
  info: (message: string | undefined) => console.log(`[INFO] ${message}`),
  warn: (message: string | undefined) => console.warn(`[WARN] ${message}`),
  error: (message: string | undefined) => console.error(`[ERROR] ${message}`),
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
}: {
  userId: unknown;
  action: unknown;
  entityId: unknown;
  entityType: unknown;
  metadata?: Record<string, unknown>;
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
  } catch (error: unknown) {
    const activityError = error as Error;
    logger.error(`Failed to log activity: ${activityError.message}`);
    // Don't throw error to avoid breaking main production flow
    return null;
  }
};
