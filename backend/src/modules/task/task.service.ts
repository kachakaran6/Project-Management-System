import Task from '../../models/Task.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import TaskTag from '../../models/TaskTag.js';
import TaskVisibilityUser from '../../models/TaskVisibilityUser.js';
import Tag from '../../models/Tag.js';
import Project from '../../models/Project.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import * as visibilityHelpers from '../../utils/visibilityHelpers.js';
import mongoose from 'mongoose';
import { emitToRoom, emitToUsers } from '../../realtime/socket.server.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../realtime/socket.events.js';
import { ROLES } from '../../constants/index.js';

const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'SUPER_ADMIN']);

const isAdminRole = (role?: string | null) => Boolean(role && ADMIN_ROLES.has(role));

const isTaskDraft = (task?: { isDraft?: boolean; visibility?: string } | null) =>
  Boolean(task?.isDraft || task?.visibility === 'DRAFT');

const normalizeVisibility = (visibility?: any) => {
  const normalized = String(visibility || 'PUBLIC').trim().toUpperCase();
  if (normalized === 'PRIVATE') return 'PRIVATE';
  return 'PUBLIC';
};

const ensureDraftOwner = (task: any, actorId: any) => {
  if (isTaskDraft(task) && String(task.creatorId) !== String(actorId)) {
    throw new AppError('Only the draft creator can access this draft.', 403);
  }
};

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
 * Normalize tags from TaskTag records into rich objects.
 */
const normalizeTags = (taskTags: any[]): any[] => {
  if (!Array.isArray(taskTags)) return [];
  return taskTags
    .map((tt: any) => {
      const tag = tt.tagId;
      if (tag && typeof tag === 'object' && tag._id) {
        return {
          id: String(tag._id),
          name: tag.name,
          label: tag.label || tag.name,
          color: tag.color || '#6366f1',
          icon: tag.icon || 'Tag'
        };
      }
      return null;
    })
    .filter(Boolean);
};

const toObjectId = (value: any): mongoose.Types.ObjectId | null => {
  const str = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
};

const resolveProjectName = async (projectId: any) => {
  const normalizedProjectId = toObjectId(projectId);
  if (!normalizedProjectId) return 'General';
  const project = await Project.findById(normalizedProjectId).select('name').lean();
  return project?.name || 'General';
};

const buildDraftMatch = (userId: string, organizationId?: any, projectId?: any, workspaceId?: any) => {
  const match: Record<string, any> = {
    creatorId: toObjectId(userId),
    isActive: true,
    $or: [
      { isDraft: true },
      { visibility: 'DRAFT' }
    ]
  };

  const orgObjectId = toObjectId(organizationId);
  if (orgObjectId) match.organizationId = orgObjectId;

  if (projectId !== undefined) {
    const normalizedProjectId = toObjectId(projectId);
    if (normalizedProjectId) {
      match.projectId = normalizedProjectId;
    } else {
      match.projectId = null;
    }
  }

  if (workspaceId !== undefined) {
    const normalizedWorkspaceId = toObjectId(workspaceId);
    if (normalizedWorkspaceId) {
      match.workspaceId = normalizedWorkspaceId;
    } else {
      match.workspaceId = null;
    }
  }

  return match;
};

const syncTaskVisibilityUsers = async (
  taskId: any,
  visibility: string,
  visibleToUsers: any[] = [],
  organizationId: any,
  session?: any
) => {
  const normalizedTaskId = toObjectId(taskId);
  const normalizedOrganizationId = toObjectId(organizationId);
  if (!normalizedTaskId || !normalizedOrganizationId) return;

  await TaskVisibilityUser.deleteMany({ taskId: normalizedTaskId }, { session });

  if (visibility === 'PRIVATE' && Array.isArray(visibleToUsers) && visibleToUsers.length > 0) {
    const docs = visibleToUsers
      .map(uid => toObjectId(uid))
      .filter(Boolean)
      .map(uid => ({
        taskId: normalizedTaskId,
        userId: uid,
        organizationId: normalizedOrganizationId
      }));

    if (docs.length > 0) {
      await TaskVisibilityUser.insertMany(docs, { session, ordered: false }).catch(err => {
        if (err.code !== 11000) throw err;
      });
    }
  }
};

