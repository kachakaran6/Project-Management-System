import mongoose from 'mongoose';

const ACTIVITY_LOG_ACTIONS = [
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'TASK_STATUS_UPDATED',
  'TASK_ASSIGNED',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_DELETED',
  'PAGE_CREATED',
  'PAGE_UPDATED',
  'PAGE_DELETED',
  'USER_ADDED',
  'USER_REMOVED',
  'ROLE_CHANGED',
  'ROLE_PERMISSION_CHANGED',
  'ROLE_PERMISSION_PRESET_CHANGED',
  'COMMENT_CREATED',
  'COMMENT_UPDATED',
  'COMMENT_DELETED',
  'MEMBER_INVITED',
  'MEMBER_REACTIVATED',
  'MEMBER_PERMISSIONS_CHANGED',
  'MEMBER_ROLE_CHANGED',
  'MEMBER_REMOVED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'REGISTER_SUCCESS',
  'REGISTER_FAILURE',
  'OTP_VERIFIED',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ASSIGN',
  'UNASSIGN',
  'COMMENT',
  'STATUS_CHANGE',
  'USER_APPROVED',
  'USER_SUSPENDED',
  'BULK_ACTION',
  'SERVER_START',
  'DB_CONNECTED',
  'API_ERROR',
  'API_REQUEST',
] as const;

const activityLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_LOG_ACTIONS,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['TASK', 'PROJECT', 'PAGE', 'USER', 'TEAM', 'WORKSPACE', 'ORGANIZATION', 'COMMENT', 'SYSTEM'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityName: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: undefined,
    },
    userAgent: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

activityLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
activityLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ organizationId: 1, entityType: 1, createdAt: -1 });
activityLogSchema.index({ organizationId: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ organizationId: 1, targetUserId: 1, createdAt: -1 });
activityLogSchema.index({
  entityName: 'text',
  action: 'text',
  'metadata.fieldChanged': 'text',
  'metadata.oldValue': 'text',
  'metadata.newValue': 'text',
});

export default activityLogSchema;
export { ACTIVITY_LOG_ACTIONS };
