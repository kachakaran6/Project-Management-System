import crypto from 'crypto';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Status from '../../models/Status.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import GithubAccount from '../../models/GithubAccount.js';
import GithubRepository from '../../models/GithubRepository.js';
import GithubActivity from '../../models/GithubActivity.js';
import { env } from '../../config/env.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import { logStatusChange } from '../../utils/statusHistoryTriggers.js';
import { emitToRoom } from '../../realtime/socket.server.js';
import { SOCKET_EVENTS } from '../../realtime/socket.events.js';
import { NOTIFICATION_TYPES } from '../../constants/index.js';

export const verifySignature = (payload: string, signature: string, secret: string) => {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch (err) {
    return false;
  }
};

export const extractTaskIds = (text: string) => {
  if (!text) return [];
  const regex = /([A-Z0-9]+-\d+)/gi;
  const matches = text.match(regex);
  return matches ? Array.from(new Set(matches.map(m => m.toUpperCase()))) : [];
};

/**
 * SECTION 1: User-Level Account Management
 */
export const getConnectUrl = (userId: string) => {
  const rootUrl = 'https://github.com/login/oauth/authorize';
  const options = {
    client_id: env.githubClientId || '',
    redirect_uri: `${env.frontendUrl}/oauth/callback/github`,
    scope: 'repo,read:user,user:email',
    state: `connect_user_${userId}`, // Use a prefixed state to distinguish from login
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
};

export const handleOAuthCallback = async (code: string, userId: string) => {
  // 1. Exchange code for token
  const tokenUrl = 'https://github.com/login/oauth/access_token';
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json' 
    },
    body: JSON.stringify({
      code,
      client_id: env.githubClientId || '',
      client_secret: env.githubClientSecret || '',
      redirect_uri: `${env.frontendUrl}/oauth/callback/github`,
    }),
  });

  const tokenData = await tokenResponse.json() as any;
  if (!tokenData.access_token) {
    throw new Error('Failed to exchange code for GitHub token.');
  }

  // 2. Fetch user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const profile = await userResponse.json() as any;

  // 3. Store or Update GithubAccount
  const encryptedToken = encrypt(tokenData.access_token);
  
  const account = await GithubAccount.findOneAndUpdate(
    { userId },
    {
      githubUserId: profile.id.toString(),
      username: profile.login,
      accessToken: encryptedToken,
      avatarUrl: profile.avatar_url,
      email: profile.email,
      lastSyncedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return account;
};

export const getAccount = async (userId: string) => {
  const account = await GithubAccount.findOne({ userId }).lean();
  if (!account) return null;
  
  // Don't return the token
  const { accessToken, ...safeAccount } = account as any;
  return safeAccount;
};

export const getInternalAccount = async (userId: string) => {
  return await GithubAccount.findOne({ userId });
};

export const disconnectAccount = async (userId: string) => {
  return await GithubAccount.deleteOne({ userId });
};

/**
 * SECTION 2: Repository Management
 */
export const listUserRepositories = async (userId: string) => {
  const account = await GithubAccount.findOne({ userId });
  if (!account) throw new Error('GitHub account not connected');

  const token = decrypt(account.accessToken);
  
  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
    headers: { 
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) throw new Error('Failed to fetch repositories from GitHub');
  
  return await response.json();
};

export const linkRepository = async (
  userId: string, 
  workspaceId: string, 
  repoData: any,
  projectId?: string,
  branch?: string,
  permissions?: string
) => {
  const account = await GithubAccount.findOne({ userId });
  if (!account) throw new Error('GitHub account not connected');

  const token = decrypt(account.accessToken);
  const webhookSecret = crypto.randomBytes(20).toString('hex');

  // Normalize repo data (handle both GitHub API format and our internal legacy format)
  const repoName = repoData.name || repoData.repoName;
  const ownerLogin = repoData.owner?.login || repoData.owner;

  if (!repoName || !ownerLogin) {
    throw new Error('Invalid repository data: Missing name or owner');
  }

  // 1. Create Webhook on GitHub
  // We need to point this to the BACKEND API. 
  // If env.frontendUrl is set, we try to derive the API URL, but it's safer to have a dedicated API_URL env.
  const baseUrl = env.frontendUrl || 'http://localhost:5173';
  // Attempt to point to 5001 (default backend port) if we are on localhost
  let webhookUrl = `${baseUrl}/api/v1/github/webhook`;
  if (baseUrl.includes('localhost')) {
    webhookUrl = 'http://localhost:5001/api/v1/github/webhook';
  }
  
  const response = await fetch(`https://api.github.com/repos/${ownerLogin}/${repoName}/hooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['push', 'pull_request', 'create'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: webhookSecret,
        insecure_ssl: '0'
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    // If webhook already exists, we might get a 422. We can ignore that and proceed.
    if (response.status !== 422) {
      throw new Error(`Failed to create GitHub webhook: ${errorBody.message || 'Unknown error'}`);
    }
  }

  const webhook = response.status === 422 ? { id: 'existing' } : await response.json();

  // 2. Save GithubRepository in DB
  const linkedRepo = await GithubRepository.findOneAndUpdate(
    { workspaceId, fullName: `${ownerLogin}/${repoName}` },
    {
      repoName: repoName,
      fullName: `${ownerLogin}/${repoName}`,
      owner: ownerLogin,
      repoId: repoData.id?.toString() || repoData.repoId?.toString(),
      webhookId: webhook.id.toString(),
      webhookSecret: webhookSecret,
      isWebhookActive: true,
      lastSyncAt: new Date(),
      projectId: projectId || undefined,
      branch: branch || 'main',
      permissions: permissions || 'read'
    },
    { upsert: true, new: true }
  );

  return linkedRepo;
};

export const listWorkspaceRepositories = async (workspaceId: string) => {
  // 1. Get official linked repos
  const linkedRepos = await GithubRepository.find({ workspaceId })
    .populate('projectId', 'name code')
    .sort({ createdAt: -1 });
  
  // 2. Look for legacy project settings that aren't "officially" linked yet
  const projectsWithGithub = await Project.find({ 
    $or: [
      { workspaceId: workspaceId },
      { organizationId: workspaceId }
    ],
    'githubSettings.repoUrl': { $exists: true, $ne: '' }
    // Removed isEnabled check to show even if auto-sync is off
  });

  const legacyRepos = projectsWithGithub.map(p => {
    // Check if this repo is already officially linked
    const url = p.githubSettings?.repoUrl || '';
    const name = url.split('/').filter(Boolean).pop() || 'Unknown';
    const fullName = url.replace('https://github.com/', '').replace(/\/$/, '');
    const owner = fullName.split('/')[0];

    const isAlreadyLinked = linkedRepos.some(lr => lr.fullName === fullName);
    if (isAlreadyLinked) return null;

    return {
      id: `legacy_${p._id}`,
      repoId: `legacy_${p._id}`,
      repoName: name,
      fullName: fullName,
      owner: owner,
      isWebhookActive: true, // Assume active if legacy settings exist
      lastSyncAt: p.updatedAt,
      isLegacy: true,
      projectId: p._id
    };
  }).filter(Boolean);

  return [...linkedRepos, ...legacyRepos];
};

export const unlinkRepository = async (userId: string, repoId: string) => {
  const repo = await GithubRepository.findById(repoId);
  if (!repo) throw new Error('Repository link not found');

  const account = await GithubAccount.findOne({ userId });
  if (account) {
    const token = decrypt(account.accessToken);
    // Attempt to delete webhook from GitHub (optional, don't fail if repo was deleted)
    await fetch(`https://api.github.com/repos/${repo.fullName}/hooks/${repo.webhookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(err => console.warn('Failed to delete GitHub webhook:', err.message));
  }

  return await GithubRepository.deleteOne({ _id: repoId });
};

/**
 * SECTION 3: Activity Tracking (Existing logic updated)
 */
/**
 * Helper to find projects/workspace for a repo name (supports legacy and official links)
 */
/**
 * Helper to find all projects that might be related to a GitHub repository
 */
async function getRelatedProjects(repoFullName: string, payloadRepoId?: string) {
  // 1. Find projects via official links
  const linkedRepos = await GithubRepository.find({ 
    $or: [
      { fullName: repoFullName },
      { repoId: payloadRepoId?.toString() }
    ]
  });
  
  // Get explicit projectIds linked to these repositories
  const explicitProjectIds = linkedRepos.map(lr => lr.projectId).filter(Boolean);

  // 2. Find projects via legacy settings
  const legacyProjects = await Project.find({ 
    'githubSettings.repoUrl': { $regex: new RegExp(repoFullName, 'i') },
    isActive: true
  });
  const legacyProjectIds = legacyProjects.map(p => p._id);

  // 3. Fallback: if no project is explicitly linked to the repo, check workspace-level matching
  let projectIds = [...explicitProjectIds, ...legacyProjectIds];
  
  if (projectIds.length === 0) {
    const linkedWorkspaceIds = linkedRepos.map(lr => lr.workspaceId);
    const fallbackProjects = await Project.find({
      $or: [
        { workspaceId: { $in: linkedWorkspaceIds }, isActive: true },
        { organizationId: { $in: linkedWorkspaceIds }, isActive: true }
      ],
      isActive: true
    });
    projectIds = fallbackProjects.map(p => p._id);
  }

  return await Project.find({
    _id: { $in: projectIds },
    isActive: true
  });
}

export const processPushEvent = async (payload: any) => {
  const repoFullName = payload.repository.full_name;
  console.log(`[GitHub] Processing PUSH for ${repoFullName}`);
  
  const projects = await getRelatedProjects(repoFullName, payload.repository.id);
  if (!projects.length) {
    console.warn(`[GitHub] No projects found for ${repoFullName}`);
    return;
  }

  for (const commit of (payload.commits || [])) {
    const taskIds = extractTaskIds(commit.message);
    if (!taskIds.length) continue;

    console.log(`[GitHub] Found Task IDs in commit: ${taskIds.join(', ')}`);
    await linkToTasks(taskIds, {
      type: 'commit',
      url: commit.url,
      message: commit.message,
      author: commit.author.name,
      authorAvatar: payload.sender?.avatar_url,
      hash: commit.id.substring(0, 7),
      createdAt: new Date(commit.timestamp)
    }, 'COMMIT', projects, { message: commit.message });
    
    // Also log activity to the first project's workspace as a general feed
    await GithubActivity.create({
      workspaceId: projects[0].organizationId || projects[0].workspaceId,
      type: 'commit',
      githubRepoId: payload.repository.id.toString(),
      referenceId: commit.id.substring(0, 7),
      author: { username: commit.author.username || commit.author.name, avatarUrl: payload.sender?.avatar_url },
      message: commit.message,
      url: commit.url,
      createdAt: new Date(commit.timestamp)
    }).catch(err => console.error('[GitHub] Activity log failed:', err.message));
  }
};

export const processCreateEvent = async (payload: any) => {
  if (payload.ref_type !== 'branch') return;

  const repoFullName = payload.repository.full_name;
  const branchName = payload.ref;
  console.log(`[GitHub] Processing BRANCH_CREATE: ${branchName} in ${repoFullName}`);

  const projects = await getRelatedProjects(repoFullName, payload.repository.id);
  if (!projects.length) return;

  const taskIds = extractTaskIds(branchName);
  if (taskIds.length) {
    console.log(`[GitHub] Found Task IDs in branch: ${taskIds.join(', ')}`);
    await linkToTasks(taskIds, {
      type: 'branch',
      url: `${payload.repository.html_url}/tree/${branchName}`,
      message: `Branch created: ${branchName}`,
      author: payload.sender?.login || 'Unknown',
      authorAvatar: payload.sender?.avatar_url,
      hash: branchName,
      createdAt: new Date()
    }, 'BRANCH_CREATED', projects);
  }
};

export const processPullRequestEvent = async (payload: any) => {
  const repoFullName = payload.repository.full_name;
  const projects = await getRelatedProjects(repoFullName, payload.repository.id);
  if (!projects.length) return;

  const pr = payload.pull_request;
  const action = payload.action;
  const isMerged = action === 'closed' && pr.merged === true;
  const trigger = isMerged ? 'PR_MERGED' : (action === 'opened' || action === 'reopened' ? 'PR_OPENED' : 'PR_UPDATED');

  console.log(`[GitHub] Processing PR #${pr.number} (${action}) in ${repoFullName}`);

  const combinedText = `${pr.title} ${pr.body || ''}`;
  const taskIds = extractTaskIds(combinedText);
  if (taskIds.length) {
    await linkToTasks(taskIds, {
      type: 'pr',
      url: pr.html_url,
      message: `${isMerged ? '[Merged]' : `[${pr.state.toUpperCase()}]`} ${pr.title}`,
      author: pr.user.login,
      authorAvatar: pr.user.avatar_url,
      hash: `#${pr.number}`,
      createdAt: new Date(pr.updated_at || pr.created_at)
    }, trigger, projects);
  }
};

export const getWorkspaceActivity = async (workspaceId: string, limit = 50) => {
  // 1. Get new activity records
  const officialActivity = await GithubActivity.find({ workspaceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // 2. Get legacy activity from tasks (to support existing data)
  const projects = await Project.find({ 
    $or: [{ workspaceId }, { organizationId: workspaceId }] 
  }).select('_id').lean();
  const projectIds = projects.map(p => p._id);

  const tasksWithLinks = await Task.find({ 
    projectId: { $in: projectIds },
    'githubLinks.0': { $exists: true }
  }).select('githubLinks taskCode').lean();

  const legacyActivity: any[] = [];
  tasksWithLinks.forEach(task => {
    (task.githubLinks as any[]).forEach(link => {
      legacyActivity.push({
        workspaceId,
        type: link.type === 'pr' ? (link.message.includes('Merged') ? 'pr_merged' : 'pr_opened') : 'commit',
        githubRepoId: 'legacy',
        referenceId: link.hash || task.taskCode,
        author: {
          username: link.author || 'User',
          avatarUrl: link.authorAvatar || ''
        },
        message: `${task.taskCode}: ${link.message}`,
        url: link.url,
        createdAt: new Date(link.createdAt),
        isLegacy: true
      });
    });
  });

  // Combine, sort and limit
  const combined = [...officialActivity, ...legacyActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return combined;
};

const linkToTasks = async (taskIds: string[], link: any, trigger: string, projects: any[], options: { message?: string } = {}) => {
  const projectIds = projects.map(p => p._id);
  console.log(`[GitHub] Attempting to link to ${taskIds.length} tasks in ${projectIds.length} projects`);
  
  for (const taskId of taskIds) {
    // Case-insensitive search for task code
    const task = await Task.findOne({ 
      taskCode: { $regex: new RegExp(`^${taskId}$`, 'i') }, 
      projectId: { $in: projectIds },
      isActive: true
    }).populate('status');
    
    if (!task) {
      console.warn(`[GitHub] Task ${taskId} not found in current project scope.`);
      continue;
    }

    console.log(`[GitHub] Found Task: ${task.taskCode} (${task._id}). Current Status: ${(task.status as any)?.name}`);

    const alreadyLinked = ((task.githubLinks as any[]) || []).some((l: any) => l.url === link.url && l.type === link.type && l.hash === link.hash);
    
    if (!alreadyLinked) {
      if (!task.githubLinks) {
        task.set('githubLinks', []);
      }
      (task.githubLinks as any[]).push(link);
    }
    
    const project = projects.find(p => String(p._id) === String(task.projectId));
    const oldStatusId = task.status?._id || task.status;
    let statusChanged = false;
    let targetStatusName = ''; // Scoped for entire function

    if (project?.githubSettings?.autoStatusUpdate) {
      const currentStatusName = (task.status as any)?.name?.toUpperCase() || '';
      
      if (trigger === 'PR_MERGED') {
        targetStatusName = 'DONE';
      } else if (trigger === 'PR_OPENED') {
        if (currentStatusName !== 'DONE') {
          targetStatusName = 'IN_REVIEW';
        }
      } else if (trigger === 'BRANCH_CREATED') {
        if (!['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(currentStatusName)) {
          targetStatusName = 'IN_PROGRESS';
        }
      } else if (trigger === 'COMMIT' && options.message) {
        const keywordStatusId = await getStatusFromMessage(options.message, String(project.organizationId || project.workspaceId));
        if (keywordStatusId) {
          const kwStatus = await Status.findById(keywordStatusId);
          const kwName = kwStatus?.name || '';
          const statusPriority: Record<string, number> = { 'DONE': 3, 'IN_REVIEW': 2, 'IN_PROGRESS': 1, 'TODO': 0, 'BACKLOG': 0 };
          if ((statusPriority[kwName.toUpperCase()] || 0) > (statusPriority[currentStatusName] || 0)) {
            task.status = keywordStatusId;
            statusChanged = true;
            targetStatusName = kwName;
          }
        }
      }

      if (targetStatusName && !statusChanged) {
        // Create a fuzzy regex: replace underscores with spaces and allow both
        const fuzzyPattern = targetStatusName.toUpperCase().replace(/_/g, '[\\s_]');
        const targetStatus = await Status.findOne({ 
          organizationId: project.organizationId || project.workspaceId, 
          name: { $regex: new RegExp(`^${fuzzyPattern}$`, 'i') } 
        });
        if (targetStatus && String(targetStatus._id) !== String(oldStatusId)) {
          console.log(`[GitHub] Transitioning task to ${targetStatusName}`);
          task.status = targetStatus._id;
          statusChanged = true;
          targetStatusName = targetStatus.name;
        }
      }
    }

    await task.save();
    console.log(`[GitHub] Successfully updated task ${task.taskCode}`);

    // Real-time update for the board
    emitToRoom(String(task.organizationId || task.workspaceId), SOCKET_EVENTS.TASK_UPDATED, {
      taskId: task._id,
      taskCode: task.taskCode,
      projectId: task.projectId,
      status: task.status,
      githubLinks: task.githubLinks
    });

    // Post-save: Log status change and trigger notifications
    if (statusChanged) {
      const actorAccount = await GithubAccount.findOne({ username: link.author }).lean();
      const actorId = actorAccount?.userId || null;
      
      // Fetch assignees from TaskAssignee collection
      const assignees = await TaskAssignee.find({ taskId: task._id }).lean();
      const recipientIds = Array.from(new Set([
        ...assignees.map((a: any) => String(a.userId)),
        String(task.creatorId)
      ]));

      // 1. Log Status History
      await logStatusChange({
        taskId: task._id,
        userId: actorId,
        userName: link.author, 
        fromStatus: oldStatusId,
        toStatus: task.status,
        organizationId: task.organizationId
      });

      // 2. Log Activity (Triggers Telegram Org-wide broadcast)
      await activityLog.logActivity({
        userId: actorId || task.creatorId,
        organizationId: task.organizationId,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        resourceId: task._id,
        resourceType: 'Task',
        action: 'TASK_STATUS_UPDATED',
        metadata: {
          taskId: String(task._id),
          taskTitle: task.title,
          projectName: project?.name || 'General',
          oldStatus: oldStatusId,
          newStatus: task.status,
          actorName: link.author,
          changedFields: ['status'],
          timestamp: new Date()
        }
      });

      // 3. Trigger In-App Notifications & Direct Telegram Messages
      await activityLog.triggerNotification({
        userIds: recipientIds,
        organizationId: task.organizationId,
        actorId: actorId || task.creatorId,
        type: NOTIFICATION_TYPES.TASK_STATUS_UPDATED,
        message: `Task status updated to ${targetStatusName || 'DONE'} via GitHub by ${link.author}`,
        resourceId: task._id,
        resourceType: 'Task',
        metadata: {
          taskId: String(task._id),
          taskTitle: task.title,
          oldStatus: oldStatusId,
          newStatus: task.status,
          actorName: link.author,
          changedFields: ['status']
        }
      });
    }
  }
};

const getStatusFromMessage = async (message: string, organizationId: string) => {
  const lowerMsg = message.toLowerCase();
  
  // Helper to check for words with boundaries
  const hasWord = (words: string[]) => {
    return words.some(word => {
      const regex = new RegExp(`\\b${word.trim()}\\b`, 'i');
      return regex.test(lowerMsg);
    });
  };

  const doneKeywords = ['fix', 'fixed', 'fixes', 'close', 'closed', 'closes', 'resolve', 'resolved', 'resolves', 'done', 'finish', 'finished', 'completes', 'implement', 'implemented'];
  if (hasWord(doneKeywords)) {
    // Try multiple common names for "Done"
    const doneStatus = await Status.findOne({ 
      organizationId, 
      name: { $regex: /done|completed|finished|closed|resolved/i } 
    });
    return doneStatus?._id;
  }

  const progressKeywords = ['progress', 'start', 'started', 'working', 'feat', 'feature', 'refactor', 'chore'];
  if (hasWord(progressKeywords)) {
    // Try multiple common names for "In Progress"
    const inProgressStatus = await Status.findOne({ 
      organizationId, 
      name: { $regex: /progress|started|active|working/i } 
    });
    return inProgressStatus?._id;
  }

  return null;
};

/**
 * SECTION 4: GitHub API Proxies
 * Used for fetching branches, commits, PRs, issues, and file trees dynamically.
 */
export const githubApiProxy = async (
  userId: string,
  path: string,
  params: any = {},
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: any } = {},
) => {
  const account = await GithubAccount.findOne({ userId });
  if (!account) throw new Error('GitHub account not connected');
  
  const token = decrypt(account.accessToken);
  
  const url = new URL(`https://api.github.com${path}`);

  if ((options.method ?? 'GET') === 'GET') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
      ,...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({} as any));
    const message = errorBody?.message || response.statusText || 'GitHub API request failed';
    const errors = Array.isArray(errorBody?.errors) ? errorBody.errors : [];
    throw new AppError(`GitHub API Error: ${message}`, response.status, errors);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export const getRepoDetails = (userId: string, owner: string, repo: string) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}`);
};

export const getRepoBranches = (userId: string, owner: string, repo: string, page = 1, perPage = 30) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}/branches`, { page, per_page: perPage });
};

export const getRepoCommits = (userId: string, owner: string, repo: string, sha?: string, page = 1, perPage = 30, since?: string, until?: string) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}/commits`, { sha, page, per_page: perPage, since, until });
};

export const getRepoPullRequests = (userId: string, owner: string, repo: string, state = 'all', page = 1, perPage = 30) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}/pulls`, { state, page, per_page: perPage, sort: 'updated', direction: 'desc' });
};