const syncTaskAssignees = async (
  taskId: any,
  assigneeIds: string[],
  organizationId: any,
  actorId: any,
  session?: any
) => {
  const normalizedTaskId = toObjectId(taskId);
  if (!normalizedTaskId) return;

  await TaskAssignee.deleteMany({ taskId: normalizedTaskId }, { session });

  if (assigneeIds.length > 0) {
    const docs = assigneeIds
      .map(aId => toObjectId(aId))
      .filter(Boolean)
      .map(aId => ({
        taskId: normalizedTaskId,
        userId: aId,
        organizationId,
        assignedById: actorId
      }));

    if (docs.length > 0) {
      await TaskAssignee.insertMany(docs, { session, ordered: false });
    }
  }
};

/**
 * Find or create tags and link them to a task.
 */
const syncTags = async (taskId: any, tags: any[], organizationId: any, workspaceId?: any, session?: any) => {
  const mongoTaskId = toObjectId(taskId);
  if (!mongoTaskId) return;

  const mongoOrgId = toObjectId(organizationId);
  const tagIds: mongoose.Types.ObjectId[] = [];

  for (const item of tags) {
    if (mongoose.Types.ObjectId.isValid(String(item))) {
      tagIds.push(new mongoose.Types.ObjectId(String(item)));
    } else if (typeof item === 'string' && item.trim()) {
      const name = item.trim().toLowerCase().replace(/\s+/g, '-');
      let tag = await Tag.findOne({ organizationId: mongoOrgId, name }).session(session);
      if (!tag) {
        const [newTag] = await Tag.create([{
          name,
          label: item.trim(),
          organizationId: mongoOrgId,
          workspaceId: toObjectId(workspaceId),
          createdBy: toObjectId(organizationId) 
        }], { session });
        tag = newTag;
      }
      if (tag) tagIds.push(tag._id as mongoose.Types.ObjectId);
    }
  }

  const uniqueTagIds = Array.from(new Set(tagIds.map(id => String(id)))).map(id => new mongoose.Types.ObjectId(id));

  await TaskTag.deleteMany({ taskId: mongoTaskId }, { session });

  if (uniqueTagIds.length > 0) {
    const linkDocs = uniqueTagIds.map(tId => ({
      taskId: mongoTaskId,
      tagId: tId,
      organizationId: mongoOrgId
    }));
    await TaskTag.insertMany(linkDocs, { session, ordered: false }).catch(err => {
      if (err.code !== 11000) throw err;
    });
  }
};

const enrichTaskWithAssignees = (task: any, assignees: any[] = []) => {
  const assigneeUsers = assignees
    .map(normalizeAssigneeUser)
    .filter(Boolean);

  return {
    ...task,
    id: String(task._id),
    isDraft: isTaskDraft(task),
    assignees,
    assigneeUsers,
    assigneeId: assigneeUsers[0]?.id,
  };
};

/**
 * Create a new task
 */
