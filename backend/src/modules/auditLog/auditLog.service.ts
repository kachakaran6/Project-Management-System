import Log from '../../models/Log.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface AuditLogEntry {
  organizationId: string;
  performedBy: string;
  action: 'MEMBER_ROLE_CHANGED' | 'MEMBER_PERMISSIONS_CHANGED' | 'MEMBER_INVITED' | 'MEMBER_REMOVED' | 'MEMBER_REACTIVATED' | 'ROLE_PERMISSION_PRESET_CHANGED';
  targetMember?: string;
  changes?: {
    before?: { role?: string; permissions?: string[] };
    after?: { role?: string; permissions?: string[] };
  };
  reason?: string;
  metadata?: any;
}

/**
 * Log a role or permission change
 */
export const logAuditEvent = async (entry: AuditLogEntry) => {
  try {
    const auditLog = new Log({
      module: 'ORGANIZATION',
      level: 'info',
      organizationId: entry.organizationId,
      userId: entry.performedBy as any, // Direct ID mapping for system tracking
      action: entry.action,
      targetMember: entry.targetMember || null,
      changes: entry.changes || {},
      message: `Audit Event: ${entry.action} performed in org ${entry.organizationId}`,
      metadata: {
        reason: entry.reason,
        ...entry.metadata
      },
      createdAt: new Date(),
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('[AuditLog] Failed to log event:', error);
  }
};

/**
 * Get audit logs for an organization
 */
export const getOrganizationAuditLogs = async (
  organizationId: string,
  options: {
    action?: string;
    targetMember?: string;
    limit?: number;
    skip?: number;
  } = {}
) => {
  const query: any = { organizationId };

  if (options.action) {
    query.action = options.action;
  }

  if (options.targetMember) {
    query.targetMember = options.targetMember;
  }

  const limit = options.limit || 50;
  const skip = options.skip || 0;

  const [logs, total] = await Promise.all([
    Log.find(query)
      .populate('performedBy', 'firstName lastName email')
      .populate('targetMember', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    Log.countDocuments(query),
  ]);

  return { logs, total, limit, skip };
};

/**
 * Get audit logs for a specific member
 */
export const getMemberAuditLogs = async (
  organizationId: string,
  memberId: string,
  limit: number = 50
) => {
  return Log.find({
    organizationId,
    targetMember: memberId,
  })
    .populate('performedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Delete audit logs older than specified days (for data retention policies)
 */
export const deleteOldAuditLogs = async (organizationId: string, daysOld: number = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Log.deleteMany({
    organizationId,
    createdAt: { $lt: cutoffDate },
  });

  return result;
};