export const getRepoPullRequestDetail = async (userId: string, owner: string, repo: string, pullNumber: number) => {
  const [pullRequest, reviews, reviewComments, issueComments, files, commits] = await Promise.all([
    githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}`),
    githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, { per_page: 100 }),
    githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`, { per_page: 100 }),
    githubApiProxy(userId, `/repos/${owner}/${repo}/issues/${pullNumber}/comments`, { per_page: 100 }),
    githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/files`, { per_page: 100 }),
    githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/commits`, { per_page: 100 }),
  ]);

  const headSha = pullRequest?.head?.sha;
  const [commitStatus, checkRuns] = headSha
    ? await Promise.all([
        githubApiProxy(userId, `/repos/${owner}/${repo}/commits/${headSha}/status`),
        githubApiProxy(userId, `/repos/${owner}/${repo}/commits/${headSha}/check-runs`, { per_page: 100 }),
      ])
    : [null, null];

  return {
    pullRequest,
    reviews,
    reviewComments,
    issueComments,
    files,
    commits,
    checks: {
      status: commitStatus,
      checkRuns,
    },
  };
};

export const createRepoPullRequestReview = async (
  userId: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: {
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    body?: string;
    comments?: Array<{ path: string; position?: number; line?: number; side?: 'LEFT' | 'RIGHT'; body: string }>;
  },
) => {
  const payload: Record<string, unknown> = {
    event: body.event,
  };

  if (body.body) {
    payload.body = body.body;
  }

  if (body.comments?.length) {
    payload.comments = body.comments;
  }

  return githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {}, {
    method: 'POST',
    body: payload,
  });
};