export const createTask = async (taskData: Record<string, any>, userId: string, role?: string | null) => {
  const { 
    title, description, projectId, workspaceId, organizationId, 
    status, priority, dueDate,
    assignees = [], assigneeId, assigneeIds = [],
    tags = [],
    visibility = 'PUBLIC',
    visibleToUsers = [],
    isDraft = false
  } = taskData;

  const draftState = Boolean(isDraft || visibility === 'DRAFT');
  const normalizedVisibility = normalizeVisibility(visibility);

  const normalizedAssignees = Array.from(new Set([
    ...(Array.isArray(assignees) ? assignees : []),
    ...(Array.isArray(assigneeIds) ? assigneeIds : []),
    assigneeId
  ].map(id => String(id || '').trim()).filter(Boolean)));

  if (!draftState && !String(title || '').trim()) {
    throw new AppError('Title is required.', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [task] = await Task.create([{
      title: String(title || '').trim(),
      description, 
      projectId: toObjectId(projectId), 
      workspaceId: toObjectId(workspaceId), 
      organizationId,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      dueDate,
      creatorId: userId,
      visibility: normalizedVisibility,
      isDraft: draftState
    }], { session });

    await syncTaskVisibilityUsers(task._id, normalizedVisibility, visibleToUsers, organizationId, session);
    await syncTaskAssignees(task._id, normalizedAssignees, organizationId, userId, session);

    if (tags.length > 0) {
      await syncTags(task._id, tags, organizationId, workspaceId, session);
    }

    await session.commitTransaction();

    if (draftState) {
      return getTaskById(task._id, userId, role);
    }

    const projectName = await resolveProjectName(task.projectId);

    activityLog.logActivity({
      userId, organizationId, workspaceId, projectId,
      resourceId: task._id, resourceType: 'Task', action: 'CREATE',
      metadata: {
        taskId: String(task._id),
        taskTitle: task.title,
        title: task.title,
        projectName,
        newStatus: task.status,
        assignedTo: '-',
        changedFields: ['Title', 'Description', 'Status'],
        timestamp: new Date(),
      }
    });

    if (normalizedAssignees.length > 0) {
      activityLog.triggerNotification({
        userIds: normalizedAssignees, organizationId, actorId: userId,
        type: 'TASK_ASSIGNED', message: `Assigned: ${task.title}`,
        resourceId: task._id, resourceType: 'Task',
        metadata: {
          taskId: String(task._id),
          taskTitle: task.title,
          projectName,
          timestamp: new Date(),
        }
      });
    }

    emitToRoom(SOCKET_ROOMS.WORKSPACE(workspaceId), SOCKET_EVENTS.TASK_CREATED, { taskId: task._id, title: task.title });

    return getTaskById(task._id, userId, role);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getDrafts = async (
  filter: Record<string, any>,
  { page = 1, limit = 10 } = {},
  userId: string,
  role?: string | null
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, any> = buildDraftMatch(
    userId,
    filter.organizationId,
    filter.projectId,
    filter.workspaceId
  );

  if (filter.search) {
    const regex = new RegExp(String(filter.search).trim(), 'i');
    query.$and = [...(query.$and || []), { $or: [{ title: regex }, { description: regex }] }];
  }

  const [drafts, totalCount] = await Promise.all([
    Task.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('projectId', 'name')
      .populate('workspaceId', 'name')
      .populate('creatorId', 'firstName lastName email avatarUrl')
      .lean(),
    Task.countDocuments(query)
  ]);

  if (drafts.length === 0) {
    return { tasks: [], totalCount };
  }

  const taskIds = drafts.map(t => t._id);
  const [assigneeRows, tagRows] = await Promise.all([
    TaskAssignee.find({ taskId: { $in: taskIds } }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: { $in: taskIds } }).populate('tagId').lean()
  ]);

  const assigneesByTaskId = new Map();
  assigneeRows.forEach(row => {
    const existing = assigneesByTaskId.get(String(row.taskId)) || [];
    existing.push(row);
    assigneesByTaskId.set(String(row.taskId), existing);
  });

  const tagsByTaskId = new Map();
  tagRows.forEach((row: any) => {
    const existing = tagsByTaskId.get(String(row.taskId)) || [];
    const normalized = normalizeTags([row]);
    if (normalized.length > 0) existing.push(normalized[0]);
    tagsByTaskId.set(String(row.taskId), existing);
  });

  return {
    tasks: drafts.map(draft => ({
      ...enrichTaskWithAssignees(draft, assigneesByTaskId.get(String(draft._id))),
      creator: normalizeUser(draft.creatorId),
      tags: tagsByTaskId.get(String(draft._id)) || [],
      visibility: draft.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      isDraft: true
    })),
    totalCount
  };
};

export const saveDraft = async (draftData: Record<string, any>, userId: string, role?: string | null) => {
  const {
    draftId,
    title,
    description,
    projectId,
    workspaceId,
    organizationId,
    status,
    priority,
    dueDate,
    assignees = [],
    assigneeId,
    assigneeIds = [],
    tags = [],
    visibility = 'PUBLIC',
    visibleToUsers = []
  } = draftData;

  const normalizedAssignees = Array.from(new Set([
    ...(Array.isArray(assignees) ? assignees : []),
    ...(Array.isArray(assigneeIds) ? assigneeIds : []),
    assigneeId
  ].map(id => String(id || '').trim()).filter(Boolean)));
  const normalizedVisibility = normalizeVisibility(visibility);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let draft = null;

    if (draftId && mongoose.Types.ObjectId.isValid(String(draftId))) {
      draft = await Task.findOne({
        _id: draftId,
        creatorId: toObjectId(userId),
        isActive: true,
        $or: [
          { isDraft: true },
          { visibility: 'DRAFT' }
        ]
      }).session(session);
    }

    if (!draft) {
      draft = await Task.findOne(
        buildDraftMatch(userId, organizationId, projectId ?? null, workspaceId ?? null)
      )
        .sort({ updatedAt: -1, createdAt: -1 })
        .session(session);
    }

    const updatePayload: Record<string, any> = {
      title: String(title || '').trim(),
      description,
      projectId: toObjectId(projectId),
      workspaceId: toObjectId(workspaceId),
      organizationId,
      status: status || draft?.status || 'TODO',
      priority: priority || draft?.priority || 'MEDIUM',
      visibility: normalizedVisibility,
      isDraft: true
    };
    const unsetPayload: Record<string, any> = {};

    if (dueDate) {
      updatePayload.dueDate = dueDate;
    } else {
      unsetPayload.dueDate = 1;
    }

    if (draft) {
      draft = await Task.findOneAndUpdate(
        { _id: draft._id, creatorId: toObjectId(userId), isActive: true },
        {
          $set: updatePayload,
          ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
        },
        { new: true, runValidators: true, session }
      );
    } else {
      const [createdDraft] = await Task.create([{
        ...updatePayload,
        dueDate: dueDate || undefined,
        creatorId: userId
      }], { session });
      draft = createdDraft;
    }

    if (!draft) {
      throw new AppError('Unable to save draft.', 500);
    }

    await syncTaskVisibilityUsers(draft._id, normalizedVisibility, visibleToUsers, organizationId, session);
    await syncTaskAssignees(draft._id, normalizedAssignees, organizationId, userId, session);
    await syncTags(draft._id, Array.isArray(tags) ? tags : [], organizationId, workspaceId, session);

    await session.commitTransaction();

    return getTaskById(draft._id, userId, role);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const publishDraft = async (
  draftId: any,
  publishData: Record<string, any>,
  userId: string,
  role?: string | null
) => {
  const {
    title,
    description,
    projectId,
    workspaceId,
    organizationId,
    status,
    priority,
    dueDate,
    assignees = [],
    assigneeId,
    assigneeIds = [],
    tags = [],
    visibility,
    visibleToUsers = []
  } = publishData;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const draft = await Task.findOne({
      _id: draftId,
      creatorId: toObjectId(userId),
      isActive: true,
      $or: [
        { isDraft: true },
        { visibility: 'DRAFT' }
      ]
    }).session(session);

    if (!draft) {
      throw new AppError('Draft not found.', 404);
    }

    const normalizedAssignees = Array.from(new Set([
      ...(Array.isArray(assignees) ? assignees : []),
      ...(Array.isArray(assigneeIds) ? assigneeIds : []),
      assigneeId
    ].map(id => String(id || '').trim()).filter(Boolean)));

    const finalTitle = String(title ?? draft.title ?? '').trim();
    if (!finalTitle) {
      throw new AppError('Title is required.', 400);
    }

    const normalizedVisibility = normalizeVisibility(
      visibility === 'DRAFT' ? draft.visibility : (visibility || draft.visibility)
    );

    const updatePayload: Record<string, any> = {
      title: finalTitle,
      description: description ?? draft.description,
      projectId: toObjectId(projectId ?? draft.projectId),
      workspaceId: toObjectId(workspaceId ?? draft.workspaceId),
      organizationId: organizationId || draft.organizationId,
      status: status || draft.status || 'TODO',
      priority: priority || draft.priority || 'MEDIUM',
      visibility: normalizedVisibility,
      isDraft: false
    };
    const unsetPayload: Record<string, any> = {};

    if (dueDate) {
      updatePayload.dueDate = dueDate;
    } else {
      unsetPayload.dueDate = 1;
    }

    const publishedTask = await Task.findOneAndUpdate(
      { _id: draft._id, creatorId: toObjectId(userId), isActive: true },
      {
        $set: updatePayload,
        ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
      },
      { new: true, runValidators: true, session }
    );

    if (!publishedTask) {
      throw new AppError('Draft not found.', 404);
    }

    await syncTaskVisibilityUsers(
      publishedTask._id,
      normalizedVisibility,
      Array.isArray(visibleToUsers) ? visibleToUsers : [],
      publishedTask.organizationId,
      session
    );
    await syncTaskAssignees(
      publishedTask._id,
      normalizedAssignees,
      publishedTask.organizationId,
      userId,
      session
    );
    await syncTags(
      publishedTask._id,
      Array.isArray(tags) ? tags : [],
      publishedTask.organizationId,
      publishedTask.workspaceId,
      session
    );

    await session.commitTransaction();

    const projectName = await resolveProjectName(publishedTask.projectId);

    activityLog.logActivity({
      userId,
      organizationId: publishedTask.organizationId,
      workspaceId: publishedTask.workspaceId,
      projectId: publishedTask.projectId,
      resourceId: publishedTask._id,
      resourceType: 'Task',
      action: 'CREATE',
      metadata: {
        taskId: String(publishedTask._id),
        taskTitle: publishedTask.title,
        title: publishedTask.title,
        projectName,
        newStatus: publishedTask.status,
        assignedTo: '-',
        changedFields: ['Title', 'Description', 'Status'],
        timestamp: new Date(),
      }
    });

    if (normalizedAssignees.length > 0) {
      activityLog.triggerNotification({
        userIds: normalizedAssignees,
        organizationId: publishedTask.organizationId,
        actorId: userId,
        type: 'TASK_ASSIGNED',
        message: `Assigned: ${publishedTask.title}`,
        resourceId: publishedTask._id,
        resourceType: 'Task',
        metadata: {
          taskId: String(publishedTask._id),
          taskTitle: publishedTask.title,
          projectName,
          timestamp: new Date(),
        }
      });
    }

    emitToRoom(
      SOCKET_ROOMS.WORKSPACE(publishedTask.workspaceId),
      SOCKET_EVENTS.TASK_CREATED,
      { taskId: publishedTask._id, title: publishedTask.title }
    );

    return getTaskById(publishedTask._id, userId, role);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteDraft = async (draftId: any, userId: string) => {
  const draft = await Task.findOne({
    _id: draftId,
    creatorId: toObjectId(userId),
    isActive: true,
    $or: [
      { isDraft: true },
      { visibility: 'DRAFT' }
    ]
  });

  if (!draft) {
    throw new AppError('Draft not found.', 404);
  }

  draft.isActive = false;
  await draft.save();

  return { success: true };
};

/**
 * Get tasks
 */
export const getTasks = async (filter: Record<string, any>, { page = 1, limit = 10 } = {}, userId?: string, userRole?: string | null) => {
  const skip = (page - 1) * limit;
  const query: Record<string, any> = {
    isActive: true,
    $and: [
      { $or: [{ isDraft: { $exists: false } }, { isDraft: false }] },
      { $or: [{ visibility: { $exists: false } }, { visibility: { $ne: 'DRAFT' } }] }
    ]
  };

  const orgId = toObjectId(filter.organizationId);
  if (orgId) query.organizationId = orgId;

  if (filter.workspaceId) query.workspaceId = toObjectId(filter.workspaceId);
  if (filter.projectId) query.projectId = toObjectId(filter.projectId);
  if (filter.status) query.status = filter.status;
  if (filter.priority) query.priority = filter.priority;
  if (filter.visibility) query.visibility = filter.visibility;
  if (filter.dueDate) query.dueDate = { $lte: new Date(filter.dueDate) };
  if (filter.search) {
    const regex = new RegExp(String(filter.search).trim(), 'i');
    query.$or = [{ title: regex }, { description: regex }];
  }

  if (filter.assigneeId === "UNASSIGNED") {
    // Find all task IDs that HAVE assignees in this organization
    const assignedTIds = await TaskAssignee.find({ organizationId: query.organizationId }).distinct('taskId');
    // Filter tasks that ARE NOT in that list
    query._id = { $nin: assignedTIds };
  } else if (filter.assigneeId) {
    const tIds = await TaskAssignee.find({ userId: toObjectId(filter.assigneeId) }).distinct('taskId');
    query._id = { $in: tIds };
  }

  if (filter.creatorOrAssigneeId) {
    const userId = toObjectId(filter.creatorOrAssigneeId);
    const assignedTIds = await TaskAssignee.find({ userId }).distinct("taskId");
    query.$or = [
      { creatorId: userId },
      { _id: { $in: assignedTIds } }
    ];
  }

  if (filter.tagIds && Array.isArray(filter.tagIds) && filter.tagIds.length > 0) {
    const tagIds = filter.tagIds.map(toObjectId).filter(Boolean);
    const tasksWithTags = await TaskTag.aggregate([
      { $match: { tagId: { $in: tagIds }, organizationId: query.organizationId } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } },
      { $match: { count: tagIds.length } }
    ]);
    const matchedIds = tasksWithTags.map(t => t._id);
    if (query._id) query._id.$in = query._id.$in.filter((id: any) => matchedIds.some(m => String(m) === String(id)));
    else query._id = { $in: matchedIds };
  }

  // Apply visibility filtering
  let tasks: any[] = [];
  let totalCount: number = 0;

  if (userId) {
    // Use aggregation pipeline for visibility enforcement
    const pipeline: any[] = [
      { $match: query },
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
                    { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] }
                  ]
                }
              }
            }
          ],
          as: 'visibilityAccess'
        }
      }
    ];

    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      pipeline.push({
        $match: {
          $or: [
            { visibility: 'PUBLIC' },
            { visibility: null },
            { visibility: { $exists: false } },
            {
              $and: [
                { visibility: 'PRIVATE' },
                {
                  $or: [
                    { creatorId: new mongoose.Types.ObjectId(userId) },
                    { visibilityAccess: { $size: 1 } }
                  ]
                }
              ]
            }
          ]
        }
      });
    }

    pipeline.push(
      { $sort: { position: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'projectId'
        }
      },
      { $unwind: { path: '$projectId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'workspaces',
          localField: 'workspaceId',
          foreignField: '_id',
          as: 'workspaceId'
        }
      },
      { $unwind: { path: '$workspaceId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: '_id',
          as: 'creatorId'
        }
      },
      { $unwind: { path: '$creatorId', preserveNullAndEmptyArrays: true } }
    );

    const skipIndex = pipeline.findIndex(p => '$skip' in p);
    const countPipeline = skipIndex !== -1 ? pipeline.slice(0, skipIndex) : [...pipeline];
    countPipeline.push({ $count: 'count' });

    const [countResult, taskResults] = await Promise.all([
      Task.aggregate(countPipeline),
      Task.aggregate(pipeline)
    ]);

    totalCount = countResult[0]?.count || 0;
    tasks = taskResults;
  } else {
    // No user specified - return only public, non-draft tasks.
    query.$or = [{ visibility: 'PUBLIC' }, { visibility: { $exists: false } }];
    
    const [fetchedTasks, count] = await Promise.all([
      Task.find(query).sort({ position: 1, createdAt: -1 }).skip(skip).limit(limit)
        .populate('projectId', 'name').populate('workspaceId', 'name').populate('creatorId', 'firstName lastName email avatarUrl').lean(),
      Task.countDocuments(query)
    ]);
    
    tasks = fetchedTasks;
    totalCount = count;
  }

  if (tasks.length === 0) return { tasks, totalCount };

  const taskIds = tasks.map(t => t._id);
  const [assigneeRows, tagRows] = await Promise.all([
    TaskAssignee.find({ taskId: { $in: taskIds } }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: { $in: taskIds } }).populate('tagId').lean()
  ]);

  const assigneesByTaskId = new Map();
  assigneeRows.forEach(row => {
    const existing = assigneesByTaskId.get(String(row.taskId)) || [];
    existing.push(row);
    assigneesByTaskId.set(String(row.taskId), existing);
  });

  const tagsByTaskId = new Map();
  tagRows.forEach((row: any) => {
    const existing = tagsByTaskId.get(String(row.taskId)) || [];
    const normalized = normalizeTags([row]);
    if (normalized.length > 0) existing.push(normalized[0]);
    tagsByTaskId.set(String(row.taskId), existing);
  });

  return {
    tasks: tasks.map(t => ({
      ...enrichTaskWithAssignees(t, assigneesByTaskId.get(String(t._id))),
      creator: normalizeUser(t.creatorId),
      tags: tagsByTaskId.get(String(t._id)) || [],
      visibility: t.visibility || 'PUBLIC'
    })),
    totalCount
  };
};

