import Task from '../../models/Task.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import TaskTag from '../../models/TaskTag.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import mongoose from 'mongoose';
import { emitToRoom, emitToUsers } from '../../realtime/socket.server.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../realtime/socket.events.js';
import { ROLES } from '../../constants/index.js';

const normalizeAssigneeUser = (assignee: any) => {
  const user = assignee?.userId;
  if (!user) return null;

  const id = String(user._id || user.id || user);
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';

  return {
    id,
    name,
    email: user.email || '',
    avatarUrl: user.avatarUrl,
  };
};

const enrichTaskWithAssignees = (task: any, assignees: any[] = []) => {
  const assigneeUsers = assignees
    .map(normalizeAssigneeUser)
    .filter(Boolean);

  return {
    ...task,
    assignees,
    assigneeUsers,
    assigneeId: assigneeUsers[0]?.id,
  };
};

/**
 * Task Service: Business Logic for task management
 */

/**
 * Create a new task with assignees and tags
 */
export const createTask = async (taskData: Record<string, any>, userId: string, role: string) => {
  const { 
    title, description, projectId, workspaceId, organizationId, 
    status, priority, dueDate, assignees = [], assigneeId, tags = [] 
  } = taskData;

  // Normalize single assigneeId into the assignees array
  if (assigneeId && !assignees.includes(assigneeId)) {
    assignees.push(assigneeId);
  }

  if (!title) {
    throw new AppError('Title is required.', 400);
  }

  // VALIDATION: Assignment Rules
  // Members can ONLY assign tasks to themselves.
  if (assignees.length > 0) {
    const isMember = role === ROLES.MEMBER || role === 'MEMBER';
    const hasOtherAssignees = assignees.some((aId: string) => String(aId) !== String(userId));

    if (isMember && hasOtherAssignees) {
      throw new AppError('You can only assign tasks to yourself.', 403);
    }
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
      const assigneeDocs = assignees.map((aId: any) => ({
        taskId: task._id,
        userId: aId,
        organizationId,
        assignedById: userId
      }));
      await TaskAssignee.insertMany(assigneeDocs, { session });
    }

    // 3. Handle Tags
    if (tags.length > 0) {
      const tagDocs = tags.map((tagId: any) => ({
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
  } catch (error: unknown) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get tasks with advanced filtering
 */
export const getTasks = async (
  filter: Record<string, any>,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {}
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, any> = { isActive: true };

  // Helper to safely convert string to ObjectId
  const safeObjectId = (id: any) => {
    if (!id) return null;
    try {
      return mongoose.Types.ObjectId.isValid(String(id))
        ? new mongoose.Types.ObjectId(String(id))
        : null;
    } catch {
      return null;
    }
  };

  if (filter.role === ROLES.SUPER_ADMIN) {
    // Super Admin sees all active tasks
  } else if (filter.organizationId) {
    const orgId = safeObjectId(filter.organizationId);
    if (orgId) query.organizationId = orgId;
  } else if (filter.userId) {
    // If no org, show their own tasks
    const userId = safeObjectId(filter.userId);
    if (userId) query.creatorId = userId;
  }

  if (filter.workspaceId) {
    const wsId = safeObjectId(filter.workspaceId);
    if (wsId) query.workspaceId = wsId;
  }
  if (filter.projectId) {
    const projId = safeObjectId(filter.projectId);
    if (projId) query.projectId = projId;
  }
  if (filter.status) query.status = filter.status;
  if (filter.priority) query.priority = filter.priority;
  if (filter.dueDate) query.dueDate = { $lte: new Date(filter.dueDate) };
  if (filter.search) {
    const regex = new RegExp(String(filter.search).trim(), 'i');
    query.$or = [
      { title: regex },
      { description: regex },
    ];
  }

  // Filtering by assignee requires a sub-query or aggregation
  if (filter.assigneeId) {
    const assigneeId = safeObjectId(filter.assigneeId);
    if (assigneeId) {
      const taskIds = await TaskAssignee.find({
        userId: assigneeId,
      }).distinct('taskId');
      query._id = { $in: taskIds };
    }
  }

  // Filtering by tags
  if (filter.tagId) {
    const tagId = safeObjectId(filter.tagId);
    if (tagId) {
      const taskIds = await TaskTag.find({
        tagId: tagId,
      }).distinct('taskId');
      if (query._id) {
         // Combine with assignee filter if present
         const existingIds = query._id.$in;
         query._id.$in = existingIds.filter((id: any) => taskIds.some((tid: any) => tid.equals(id)));
      } else {
         query._id = { $in: taskIds };
      }
    }
  }

  const [tasks, totalCount] = await Promise.all([
    Task.find(query)
      .sort({ position: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('projectId', 'name')
      .populate('workspaceId', 'name')
      .lean(),
    Task.countDocuments(query)
  ]);

  if (tasks.length === 0) {
    return { tasks, totalCount };
  }

  const taskIds = tasks.map((task: any) => task._id);
  const assigneeRows = await TaskAssignee.find({ taskId: { $in: taskIds } })
    .populate('userId', 'firstName lastName email avatarUrl')
    .lean();

  const assigneesByTaskId = new Map<string, any[]>();
  for (const row of assigneeRows) {
    const key = String(row.taskId);
    const existing = assigneesByTaskId.get(key) || [];
    existing.push(row);
    assigneesByTaskId.set(key, existing);
  }

  const enrichedTasks = tasks.map((task: any) => {
    const assignees = assigneesByTaskId.get(String(task._id)) || [];
    return enrichTaskWithAssignees(task, assignees);
  });

  return { tasks: enrichedTasks, totalCount };
};

/**
 * Update task
 */
export const updateTask = async (taskId: any, updateData: Record<string, any>, userId: any, role: any) => {
  const { assigneeId, assigneeIds, ...otherData } = updateData;
  const query: Record<string, any> = { _id: taskId, isActive: true };
  const assigneesProvided =
    Object.prototype.hasOwnProperty.call(updateData, 'assigneeId') ||
    Object.prototype.hasOwnProperty.call(updateData, 'assigneeIds');
  
  // VALIDATION: Assignment Rules for Update
  const isMember = role === ROLES.MEMBER || role === 'MEMBER';
  
  if (isMember && (updateData.assigneeId || updateData.assigneeIds)) {
    const newAssignees = updateData.assigneeIds || [updateData.assigneeId];
    const hasOtherAssignees = newAssignees.some((aId: string) => aId && String(aId) !== String(userId));
    
    if (hasOtherAssignees) {
      throw new AppError('You can only assign tasks to yourself.', 403);
    }
  }

  const task = await Task.findOneAndUpdate(
    query,
    { $set: otherData },
    { new: true, runValidators: true }
  );

  if (!task) throw new AppError('Task not found.', 404);

  // Handle assignment update (single + multi-assignee compatible)
  if (assigneesProvided) {
    const normalizedAssigneeIds = new Set<string>();

    if (Array.isArray(assigneeIds)) {
      assigneeIds
        .map((id: any) => String(id).trim())
        .filter(Boolean)
        .forEach((id: string) => normalizedAssigneeIds.add(id));
    }

    if (assigneeId !== undefined && assigneeId !== null && String(assigneeId).trim()) {
      normalizedAssigneeIds.add(String(assigneeId).trim());
    }

    const finalAssigneeIds = Array.from(normalizedAssigneeIds);

    if (finalAssigneeIds.length > 0) {
      const validMembers = await OrganizationMember.find({
        organizationId: task.organizationId,
        userId: { $in: finalAssigneeIds },
        isActive: true,
      })
        .select('userId')
        .lean();

      const validMemberIds = new Set(validMembers.map((member: any) => String(member.userId)));
      const invalidAssignees = finalAssigneeIds.filter((id: string) => !validMemberIds.has(id));

      if (invalidAssignees.length > 0) {
        throw new AppError('One or more assignees are not members of this organization.', 400);
      }
    }

    // Replace old assignees
    await TaskAssignee.deleteMany({ taskId });

    if (finalAssigneeIds.length > 0) {
      const assigneeDocs = finalAssigneeIds.map((id: string) => ({
        taskId,
        userId: id,
        organizationId: task.organizationId,
        assignedById: userId,
      }));
      await TaskAssignee.insertMany(assigneeDocs, { ordered: false });

       // Trigger Notification
       activityLog.triggerNotification({
        userIds: finalAssigneeIds,
         organizationId: task.organizationId,
         actorId: userId,
         type: 'TASK_ASSIGNED',
         message: `You have been reassigned to task: ${task.title}`,
         resourceId: taskId,
         resourceType: 'Task'
       });

       // Real-time notify
       emitToUsers(finalAssigneeIds, SOCKET_EVENTS.TASK_ASSIGNED, {
         taskId,
         title: task.title,
         actorId: userId
       });
    }
  }

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
export const assignUsers = async (taskId: any, userIds: any[], actorId: any, role: string) => {
  const isMember = role === ROLES.MEMBER || role === 'MEMBER';
  if (isMember) {
    const hasOtherAssignees = userIds.some((uId: any) => String(uId) !== String(actorId));
    if (hasOtherAssignees) {
      throw new AppError('You can only assign tasks to yourself.', 403);
    }
  }

  const task = await Task.findOne({ _id: taskId });
  if (!task) throw new AppError('Task not found.', 404);

  const assigneeDocs = userIds.map((uId: any) => ({
    taskId,
    userId: uId,
    organizationId: task.organizationId,
    assignedById: actorId
  }));

  // Using ordered: false to skip duplicates without failing the whole operation
  await TaskAssignee.insertMany(assigneeDocs, { ordered: false }).catch((err: any) => {
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
export const changeStatus = async (taskId: any, newStatus: any, userId: any) => {
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
export const getTaskById = async (taskId: any) => {
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

  return {
    ...enrichTaskWithAssignees(task, assignees),
    tags,
  };
};

/**
 * Delete (Soft-delete) task
 */
export const deleteTask = async (taskId: any, userId: any) => {
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
