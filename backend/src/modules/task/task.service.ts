import Task from '../../models/Task.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import TaskTag from '../../models/TaskTag.js';
import Tag from '../../models/Tag.js';
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

const normalizeUser = (user: any) => {
  if (!user) return null;
  const id = String(user._id || user.id);
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';
  return { id, name, email: user.email || '', avatarUrl: user.avatarUrl };
};

/**
 * Normalize tags from TaskTag records into a simple string array of names.
 */
const normalizeTags = (taskTags: any[]): string[] => {
  if (!Array.isArray(taskTags)) return [];
  console.log(`[TaskService] Normalizing ${taskTags.length} tags`);
  return taskTags
    .map((tt: any) => {
      // 1. If populated by Mongoose (most common)
      if (tt.tagId && typeof tt.tagId === 'object' && tt.tagId.name) {
        return String(tt.tagId.name);
      }
      // 2. If for some reason name is on the link object itself
      if (tt.name) return String(tt.name);
      // 3. Fallback: if tagId is just a string/ID, we can't get the name easily
      // unless we previously populated it. 
      return null;
    })
    .filter(Boolean) as string[];
};

/**
 * Validates and converts a value to a Mongoose ObjectId or returns null.
 */
const toObjectId = (value: any): mongoose.Types.ObjectId | null => {
  const str = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
};

/**
 * Find or create tags by name for an organization and link them to a task.
 */