/**
 * Update task
 */
export const updateTask = async (taskId: any, updateData: Record<string, any>, userId: any, role?: string | null) => {
  const { assigneeId, assigneeIds, tags, visibility, visibleToUsers, ...otherData } = updateData;
  const previousTask = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!previousTask) throw new AppError('Task not found.', 404);
  ensureDraftOwner(previousTask, userId);

  // Check permissions: only creator or admin can change visibility
  const isCreator = String(previousTask.creatorId) === String(userId);
  const isAdmin = isAdminRole(role);

  if (visibility && !isCreator && !isAdmin) {
    throw new AppError('Only creator or admin can change task visibility.', 403);
  }

  const updatePayload: Record<string, any> = { ...otherData };
  const unsetPayload: Record<string, any> = {};
  if (visibility) {
    updatePayload.visibility = normalizeVisibility(visibility);
  }
  if (Object.prototype.hasOwnProperty.call(otherData, 'dueDate') && !otherData.dueDate) {
    unsetPayload.dueDate = 1;
    delete updatePayload.dueDate;
  }
  const task = await Task.findOneAndUpdate(
    { _id: taskId, isActive: true },
    {
      $set: updatePayload,
      ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
    },
    { new: true }
  );
  if (!task) throw new AppError('Task not found.', 404);
  const draftState = isTaskDraft(task) || isTaskDraft(previousTask);

  // Handle visibility users update
  if (visibility === 'PRIVATE' && visibleToUsers) {
    await visibilityHelpers.clearTaskVisibilityUsers(taskId);
    if (Array.isArray(visibleToUsers) && visibleToUsers.length > 0) {
      await visibilityHelpers.addTaskVisibilityUsers(taskId, visibleToUsers, task.organizationId);
    }
  } else if (visibility && visibility !== 'PRIVATE') {
    // Clear visibility users if changing from private to public/draft
    await visibilityHelpers.clearTaskVisibilityUsers(taskId);
  }

  const projectName = await resolveProjectName(task.projectId);
  const changedFields = Object.keys(updateData);
  const statusUpdated =
    Object.prototype.hasOwnProperty.call(updateData, 'status') &&
    String(previousTask.status || '') !== String(task.status || '');

  if (Array.isArray(tags)) {
    await syncTags(taskId, tags, task.organizationId, task.workspaceId);
  }

  const normalizedAssigneeIds = Array.from(new Set([
    ...(Array.isArray(assigneeIds) ? assigneeIds : []),
    assigneeId
  ].map(id => String(id || '').trim()).filter(Boolean)));

  const shouldSyncAssignees =
    Array.isArray(assigneeIds) || Object.prototype.hasOwnProperty.call(updateData, 'assigneeId');

  if (shouldSyncAssignees) {
    await syncTaskAssignees(taskId, normalizedAssigneeIds, task.organizationId, userId);
  }

  if (!draftState && normalizedAssigneeIds.length > 0) {
    activityLog.triggerNotification({
      userIds: normalizedAssigneeIds,
      organizationId: task.organizationId,
      actorId: userId,
      type: 'TASK_ASSIGNED',
      message: `Assigned: ${task.title}`,
      resourceId: taskId,
      resourceType: 'Task',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        projectName,
        timestamp: new Date(),
      }
    });
  }

  if (!draftState) {
    activityLog.logActivity({
      userId, organizationId: task.organizationId, workspaceId: task.workspaceId,
      projectId: task.projectId,
      resourceId: taskId,
      resourceType: 'TASK',
      action: statusUpdated ? 'STATUS_CHANGE' : 'UPDATE',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        title: task.title,
        projectName,
        oldStatus: previousTask.status,
        newStatus: task.status,
        updatedFields: changedFields,
        changedFields,
        timestamp: new Date(),
      }
    });
  }

  return getTaskById(taskId, userId, role);
};

