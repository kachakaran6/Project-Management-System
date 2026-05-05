import mongoose from 'mongoose';

import ActivityLog from '../models/ActivityLog.js';
import Log from '../models/Log.js';
import User from '../models/User.js';
import OrganizationMember from '../models/OrganizationMember.js';
import { AppError } from '../middlewares/errorHandler.js';

export type CreateActivityLogInput = {
  userId: string;
  organizationId: string;
  action: string;
  entityType: 'TASK' | 'PROJECT' | 'PAGE' | 'USER' | 'TEAM' | 'WORKSPACE' | 'ORGANIZATION' | 'COMMENT' | 'SYSTEM';
  entityId: string;
  entityName: string;
  metadata?: Record<string, any>;
  targetUserId?: string;
  ipAddress?: string;
  userAgent?: string;
};

type ListActivityLogsInput = {
  organizationId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  query?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

const toObjectId = (value: any, label: string) => {
  const trimmed = String(value || '').trim();
  if (!mongoose.Types.ObjectId.isValid(trimmed)) {
    throw new AppError(`Invalid ${label}.`, 400);
  }
  return new mongoose.Types.ObjectId(trimmed);
};

const toTitle = (value: string) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const legacyActionAliases: Record<string, string[]> = {
  PROJECT_CREATED: ['CREATE_PROJECT'],
  PROJECT_UPDATED: ['UPDATE_PROJECT'],
  PROJECT_DELETED: ['DELETE_PROJECT'],
  PAGE_CREATED: ['CREATE_PAGE'],
  PAGE_UPDATED: ['UPDATE_PAGE'],
  PAGE_DELETED: ['DELETE_PAGE'],
  TASK_CREATED: ['CREATE_TASK', 'CREATE'],
  TASK_UPDATED: ['UPDATE_TASK', 'UPDATE'],
  TASK_DELETED: ['DELETE_TASK', 'DELETE'],
  TASK_STATUS_UPDATED: ['STATUS_CHANGE'],
  TASK_ASSIGNED: ['ASSIGN'],
  COMMENT_CREATED: ['COMMENT', 'COMMENT_CREATED'],
  MEMBER_ROLE_CHANGED: ['MEMBER_ROLE_CHANGED'],
  MEMBER_PERMISSIONS_CHANGED: ['MEMBER_PERMISSIONS_CHANGED'],
  MEMBER_INVITED: ['MEMBER_INVITED'],
  MEMBER_REMOVED: ['MEMBER_REMOVED'],
  MEMBER_REACTIVATED: ['MEMBER_REACTIVATED'],
  ROLE_PERMISSION_PRESET_CHANGED: ['ROLE_PERMISSION_PRESET_CHANGED'],
  USER_ADDED: ['USER_ADDED'],
  USER_REMOVED: ['USER_REMOVED'],
  USER_APPROVED: ['USER_APPROVED'],
  LOGIN_SUCCESS: ['LOGIN_SUCCESS'],
  LOGIN_FAILURE: ['LOGIN_FAILURE'],
  REGISTER_SUCCESS: ['REGISTER_SUCCESS'],
  OTP_VERIFIED: ['OTP_VERIFIED'],
};

const buildLegacyEntityTypeMatch = (entityType?: string) => {
  const value = String(entityType || '').toUpperCase();
  if (!value) return undefined;

  if (value === 'PROJECT' || value === 'TASK' || value === 'PAGE' || value === 'COMMENT' || value === 'WORKSPACE' || value === 'SYSTEM') {
    return {
      $or: [
        { module: value },
        { action: { $regex: value, $options: 'i' } },
      ],
    };
  }

  if (value === 'USER') {
    return {
      $or: [
        { module: 'ORGANIZATION' },
        { action: { $regex: 'MEMBER|ROLE|INVITE|USER', $options: 'i' } },
      ],
    };
  }

  if (value === 'ORGANIZATION') {
    return {
      $or: [
        { module: 'ORGANIZATION' },
        { action: { $regex: 'ORGANIZATION', $options: 'i' } },
      ],
    };
  }

  return undefined;
};

const buildLegacyActionMatch = (action?: string) => {
  const value = String(action || '').toUpperCase();
  if (!value) return undefined;

  const aliases = legacyActionAliases[value] || [value];
  return {
    $or: [
      { action: { $in: aliases } },
      { message: { $regex: value.replace(/_/g, ' '), $options: 'i' } },
    ],
  };
};

const buildLegacyQueryMatch = (query: string) => ({
  $or: [
    { message: { $regex: query, $options: 'i' } },
    { action: { $regex: query, $options: 'i' } },
    { module: { $regex: query, $options: 'i' } },
    { 'performedBy.name': { $regex: query, $options: 'i' } },
    { 'performedBy.email': { $regex: query, $options: 'i' } },
    { 'target.name': { $regex: query, $options: 'i' } },
  ],
});

const buildActivityQueryMatch = (query: string) => ({
  $or: [
    { action: { $regex: query, $options: 'i' } },
    { entityName: { $regex: query, $options: 'i' } },
    { 'metadata.fieldChanged': { $regex: query, $options: 'i' } },
    { 'metadata.oldValue': { $regex: query, $options: 'i' } },
    { 'metadata.newValue': { $regex: query, $options: 'i' } },
    { 'metadata.projectName': { $regex: query, $options: 'i' } },
  ],
});

const normalizeLegacyAction = (action: string, module?: string) => {
  const normalizedAction = String(action || '').toUpperCase();
  const normalizedModule = String(module || '').toUpperCase();

  if (normalizedAction === 'CREATE_PROJECT' || (normalizedAction === 'CREATE' && normalizedModule === 'PROJECT')) return 'PROJECT_CREATED';
  if (normalizedAction === 'UPDATE_PROJECT' || (normalizedAction === 'UPDATE' && normalizedModule === 'PROJECT')) return 'PROJECT_UPDATED';
  if (normalizedAction === 'DELETE_PROJECT' || (normalizedAction === 'DELETE' && normalizedModule === 'PROJECT')) return 'PROJECT_DELETED';

  if (normalizedAction === 'CREATE_PAGE' || (normalizedAction === 'CREATE' && normalizedModule === 'PAGE')) return 'PAGE_CREATED';
  if (normalizedAction === 'UPDATE_PAGE' || (normalizedAction === 'UPDATE' && normalizedModule === 'PAGE')) return 'PAGE_UPDATED';
  if (normalizedAction === 'DELETE_PAGE' || (normalizedAction === 'DELETE' && normalizedModule === 'PAGE')) return 'PAGE_DELETED';

  if (normalizedAction === 'CREATE_TASK' || (normalizedAction === 'CREATE' && normalizedModule === 'TASK')) return 'TASK_CREATED';
  if (normalizedAction === 'UPDATE_TASK' || (normalizedAction === 'UPDATE' && normalizedModule === 'TASK')) return 'TASK_UPDATED';
  if (normalizedAction === 'DELETE_TASK' || (normalizedAction === 'DELETE' && normalizedModule === 'TASK')) return 'TASK_DELETED';
  if (normalizedAction === 'STATUS_CHANGE' && normalizedModule === 'TASK') return 'TASK_STATUS_UPDATED';
  if (normalizedAction === 'ASSIGN' && normalizedModule === 'TASK') return 'TASK_ASSIGNED';

  if (normalizedAction === 'COMMENT') return 'COMMENT_CREATED';

  return normalizedAction;
};

const normalizeLegacyEntityType = (action: string, module?: string, targetType?: string) => {
  const normalizedAction = String(action || '').toUpperCase();
  const normalizedModule = String(module || '').toUpperCase();
  const normalizedTargetType = String(targetType || '').toUpperCase();

  if (normalizedModule === 'PROJECT' || normalizedAction.includes('PROJECT')) return 'PROJECT';
  if (normalizedModule === 'TASK' || normalizedAction.includes('TASK')) return 'TASK';
  if (normalizedModule === 'PAGE' || normalizedAction.includes('PAGE')) return 'PAGE';
  if (normalizedModule === 'COMMENT' || normalizedAction.includes('COMMENT')) return 'COMMENT';
  if (normalizedModule === 'WORKSPACE') return 'WORKSPACE';
  if (normalizedModule === 'ORGANIZATION' || normalizedAction.includes('MEMBER') || normalizedAction.includes('ROLE') || normalizedAction.includes('INVITE') || normalizedTargetType === 'USER') return 'USER';
  if (normalizedAction.startsWith('LOGIN') || normalizedAction.startsWith('REGISTER') || normalizedAction.includes('OTP') || normalizedAction.includes('LOGOUT')) return 'SYSTEM';

  return normalizedModule || 'SYSTEM';
};

const mapLegacyEntityName = (doc: any) => {
  const targetName = doc?.target?.name;
  const performedByName = doc?.performedBy?.name;
  const message = doc?.message;

  return String(targetName || performedByName || message || 'Legacy activity').trim();
};

const mapLegacyEntityId = (doc: any) => {
  const targetId = doc?.target?.targetId;
  const targetMember = doc?.targetMember;
  const userId = doc?.userId;

  return String(targetId || targetMember || userId || doc?._id).trim();
};

const mapUserSnapshot = (userDoc: any) => ({
  id: String(userDoc?._id || userDoc?.id || ''),
  firstName: userDoc?.firstName || 'System',
  lastName: userDoc?.lastName || '',
  email: userDoc?.email || '',
  avatarUrl: userDoc?.avatarUrl,
});

const buildUnifiedUserMap = async (items: any[]) => {
  const ids = Array.from(
    new Set(
      items
        .flatMap((item) => [item.actorUserKey, item.targetUserKey])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (ids.length === 0) return new Map<string, any>();

  const users = await User.find({ _id: { $in: ids } })
    .select('firstName lastName email avatarUrl')
    .lean();

  return new Map(users.map((user) => [String(user._id), mapUserSnapshot(user)]));
};

export async function createActivityLog(input: CreateActivityLogInput) {

  if (!input.organizationId) {
    throw new AppError('organizationId is required for activity logs.', 400);
  }
  if (!input.userId) {
    throw new AppError('userId is required for activity logs.', 400);
  }
  if (!input.action) {
    throw new AppError('action is required for activity logs.', 400);
  }
  if (!input.entityType) {
    throw new AppError('entityType is required for activity logs.', 400);
  }
  if (!input.entityId) {
    throw new AppError('entityId is required for activity logs.', 400);
  }
  if (!input.entityName) {
    throw new AppError('entityName is required for activity logs.', 400);
  }

  const payload = {
    organizationId: toObjectId(input.organizationId, 'organizationId'),
    userId: toObjectId(input.userId, 'userId'),
    targetUserId: input.targetUserId ? toObjectId(input.targetUserId, 'targetUserId') : null,
    action: String(input.action).toUpperCase(),
    entityType: String(input.entityType).toUpperCase(),
    entityId: toObjectId(input.entityId, 'entityId'),
    entityName: String(input.entityName).trim(),
    metadata: input.metadata || {},
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };

  try {
    return await ActivityLog.create(payload);
  } catch (error) {
    throw error;
  }
}

export async function listActivityLogs(input: ListActivityLogsInput) {
  const organizationId = toObjectId(input.organizationId, 'organizationId');
  const organizationKey = String(input.organizationId).trim();
  const safePage = Math.max(1, Number(input.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(input.limit) || 20));
  
  const activityMatch: Record<string, any> = { 
    $or: [
      { organizationId },
      { action: { $regex: 'LOGIN|REGISTER|OTP|AUTH', $options: 'i' } }
    ]
  };
  
  const legacyMatch: Record<string, any> = { 
    $or: [
      { organizationId: organizationKey },
      { action: { $regex: 'LOGIN|REGISTER|OTP|AUTH', $options: 'i' } }
    ]
  };

  if (input.userId && input.userId !== 'ALL_USERS') {
    const userObjectId = toObjectId(input.userId, 'userId');
    activityMatch.userId = userObjectId;
    legacyMatch.$and = legacyMatch.$and || [];
    legacyMatch.$and.push({
      $or: [
        { userId: userObjectId },
        { 'performedBy.userId': String(input.userId).trim() }
      ]
    });
  }

  // Fetch from both sources (limited to limit * page to allow sorting)
  // For performance, we fetch up to safeLimit * safePage from both
  const fetchLimit = safePage * safeLimit;
  
  const [activities, legacyLogs] = await Promise.all([
    ActivityLog.find(activityMatch).sort({ createdAt: -1 }).limit(fetchLimit).lean(),
    Log.find(legacyMatch).sort({ createdAt: -1 }).limit(fetchLimit).lean()
  ]);

  // Transform and Merge
  const mergedItems = [
    ...activities.map(item => ({
      ...item,
      _id: String(item._id),
      source: 'activity' as const,
      organizationKey
    })),
    ...legacyLogs.map(item => {
      const legacyItem = item as any;
      const actorUserId = String(legacyItem.userId || legacyItem.performedBy?.userId || '');
      const action = normalizeLegacyAction(String(legacyItem.action || ''), String(legacyItem.module || ''));
      const entityType = normalizeLegacyEntityType(String(legacyItem.action || ''), String(legacyItem.module || ''), String(legacyItem.target?.type || ''));
      
      return {
        _id: String(legacyItem._id),
        userId: actorUserId,
        action,
        entityType,
        entityId: String(legacyItem.target?.targetId || legacyItem.targetMember || legacyItem._id),
        entityName: mapLegacyEntityName(legacyItem),
        createdAt: legacyItem.createdAt,
        metadata: {
          ...legacyItem.metadata,
          message: legacyItem.message,
          module: legacyItem.module
        },
        source: 'legacy' as const,
        organizationKey
      };
    })
  ];

  // Sort merged items
  mergedItems.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginate
  const startIndex = (safePage - 1) * safeLimit;
  const paginatedItems = mergedItems.slice(startIndex, startIndex + safeLimit);

  // Get total counts for pagination
  const [totalActivities, totalLegacy] = await Promise.all([
    ActivityLog.countDocuments(activityMatch),
    Log.countDocuments(legacyMatch)
  ]);
  const total = totalActivities + totalLegacy;

  // Build User Map for the paginated items
  const userMap = await buildUnifiedUserMap(paginatedItems);

  return {
    items: paginatedItems.map((item: any) => ({
      ...item,
      user: userMap.get(String(item.userId)) || {
        id: String(item.userId || 'system'),
        firstName: 'System',
        lastName: '',
        email: '',
      },
      targetUser: item.targetUserId ? userMap.get(String(item.targetUserId)) : undefined
    })),
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
      hasNextPage: (safePage * safeLimit) < total,
    },
  };
}

export function summarizeAction(action: string) {
  return toTitle(action);
}
