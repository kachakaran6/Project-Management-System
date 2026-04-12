import Comment from '../../models/Comment.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';

type SearchType = 'all' | 'projects' | 'tasks' | 'users' | 'messages';

type SearchResult = {
  id: string;
  type: 'project' | 'task' | 'user' | 'message';
  title: string;
  subtitle?: string;
  href: string;
  createdAt?: string;
  matchedText?: string;
};

type SearchResponse = {
  projects: SearchResult[];
  tasks: SearchResult[];
  users: SearchResult[];
  messages: SearchResult[];
  meta: {
    totalItems: number;
  };
};

function sanitizeQuery(raw: unknown) {
  const value = String(raw || '').trim();
  if (!value) return '';

  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 120);
}

function buildRegex(query: string) {
  return new RegExp(query, 'i');
}

function toObjectIdList(value: unknown[]): string[] {
  return value.map((item) => String(item));
}

function highlightText(value: string, query: string) {
  if (!query) return value;
  const regex = new RegExp(`(${query})`, 'i');
  return value.replace(regex, '[[[$1]]]');
}

function normalizeType(type?: unknown): SearchType {
  const candidate = String(type || 'all').toLowerCase();
  if (candidate === 'projects' || candidate === 'tasks' || candidate === 'users' || candidate === 'messages') {
    return candidate;
  }
  return 'all';
}

function shouldInclude(type: SearchType, target: SearchType) {
  return type === 'all' || type === target;
}

/**
 * Perform an org-scoped global search across projects, tasks, users and messages.
 */
export const searchGlobal = async (
  query: unknown,
  organizationId: unknown,
  type?: unknown,
  role?: unknown,
): Promise<SearchResponse> => {
  const sanitizedQuery = sanitizeQuery(query);
  const searchType = normalizeType(type);
  const isSuperAdmin = String(role || '').toUpperCase() === 'SUPER_ADMIN';

  if (!sanitizedQuery) {
    return { projects: [], tasks: [], users: [], messages: [], meta: { totalItems: 0 } };
  }

  if (!organizationId) {
    throw new AppError('Organization context is required for search.', 400);
  }

  const regex = buildRegex(sanitizedQuery);
  const orgId = String(organizationId);

  const [memberIds] = await Promise.all([
    OrganizationMember.find({ organizationId: orgId, isActive: true }).distinct('userId'),
  ]);

  const userIdList = toObjectIdList(memberIds as unknown[]);

  const [projectDocs, taskDocs, userDocs, commentDocs] = await Promise.all([
    shouldInclude(searchType, 'projects')
      ? Project.find({
          organizationId: orgId,
          isActive: true,
          $or: [
            { name: regex },
            { description: regex },
          ],
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .select('name description status createdAt updatedAt')
        .lean()
      : Promise.resolve([]),
    shouldInclude(searchType, 'tasks')
      ? Task.find({
          organizationId: orgId,
          isActive: true,
          $or: [
            { title: regex },
            { description: regex },
          ],
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .populate('projectId', 'name')
        .select('title description status priority createdAt updatedAt projectId')
        .lean()
      : Promise.resolve([]),
    shouldInclude(searchType, 'users') && userIdList.length > 0
      ? User.find({
          _id: { $in: userIdList },
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex },
          ],
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .select('firstName lastName email avatarUrl role createdAt updatedAt')
        .lean()
      : Promise.resolve([]),
    shouldInclude(searchType, 'messages')
      ? Comment.find({
          organizationId: orgId,
          content: regex,
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .populate('taskId', 'title')
        .populate('authorId', 'firstName lastName email avatarUrl')
        .select('content createdAt taskId authorId')
        .lean()
      : Promise.resolve([]),
  ]);

  const projects = projectDocs.map((project: any) => ({
    id: String(project._id),
    type: 'project' as const,
    title: project.name,
    subtitle: project.description || project.status || 'Project',
    href: `/projects/${project._id}`,
    createdAt: project.createdAt,
    matchedText: highlightText(`${project.name} ${project.description || ''}`, sanitizedQuery),
  }));

  const tasks = taskDocs.map((task: any) => ({
    id: String(task._id),
    type: 'task' as const,
    title: task.title,
    subtitle: task.projectId?.name ? `Project: ${task.projectId.name}` : task.priority || task.status,
    href: `/tasks/${task._id}`,
    createdAt: task.createdAt,
    matchedText: highlightText(`${task.title} ${task.description || ''}`, sanitizedQuery),
  }));

  const users = userDocs.map((user: any) => ({
    id: String(user._id),
    type: 'user' as const,
    title: `${user.firstName} ${user.lastName}`.trim() || user.email,
    subtitle: user.email,
    href: isSuperAdmin ? `/admin/users` : `/team`,
    createdAt: user.createdAt,
    matchedText: highlightText(`${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`, sanitizedQuery),
  }));

  const messages = commentDocs.map((comment: any) => ({
    id: String(comment._id),
    type: 'message' as const,
    title: comment.taskId?.title ? `Comment on ${comment.taskId.title}` : 'Comment',
    subtitle: comment.authorId?.email || comment.content,
    href: `/tasks/${comment.taskId?._id || comment.taskId}`,
    createdAt: comment.createdAt,
    matchedText: highlightText(comment.content, sanitizedQuery),
  }));

  return {
    projects,
    tasks,
    users,
    messages,
    meta: {
      totalItems: projects.length + tasks.length + users.length + messages.length,
    },
  };
};