export const getTaskById = async (taskId: any, userId?: string, userRole?: string | null) => {
  const task = await Task.findOne({ _id: taskId, isActive: true })
    .populate('projectId', 'name').populate('workspaceId', 'name').populate('creatorId', 'firstName lastName email avatarUrl').lean();
  if (!task) throw new AppError('Task not found.', 404);

  // Check visibility if userId provided
  if (userId) {
    const hasAccess = await visibilityHelpers.canUserAccessTask(
      task._id,
      userId,
      task.creatorId?._id || task.creatorId,
      task.visibility,
      userRole,
      isTaskDraft(task)
    );
    if (!hasAccess) {
      throw new AppError('Access denied to this task.', 403);
    }
  }

  const [assignees, tags, visibilityUsers] = await Promise.all([
    TaskAssignee.find({ taskId: task._id }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: task._id }).populate('tagId').lean(),
    task.visibility === 'PRIVATE' ? visibilityHelpers.getTaskVisibilityUsers(task._id, task.organizationId) : Promise.resolve([])
  ]);

  return { 
    ...enrichTaskWithAssignees(task, assignees), 
    creator: normalizeUser(task.creatorId), 
    tags: normalizeTags(tags),
    visibility: task.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
    visibilityUsers: visibilityUsers.map((vu: any) => ({
      id: String(vu.userId?._id || vu.userId),
      name: vu.userId?.firstName ? `${vu.userId.firstName} ${vu.userId.lastName || ''}`.trim() : 'Unknown',
      email: vu.userId?.email,
      avatarUrl: vu.userId?.avatarUrl
    }))
  };
};

