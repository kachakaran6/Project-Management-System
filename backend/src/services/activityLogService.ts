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
  console.log('Creating activity log:', input);

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
    console.error('[ActivityLog] Failed to create log:', error);
    throw error;
  }
}

export async function listActivityLogs(input: ListActivityLogsInput) {
  const organizationId = toObjectId(input.organizationId, 'organizationId');
  const organizationKey = String(input.organizationId).trim();
  const safePage = Math.max(1, Number(input.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(input.limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const activityBranchMatch: Record<string, any> = { organizationId };
  const legacyBranchMatch: Record<string, any> = { organizationId: organizationKey };

  if (input.userId && input.userId !== 'ALL_USERS') {
    const userObjectId = toObjectId(input.userId, 'userId');
    const member = await OrganizationMember.findOne({
      organizationId,
      userId: userObjectId,
      isActive: true,
    }).select('_id').lean();

    if (!member) {
      throw new AppError('Selected user is not an active member of this organization.', 404);
    }

    activityBranchMatch.userId = userObjectId;
    legacyBranchMatch.userId = userObjectId;
  }

  if (input.action) {
    activityBranchMatch.action = input.action.toUpperCase();

    const legacyActionMatch = buildLegacyActionMatch(input.action);
    if (legacyActionMatch) {
      legacyBranchMatch.$and = legacyBranchMatch.$and || [];
      legacyBranchMatch.$and.push(legacyActionMatch);
    }
  }

  if (input.entityType) {
    activityBranchMatch.entityType = input.entityType.toUpperCase();

    const legacyEntityTypeMatch = buildLegacyEntityTypeMatch(input.entityType);
    if (legacyEntityTypeMatch) {
      legacyBranchMatch.$and = legacyBranchMatch.$and || [];
      legacyBranchMatch.$and.push(legacyEntityTypeMatch);
    }
  }

  if (input.entityId) {
    activityBranchMatch.entityId = toObjectId(input.entityId, 'entityId');
    
    // Legacy maps entityId to target.targetId or targetMember
    const eId = String(input.entityId).trim();
    legacyBranchMatch.$or = legacyBranchMatch.$or || [];
    legacyBranchMatch.$or.push(
      { 'target.targetId': eId },
      { targetMember: eId }
    );
  }

  if (input.startDate || input.endDate) {
    activityBranchMatch.createdAt = {};
    legacyBranchMatch.createdAt = {};
    if (input.startDate) {
      const start = new Date(input.startDate);
      if (!Number.isNaN(start.getTime())) {
        activityBranchMatch.createdAt.$gte = start;
        legacyBranchMatch.createdAt.$gte = start;
      }
    }
    if (input.endDate) {
      const end = new Date(input.endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        activityBranchMatch.createdAt.$lte = end;
        legacyBranchMatch.createdAt.$lte = end;
      }
    }
  }

  if (input.query) {
    const regex = new RegExp(String(input.query).trim(), 'i');
    activityBranchMatch.$and = activityBranchMatch.$and || [];
    activityBranchMatch.$and.push(buildActivityQueryMatch(String(input.query).trim()));

    legacyBranchMatch.$and = legacyBranchMatch.$and || [];
    legacyBranchMatch.$and.push(buildLegacyQueryMatch(String(input.query).trim()));
  }

  const commonProjectStage = {
    _id: 1,
    organizationKey: 1,
    actorUserKey: 1,
    targetUserKey: 1,
    action: 1,
    entityType: 1,
    entityId: 1,
    entityName: 1,
    metadata: 1,
    createdAt: 1,
    message: 1,
    module: 1,
    status: 1,
    level: 1,
    source: 1,
    searchText: 1,
  };

  const activityPipeline = [
    { $match: activityBranchMatch },
    {
      $project: {
        _id: 1,
        organizationKey: { $convert: { input: '$organizationId', to: 'string', onError: null, onNull: null } },
        actorUserKey: { $convert: { input: '$userId', to: 'string', onError: null, onNull: null } },
        targetUserKey: { $convert: { input: '$targetUserId', to: 'string', onError: null, onNull: null } },
        action: 1,
        entityType: 1,
        entityId: { $convert: { input: '$entityId', to: 'string', onError: null, onNull: null } },
        entityName: 1,
        metadata: 1,
        createdAt: 1,
        message: { $literal: null },
        module: { $literal: 'ACTIVITY' },
        status: { $literal: 'SUCCESS' },
        level: { $literal: 'info' },
        source: { $literal: 'activity' },
        searchText: {
          $concat: [
            { $ifNull: ['$action', ''] },
            ' ',
            { $ifNull: ['$entityName', ''] },
            ' ',
            { $ifNull: ['$entityType', ''] },
            ' ',
            { $ifNull: [{ $toString: '$metadata.fieldChanged' }, ''] },
            ' ',
            { $ifNull: [{ $toString: '$metadata.oldValue' }, ''] },
            ' ',
            { $ifNull: [{ $toString: '$metadata.newValue' }, ''] },
            ' ',
            { $ifNull: [{ $toString: '$metadata.projectName' }, ''] },
          ],
        },
      },
    },
  ];

  const legacyPipeline = [
    { $match: legacyBranchMatch },
    {
      $project: {
        _id: 1,
        organizationKey: { $convert: { input: '$organizationId', to: 'string', onError: null, onNull: null } },
        actorUserKey: {
          $convert: {
            input: {
              $ifNull: [
                '$userId',
                {
                  $convert: {
                    input: '$performedBy.userId',
                    to: 'objectId',
                    onError: null,
                    onNull: null,
                  },
                },
              ],
            },
            to: 'string',
            onError: null,
            onNull: null,
          },
        },
        targetUserKey: {
          $convert: {
            input: '$targetMember',
            to: 'string',
            onError: null,
            onNull: null,
          },
        },
        action: 1,
        entityType: { $ifNull: ['$module', 'SYSTEM'] },
        entityId: {
          $convert: {
            input: {
              $ifNull: ['$target.targetId', '$targetMember'],
            },
            to: 'string',
            onError: null,
            onNull: null,
          },
        },
        entityName: {
          $trim: {
            input: {
              $ifNull: [
                '$target.name',
                {
                  $ifNull: [
                    '$performedBy.name',
                    '$message',
                  ],
                },
              ],
            },
          },
        },
        metadata: {
          $mergeObjects: [
            { message: '$message', status: '$status', level: '$level', module: '$module' },
            { $ifNull: ['$metadata', {}] },
          ],
        },
        createdAt: 1,
        message: 1,
        module: 1,
        status: 1,
        level: 1,
        source: { $literal: 'legacy' },
        searchText: {
          $concat: [
            { $ifNull: ['$message', ''] },
            ' ',
            { $ifNull: ['$action', ''] },
            ' ',
            { $ifNull: ['$module', ''] },
            ' ',
            { $ifNull: ['$target.name', ''] },
            ' ',
            { $ifNull: ['$performedBy.name', ''] },
            ' ',
            { $ifNull: ['$performedBy.email', ''] },
          ],
        },
      },
    },
  ];

  const unifiedPipeline = [
    ...activityPipeline,
    {
      $unionWith: {
        coll: Log.collection.name,
        pipeline: legacyPipeline,
      },
    },
    { $match: { organizationKey } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: safeLimit },
        ],
        total: [
          { $count: 'value' },
        ],
      },
    },
    {
      $project: {
        items: 1,
        total: { $ifNull: [{ $arrayElemAt: ['$total.value', 0] }, 0] },
      },
    },
  ];

  const [result] = await ActivityLog.aggregate(unifiedPipeline as mongoose.PipelineStage[]).allowDiskUse(true);
  const rawItems = (result?.items || []) as any[];
  const total = Number(result?.total || 0);

  const userMap = await buildUnifiedUserMap(rawItems);

  return {
    items: rawItems.map((item: any) => {
      const source = String(item.source || 'legacy');
      const actorUserId = String(item.actorUserKey || '');
      const targetUserId = item.targetUserKey ? String(item.targetUserKey) : undefined;

      const normalizedAction = source === 'legacy'
        ? normalizeLegacyAction(String(item.action || ''), String(item.module || ''))
        : String(item.action || '');

      const normalizedEntityType = source === 'legacy'
        ? normalizeLegacyEntityType(String(item.action || ''), String(item.module || ''), String(item.entityType || ''))
        : String(item.entityType || 'SYSTEM');

      const normalizedEntityId = String(item.entityId || item._id || '');
      const normalizedEntityName = source === 'legacy'
        ? mapLegacyEntityName(item)
        : String(item.entityName || 'Activity');

      return {
        _id: String(item._id),
        organizationId: organizationKey,
        userId: actorUserId,
        targetUserId,
        action: normalizedAction,
        entityType: normalizedEntityType,
        entityId: normalizedEntityId,
        entityName: normalizedEntityName,
        metadata: item.metadata || {},
        createdAt: item.createdAt,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        message: item.message || undefined,
        module: item.module || undefined,
        source,
        user: userMap.get(actorUserId) || {
          id: actorUserId || 'system',
          firstName: 'System',
          lastName: '',
          email: '',
        },
        targetUser: targetUserId ? userMap.get(targetUserId) : undefined,
      };
    }),
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
      hasNextPage: safePage < Math.ceil(total / safeLimit),
    },
  };
}

export function summarizeAction(action: string) {
  return toTitle(action);
}
