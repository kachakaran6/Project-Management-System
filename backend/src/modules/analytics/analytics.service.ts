import mongoose from 'mongoose';
import User from '../../models/User.js';
import Task from '../../models/Task.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import Status from '../../models/Status.js';
import Session from '../../models/Session.js';
import ActivityLog from '../../models/ActivityLog.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { AppError } from '../../middlewares/errorHandler.js';

export const getUserAnalyticsSummary = async (organizationId: string, userId: string) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError('User not found.', 404);

  const orgId = new mongoose.Types.ObjectId(organizationId);
  const uId = new mongoose.Types.ObjectId(userId);

  // 1. Total Tasks Created
  const tasksCreated = await Task.countDocuments({ 
    organizationId: orgId, 
    creatorId: uId,
    isActive: true 
  });

  // 2. Total Tasks Assigned
  const tasksAssigned = await TaskAssignee.countDocuments({ 
    organizationId: orgId, 
    userId: uId 
  });

  // 3. Total Tasks Completed
  // Find "DONE" status for this organization
  const doneStatus = await Status.findOne({ 
    organizationId: orgId, 
    name: { $regex: 'DONE|COMPLETED|FINISHED', $options: 'i' } 
  });

  let tasksCompleted = 0;
  if (doneStatus) {
    const assignedTaskIds = await TaskAssignee.find({ userId: uId, organizationId: orgId }).distinct('taskId');
    tasksCompleted = await Task.countDocuments({
      _id: { $in: assignedTaskIds },
      status: doneStatus._id,
      isActive: true
    });
  }

  // 4. Total Logins
  const [activityLogins, legacyLogins] = await Promise.all([
    ActivityLog.countDocuments({
      userId: uId,
      action: { $in: ['LOGIN_SUCCESS', 'USER_LOGIN'] }
    }),
    mongoose.model('Log').countDocuments({
      userId: uId,
      action: 'LOGIN_SUCCESS'
    })
  ]);
  const totalLogins = activityLogins + legacyLogins;

  // 5. Avg Session Duration
  // We calculate duration from stored sessions
  const sessions = await Session.find({ userId: uId }).select('createdAt lastActiveAt').lean();
  let totalDurationMs = 0;
  let closedSessions = 0;

  sessions.forEach(s => {
    if (s.lastActiveAt && s.createdAt) {
      const duration = s.lastActiveAt.getTime() - s.createdAt.getTime();
      if (duration > 0) {
        totalDurationMs += duration;
        closedSessions++;
      }
    }
  });

  const avgSessionDurationMinutes = closedSessions > 0 
    ? Math.round((totalDurationMs / closedSessions) / 60000) 
    : 0;

  return {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    },
    stats: {
      tasksCreated,
      tasksCompleted,
      tasksAssigned,
      totalLogins,
      avgSessionDurationMinutes,
      lastActiveAt: user.lastLogin || user.updatedAt
    }
  };
};

export const getUserSessions = async (userId: string, limit: number = 20, page: number = 1) => {
  const skip = (page - 1) * limit;
  const sessions = await Session.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Session.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

  return {
    sessions: sessions.map(s => ({
      id: s._id,
      loginAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      durationMinutes: s.lastActiveAt && s.createdAt ? Math.round((s.lastActiveAt.getTime() - s.createdAt.getTime()) / 60000) : 0,
      device: s.deviceName,
      deviceType: s.deviceType,
      ipAddress: s.ipAddress,
      isActive: s.isActive,
      expiresAt: s.expiresAt
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};