export const deleteTask = async (taskId: any, userId: any) => {
  const existingTask = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!existingTask) throw new AppError('Task not found.', 404);
  ensureDraftOwner(existingTask, userId);

  const task = await Task.findOneAndUpdate({ _id: taskId, isActive: true }, { $set: { isActive: false } });
  if (!task) throw new AppError('Task not found.', 404);

  if (isTaskDraft(task)) {
    return;
  }

  const projectName = await resolveProjectName(task.projectId);
  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: taskId,
    resourceType: 'Task',
    action: 'DELETE',
    metadata: {
      taskId: String(taskId),
      taskTitle: task.title,
      title: task.title,
      projectName,
      timestamp: new Date(),
    }
  });
};

export const changeStatus = async (taskId: any, newStatus: any, userId: any) => {
  const previousTask = await Task.findOne({ _id: taskId }).lean();
  if (!previousTask) throw new AppError('Task not found.', 404);
  ensureDraftOwner(previousTask, userId);

  const task = await Task.findOneAndUpdate({ _id: taskId }, { $set: { status: newStatus } }, { new: true });
  if (!task) throw new AppError('Task not found.', 404);

  if (isTaskDraft(task)) {
    return task;
  }

  const projectName = await resolveProjectName(task.projectId);
  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: task._id,
    resourceType: 'Task',
    action: 'STATUS_CHANGE',
    metadata: {
      taskId: String(task._id),
      taskTitle: task.title,
      title: task.title,
      projectName,
      oldStatus: previousTask.status,
      newStatus,
      timestamp: new Date(),
    }
  });

  return task;
};