export const mergeRepoPullRequest = async (
  userId: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: {
    merge_method?: 'merge' | 'squash' | 'rebase';
    commit_title?: string;
    commit_message?: string;
    sha?: string;
    delete_branch_after_merge?: boolean;
  },
) => {
  const pullRequest = await githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}`);
  const deleteBranchAfterMerge = body.delete_branch_after_merge;
  const { delete_branch_after_merge, ...mergePayload } = body;

  const mergeResult = await githubApiProxy(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, {}, {
    method: 'PUT',
    body: mergePayload,
  });

  if (deleteBranchAfterMerge && mergeResult?.merged && pullRequest?.head?.ref) {
    await githubApiProxy(userId, `/repos/${owner}/${repo}/git/refs/heads/${pullRequest.head.ref}`, {}, {
      method: 'DELETE',
    }).catch((error) => {
      console.warn('Failed to delete branch after merge:', error?.message || error);
    });
  }

  return mergeResult;
};

export const getRepoIssues = (userId: string, owner: string, repo: string, state = 'all', page = 1, perPage = 30) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}/issues`, { state, page, per_page: perPage, sort: 'updated', direction: 'desc' });
};

export const getRepoFileTree = (userId: string, owner: string, repo: string, sha: string) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}/git/trees/${sha}`, { recursive: 1 });
};

export const getRepoFileContent = (userId: string, owner: string, repo: string, path: string, ref?: string) => {
  return githubApiProxy(userId, `/repos/${owner}/${repo}/contents/${path}`, { ref });
};

export const getRepoTotalCommits = async (userId: string, owner: string, repo: string) => {
  const account = await GithubAccount.findOne({ userId });
  if (!account) throw new Error('GitHub account not connected');
  
  const token = decrypt(account.accessToken);
  
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) return 0;
  
  const link = response.headers.get('link');
  if (link) {
    // Link header looks like: <https://api.github.com/repositories/ID/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/ID/commits?per_page=1&page=12482>; rel="last"
    const match = link.match(/&page=(\d+)>; rel="last"/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // If no link header, there's only 1 page of 1 item (so either 1 or 0 commits)
  const text = await response.text();
  const data = text ? JSON.parse(text) : [];
  return Array.isArray(data) ? data.length : 0;
};

export const getProfileAnalytics = async (userId: string, username: string) => {
  const [profile, repos] = await Promise.all([
    githubApiProxy(userId, `/users/${username}`),
    githubApiProxy(userId, `/users/${username}/repos`, { sort: 'updated', per_page: 100 })
  ]);
  
  return { profile, repos };
};

export const getRepoCommitStats = (userId: string, owner: string, repo: string) => {
  // Use the statistics API to get the last 52 weeks of commit activity
  return githubApiProxy(userId, `/repos/${owner}/${repo}/stats/commit_activity`);
};
