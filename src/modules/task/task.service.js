import Task from '../../models/Task.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import TaskTag from '../../models/TaskTag.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import mongoose from 'mongoose';
import { emitToRoom, emitToUsers } from '../../realtime/socket.server.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../realtime/socket.events.js';
import { ROLES } from '../../constants/index.js';

/**
 * Task Service: Business Logic for task management
 */

/**
 * Create a new task with assignees and tags
 */
export const createTask = async (taskData, userId) => {
  const { 
    title, description, projectId, workspaceId, organizationId, 
    status, priority, dueDate, assignees = [], tags = [] 
  } = taskData;

  if (!title) {
    throw new AppError('Title is required.', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create the Task
    const [task] = await Task.create([{
      title,
      description,
      projectId,
      workspaceId,
      organizationId,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      dueDate,
      creatorId: userId
    }], { session });

    // 2. Handle Assignees
    if (assignees.length > 0) {
      const assigneeDocs = assignees.map(aId => ({
        taskId: task._id,
        userId: aId,
        organizationId,
        assignedById: userId
      }));
      await TaskAssignee.insertMany(assigneeDocs, { session });
    }

    // 3. Handle Tags
    if (tags.length > 0) {
      const tagDocs = tags.map(tagId => ({
        taskId: task._id,
        tagId,
        organizationId
      }));
      await TaskTag.insertMany(tagDocs, { session });
    }

    await session.commitTransaction();

    // 4. Activity Logging & Notifications (Async)
    activityLog.logActivity({
      userId,
      organizationId,
      workspaceId,
      projectId,
      resourceId: task._id,
      resourceType: 'Task',
      action: 'CREATE',
      metadata: { title: task.title }
    });

    if (assignees.length > 0) {
      activityLog.triggerNotification({
        userIds: assignees,
        organizationId,
        actorId: userId,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task: ${task.title}`,
        resourceId: task._id,
        resourceType: 'Task'
      });
    }

    // Real-time notify
    emitToRoom(SOCKET_ROOMS.WORKSPACE(workspaceId), SOCKET_EVENTS.TASK_CREATED, {
      taskId: task._id,
      title: task.title,
      projectId
    });

    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get tasks with advanced filtering
 */
export const getTasks = async (filter, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const query = { isActive: true };

  if (filter.role === ROLES.SUPER_ADMIN) {
    // Super Admin sees all active tasks
  } else if (filter.organizationId) {
    query.organizationId = filter.organizationId;
  } else if (filter.userId) {
    // If no org, show their own tasks
    query.creatorId = filter.userId;
  }

  if (filter.workspaceId) query.workspaceId = filter.workspaceId;
  if (filter.projectId) query.projectId = filter.projectId;
  if (filter.status) query.status = filter.status;
  if (filter.priority) query.priority = filter.priority;
  if (filter.dueDate) query.dueDate = { $lte: new Date(filter.dueDate) };

  // Filtering by assignee requires a sub-query or aggregation
  if (filter.assigneeId) {
    const taskIds = await TaskAssignee.find({ userId: filter.assigneeId }).distinct('taskId');
    query._id = { $in: taskIds };
  }

  // Filtering by tags
  if (filter.tagId) {
    const taskIds = await TaskTag.find({ tagId: filter.tagId }).distinct('taskId');
    if (query._id) {
       // Combine with assignee filter if present
       const existingIds = query._id.$in;
       query._id.$in = existingIds.filter(id => taskIds.some(tid => tid.equals(id)));
    } else {
       query._id = { $in: taskIds };
    }
  }

  const [tasks, totalCount] = await Promise.all([
    Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('projectId', 'name')
      .populate('workspaceId', 'name')
      .lean(),
    Task.countDocuments(query)
  ]);

  return { tasks, totalCount };
};

/**
 * Update task
 */
export const updateTask = async (taskId, updateData, userId, role) => {
  const query = { _id: taskId, isActive: true };
  
  // Basic security: if not Super Admin, check if they are the creator or it belongs to no org (solo)
  // Actually, per requirements: USER and ADMIN behave same and can manage everything.
  
  const task = await Task.findOneAndUpdate(
    query,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!task) throw new AppError('Task not found.', 404);

  // Log activity
  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: task._id,
    resourceType: 'TASK',
    action: 'UPDATE',
    metadata: { updatedFields: Object.keys(updateData) }
  });

  return task;
};

/**
 * Assign users to task
 */
export const assignUsers = async (taskId, userIds, actorId) => {
  const task = await Task.findOne({ _id: taskId });
  if (!task) throw new AppError('Task not found.', 404);

  const assigneeDocs = userIds.map(uId => ({
    taskId,
    userId: uId,
    organizationId: task.organizationId,
    assignedById: actorId
  }));

  // Using ordered: false to skip duplicates without failing the whole operation
  await TaskAssignee.insertMany(assigneeDocs, { ordered: false }).catch(err => {
    // Expected duplicate key errors are handled by MongoDB (unique index)
    if (err.code !== 11000) throw err;
  });

  activityLog.triggerNotification({
    userIds,
    organizationId: task.organizationId,
    actorId,
    type: 'TASK_ASSIGNED',
    message: `You were assigned to task: ${task.title}`,
    resourceId: taskId,
    resourceType: 'Task'
  });

  // Real-time notify affected users
  emitToUsers(userIds, SOCKET_EVENTS.TASK_ASSIGNED, {
    taskId,
    title: task.title,
    actorId
  });

  return { success: true };
};

/**
 * Change task status with validation
 */
export const changeStatus = async (taskId, newStatus, userId) => {
  const allowedStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ARCHIVED'];
  if (!allowedStatuses.includes(newStatus)) {
    throw new AppError('Invalid status transition.', 400);
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId },
    { $set: { status: newStatus } },
    { new: true }
  );

  if (!task) throw new AppError('Task not found.', 404);

  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: task._id,
    resourceType: 'Task',
    action: 'STATUS_CHANGE',
    metadata: { newStatus }
  });

  // Real-time notify
  emitToRoom(SOCKET_ROOMS.WORKSPACE(task.workspaceId), SOCKET_EVENTS.TASK_UPDATED, {
    taskId: task._id,
    newStatus,
    projectId: task.projectId
  });

  return task;
};

/**
 * Get single task by ID with assignees and tags populated
 */
export const getTaskById = async (taskId) => {
  const task = await Task.findOne({ _id: taskId, isActive: true })
    .populate('projectId', 'name')
    .populate('workspaceId', 'name')
    .lean();

  if (!task) throw new AppError('Task not found.', 404);

  // Fetch assignees and tags
  const [assignees, tags] = await Promise.all([
    TaskAssignee.find({ taskId }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId }).populate('tagId').lean()
  ]);

  return { ...task, assignees, tags };
};

/**
 * Delete (Soft-delete) task
 */
export const deleteTask = async (taskId, userId) => {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, isActive: true },
    { $set: { isActive: false } }
  );

  if (!task) throw new AppError('Task not found.', 404);

  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: taskId,
    resourceType: 'Task',
    action: 'DELETE',
    metadata: { title: task.title }
  });

  // Real-time notify
  emitToRoom(SOCKET_ROOMS.WORKSPACE(task.workspaceId), SOCKET_EVENTS.TASK_DELETED, {
    taskId,
    projectId: task.projectId
  });
};