export const assignUsers = async (taskId: any, userIds: any[], actorId: any, role?: string | null) => {
  const task = await Task.findOne({ _id: taskId });
  if (!task) throw new AppError('Task not found.', 404);
  ensureDraftOwner(task, actorId);
  const projectName = await resolveProjectName(task.projectId);
  await TaskAssignee.deleteMany({ taskId });
  await TaskAssignee.insertMany(userIds.map(uId => ({ taskId, userId: uId, organizationId: task.organizationId, assignedById: actorId })));

  if (isTaskDraft(task)) {
    return { success: true };
  }

  if (userIds.length > 0) {
    activityLog.triggerNotification({
      userIds,
      organizationId: task.organizationId,
      actorId,
      type: 'TASK_ASSIGNED',
      message: `Assigned: ${task.title}`,
      resourceId: taskId,
      resourceType: 'Task',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        projectName,
        timestamp: new Date(),
      }
    });
  }

  return { success: true };
};

/**
 * Add users to a private task's visibility list
 */
export const addTaskVisibilityUsers = async (taskId: any, userIds: string[], actorId: any, role?: string | null) => {
  const task = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!task) throw new AppError('Task not found.', 404);
  ensureDraftOwner(task, actorId);

  // Check permissions: only creator or admin can manage visibility
  const isCreator = String(task.creatorId) === String(actorId);
  const isAdmin = isAdminRole(role);

  if (!isCreator && !isAdmin) {
    throw new AppError('Only creator or admin can manage task visibility.', 403);
  }

  if (task.visibility !== 'PRIVATE') {
    throw new AppError('Can only add users to private tasks.', 400);
  }

  await visibilityHelpers.addTaskVisibilityUsers(taskId, userIds, task.organizationId);
};

/**
 * Remove users from a private task's visibility list
 */
export const removeTaskVisibilityUsers = async (taskId: any, userIds: string[], actorId: any, role?: string | null) => {
  const task = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!task) throw new AppError('Task not found.', 404);
  ensureDraftOwner(task, actorId);

  // Check permissions: only creator or admin can manage visibility
  const isCreator = String(task.creatorId) === String(actorId);
  const isAdmin = isAdminRole(role);

  if (!isCreator && !isAdmin) {
    throw new AppError('Only creator or admin can manage task visibility.', 403);
  }

  await visibilityHelpers.removeTaskVisibilityUsers(taskId, userIds);
};