const syncTags = async (taskId: any, tagNames: string[], organizationId: any, workspaceId?: any, session?: any) => {
  const mongoTaskId = toObjectId(taskId);
  if (!mongoTaskId) {
    console.error('[syncTags] Aborting: Missing valid taskId');
    return;
  }

  const originalNames = Array.isArray(tagNames) ? tagNames : [];
  const uniqueNames = Array.from(new Set(originalNames.map(t => String(t || '').trim()).filter(Boolean)));
  const mongoOrgId = toObjectId(organizationId);
  const mongoWsId = toObjectId(workspaceId);

  console.log(`[syncTags] Syncing ${uniqueNames.length} tags for Task ${mongoTaskId} (Org: ${mongoOrgId})`);

  const verifiedTagIds: mongoose.Types.ObjectId[] = [];

  for (const name of uniqueNames) {
    try {
      // 1. Strict find (case-insensitive)
      let tag = await Tag.findOne({ 
        organizationId: mongoOrgId || null, 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      }).session(session);

      // 2. Repair/Cleanup: If tag exists but ID is corrupted (non-hex string)
      if (tag && !mongoose.Types.ObjectId.isValid(String(tag._id))) {
        console.warn(`[syncTags] Fixing corrupted tag ID for "${name}"`);
        await Tag.deleteOne({ _id: tag._id }).session(session);
        tag = null;
      }

      // 3. Create if missing
      if (!tag) {
        const [newTag] = await Tag.create([{ 
          name, 
          organizationId: mongoOrgId || null, 
          workspaceId: mongoWsId || null,
          color: '#6366f1' 
        }], { session });
        tag = newTag;
        console.log(`[syncTags] Created tag: ${name} -> ${tag._id}`);
      }

      // 4. Final verification of document ID before adding to insertion list
      if (tag && tag._id) {
        const cleanId = toObjectId(tag._id);
        if (cleanId && mongoose.Types.ObjectId.isValid(String(cleanId))) {
          // Extra check: never add name strings as IDs
          if (String(cleanId) !== name) {
            verifiedTagIds.push(cleanId);
          } else {
            console.error(`[syncTags] SECURITY BREACH: Tag ID matches Tag Name for "${name}". Skipping.`);
          }
        }
      }
    } catch (err) {
      console.error(`[syncTags] Failed to process tag "${name}":`, err);
      if (session) throw err;
    }
  }

  // 5. Atomic Update of links
  const linkFilter = { taskId: mongoTaskId };
  
  // Wipe existing links
  if (session) {
    await TaskTag.deleteMany(linkFilter, { session });
  } else {
    await TaskTag.deleteMany(linkFilter);
  }

  // Insert verified links only
  if (verifiedTagIds.length > 0) {
    const linkDocs = verifiedTagIds.map(tId => ({
      taskId: mongoTaskId,
      tagId: tId,
      organizationId: mongoOrgId || null
    }));

    console.log(`[syncTags] Finalizing link insertion for ${linkDocs.length} tags`);
    
    try {
      if (session) {
        await TaskTag.insertMany(linkDocs, { session, ordered: false });
      } else {
        await TaskTag.insertMany(linkDocs, { ordered: false });
      }
    } catch (err: any) {
      if (err.code !== 11000) {
        console.error('[syncTags] Database insertion error:', err);
        if (session) throw err;
      }
    }
  }

  console.log(`[syncTags] COMPLETED successfully for Task ${mongoTaskId}`);
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
    status,
    priority,
    dueDate,
    assignees = [],
    assigneeId,
    assigneeIds = [],
    tags = [],
    labels = []
  } = taskData;

  const normalizedAssignees = Array.from(
    new Set(
      [
        ...(Array.isArray(assignees) ? assignees : []),
        ...(Array.isArray(assigneeIds) ? assigneeIds : []),
        assigneeId,
      ]
        .map((id: any) => String(id || '').trim())
        .filter(Boolean),
    ),
  );

  const normalizedTags = Array.from(
    new Set(
      [
        ...(Array.isArray(tags) ? tags : []),
        ...(Array.isArray(labels) ? labels : []),
      ]
        .map((tag: any) => String(tag || '').trim())
        .filter(Boolean),
    ),
  );

  if (!title) {
    throw new AppError('Title is required.', 400);
  }

  // VALIDATION: Assignment Rules
  // Members can ONLY assign tasks to themselves.
  if (normalizedAssignees.length > 0) {
    const isMember = role === ROLES.MEMBER || role === 'MEMBER';
    const hasOtherAssignees = normalizedAssignees.some((aId: string) => String(aId) !== String(userId));

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

    const effectiveOrganizationId = task.organizationId || organizationId;

    // 2. Handle Assignees
    if (normalizedAssignees.length > 0 && effectiveOrganizationId) {
      const assigneeDocs = normalizedAssignees.map((aId: any) => ({
        taskId: task._id,
        userId: aId,
        organizationId: effectiveOrganizationId,
        assignedById: userId
      }));
      await TaskAssignee.insertMany(assigneeDocs, { session });
    }

    // 3. Handle Tags
    if (normalizedTags.length > 0) {
      await syncTags(task._id, normalizedTags, task.organizationId, task.workspaceId, session);
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

    if (normalizedAssignees.length > 0 && effectiveOrganizationId) {
      activityLog.triggerNotification({
        userIds: normalizedAssignees,
        organizationId: effectiveOrganizationId,
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

    return getTaskById(task._id);
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (error instanceof mongoose.Error.ValidationError) {
      console.error('[TaskService] Validation Error:', Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`).join(', '));
    } else {
      console.error('[TaskService] Creation Error:', error);
    }
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
      .populate('creatorId', 'firstName lastName email avatarUrl')
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

  // Fetch Tags for all tasks
  console.log(`[TaskService] Fetching tags for ${taskIds.length} tasks`);
  const tagRows = await TaskTag.find({ taskId: { $in: taskIds } })
    .populate('tagId', 'name color')
    .lean();
  console.log(`[TaskService] Found ${tagRows.length} tag rows`);

  const tagsByTaskId = new Map<string, string[]>();
  for (const row of tagRows as any[]) {
    const key = String(row.taskId);
    const existing = tagsByTaskId.get(key) || [];
    if (row.tagId?.name) existing.push(row.tagId.name);
    tagsByTaskId.set(key, existing);
  }

  const enrichedTasks = tasks.map((task: any) => {
    const assignees = assigneesByTaskId.get(String(task._id)) || [];
    const tags = tagsByTaskId.get(String(task._id)) || [];
    const enriched = enrichTaskWithAssignees(task, assignees);
    const creator = normalizeUser(task.creatorId);
    return {
      ...enriched,
      creator,
      createdBy: creator, // Redundant for robustness
      tags
    };
  });

  return { tasks: enrichedTasks, totalCount };
};

/**
 * Update task
 */
export const updateTask = async (taskId: any, updateData: Record<string, any>, userId: any, role: any) => {
  const { assigneeId, assigneeIds, tags, labels, ...otherData } = updateData;
  const query: Record<string, any> = { _id: taskId, isActive: true };
  const assigneesProvided =
    Object.prototype.hasOwnProperty.call(updateData, 'assigneeId') ||
    Object.prototype.hasOwnProperty.call(updateData, 'assigneeIds');
  const incomingTags = Array.from(new Set([
    ...(Array.isArray(tags) ? tags : []),
    ...(Array.isArray(labels) ? labels : [])
  ].map(t => String(t || '').trim()).filter(Boolean)));
  
  const tagsProvided = 
    Object.prototype.hasOwnProperty.call(updateData, 'tags') || 
    Object.prototype.hasOwnProperty.call(updateData, 'labels');
  
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

  // Handle Tag syncing
  if (tagsProvided && Array.isArray(incomingTags)) {
    console.log(`[TaskService] Syncing tags for task ${taskId}:`, incomingTags);
    await syncTags(taskId, incomingTags, task.organizationId, task.workspaceId);
  }

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

    if (finalAssigneeIds.length > 0 && task.organizationId) {
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

    if (finalAssigneeIds.length > 0 && task.organizationId) {
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

  return getTaskById(taskId);
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
    .populate('creatorId', 'firstName lastName email avatarUrl')
    .lean();

  if (!task) throw new AppError('Task not found.', 404);

  // Fetch assignees and tags
  const mongoTaskId = new mongoose.Types.ObjectId(String(taskId));
  const [assignees, tags] = await Promise.all([
    TaskAssignee.find({ taskId: mongoTaskId }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: mongoTaskId }).populate('tagId').lean()
  ]);

  const enriched = enrichTaskWithAssignees(task, assignees);
  const creator = normalizeUser(task.creatorId);
  return {
    ...enriched,
    creator,
    createdBy: creator, // Redundant for robustness
    tags: normalizeTags(tags),
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
