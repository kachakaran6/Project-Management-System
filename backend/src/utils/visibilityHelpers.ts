import mongoose from 'mongoose';
import { TASK_VISIBILITY } from '../constants/index.js';
import TaskVisibilityUser from '../models/TaskVisibilityUser.js';

/**
 * Check if a user has access to a task based on visibility rules
 */
export const canUserAccessTask = async (
  taskId: any,
  userId: string,
  creatorId: any,
  visibility: string,
  userRole?: string
): Promise<boolean> => {
  // Creator always has access
  if (String(creatorId) === String(userId)) {
    return true;
  }

  // Admin/Super admin always have access
  if (userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
    return true;
  }

  // Public tasks visible to everyone
  if (visibility === TASK_VISIBILITY.PUBLIC) {
    return true;
  }

  // Draft tasks visible only to creator
  if (visibility === TASK_VISIBILITY.DRAFT) {
    return false;
  }

  // Private tasks: check if user is in visibility list
  if (visibility === TASK_VISIBILITY.PRIVATE) {
    const access = await TaskVisibilityUser.findOne({
      taskId: new mongoose.Types.ObjectId(String(taskId)),
      userId: new mongoose.Types.ObjectId(String(userId))
    }).lean();
    return !!access;
  }

  return false;
};

/**
 * Build a MongoDB query filter that enforces visibility rules
 */
export const buildVisibilityFilter = (userId: string, userRole?: string): Record<string, any> => {
  const isAdmin = userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  return {
    $or: [
      // Public tasks
      { visibility: TASK_VISIBILITY.PUBLIC },
      
      // Draft tasks - only creator
      {
        $and: [
          { visibility: TASK_VISIBILITY.DRAFT },
          { creatorId: new mongoose.Types.ObjectId(userId) }
        ]
      },
      
      // Private tasks - creator or in visibility list or admin
      ...(isAdmin ? [] : [{
        $and: [
          { visibility: TASK_VISIBILITY.PRIVATE },
          {
            $or: [
              { creatorId: new mongoose.Types.ObjectId(userId) }
              // Note: visibility list check requires a separate lookup
            ]
          }
        ]
      }]),

      // Admin sees all tasks in their org
      ...(isAdmin ? [{ visibility: { $exists: true } }] : [])
    ]
  };
};

/**
 * Apply visibility filtering to task query using aggregation pipeline
 */
export const applyVisibilityAggregation = (userId: string, userRole?: string): Record<string, any>[] => {
  const isAdmin = userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return [
    {
      $lookup: {
        from: 'taskvisibilityusers',
        let: { taskId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$taskId', '$$taskId'] },
                  { $eq: ['$userId', userObjectId] }
                ]
              }
            }
          }
        ],
        as: 'visibilityAccess'
      }
    },
    {
      $match: isAdmin ? {} : {
        $or: [
          { visibility: TASK_VISIBILITY.PUBLIC },
          {
            $and: [
              { visibility: TASK_VISIBILITY.DRAFT },
              { creatorId: userObjectId }
            ]
          },
          {
            $and: [
              { visibility: TASK_VISIBILITY.PRIVATE },
              {
                $or: [
                  { creatorId: userObjectId },
                  { visibilityAccess: { $size: 1 } }
                ]
              }
            ]
          }
        ]
      }
    }
  ];
};

/**
 * Get all users with access to a private task
 */
export const getTaskVisibilityUsers = async (taskId: any, organizationId: any) => {
  return TaskVisibilityUser.find({
    taskId: new mongoose.Types.ObjectId(String(taskId)),
    organizationId: new mongoose.Types.ObjectId(String(organizationId))
  }).populate('userId', 'firstName lastName email avatarUrl').lean();
};

/**
 * Add user(s) to a private task's visibility list
 */
export const addTaskVisibilityUsers = async (
  taskId: any,
  userIds: string[],
  organizationId: any
) => {
  const taskObjectId = new mongoose.Types.ObjectId(String(taskId));
  const orgObjectId = new mongoose.Types.ObjectId(String(organizationId));

  const docs = userIds.map(userId => ({
    taskId: taskObjectId,
    userId: new mongoose.Types.ObjectId(String(userId)),
    organizationId: orgObjectId
  }));

  await TaskVisibilityUser.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000) throw err; // Ignore duplicate key errors
  });
};

/**
 * Remove user(s) from a private task's visibility list
 */
export const removeTaskVisibilityUsers = async (taskId: any, userIds: string[]) => {
  await TaskVisibilityUser.deleteMany({
    taskId: new mongoose.Types.ObjectId(String(taskId)),
    userId: { $in: userIds.map(id => new mongoose.Types.ObjectId(String(id))) }
  });
};

/**
 * Clear all visibility users for a task (when changing from private to public)
 */
export const clearTaskVisibilityUsers = async (taskId: any) => {
  await TaskVisibilityUser.deleteMany({
    taskId: new mongoose.Types.ObjectId(String(taskId))
  });
};
