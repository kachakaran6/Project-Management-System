import crypto from 'crypto';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Status from '../../models/Status.js';

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

export const processPushEvent = async (payload: any) => {
  const repoUrl = payload.repository.html_url.replace(/\/$/, '').replace(/\.git$/, '');
  const projects = await Project.find({ 
    'githubSettings.repoUrl': { $regex: new RegExp(`^${repoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.git)?/?$`, 'i') },
    'githubSettings.isEnabled': true 
  });

  if (!projects.length) return;

  for (const commit of (payload.commits || [])) {
    const taskIds = extractTaskIds(commit.message);
    if (!taskIds.length) continue;

    const link = {
      type: 'commit',
      url: commit.url,
      message: commit.message,
      author: commit.author.name,
      authorAvatar: payload.sender?.avatar_url,
      hash: commit.id?.substring(0, 7),
      createdAt: new Date(commit.timestamp)
    };

    await linkToTasks(taskIds, link, commit.message, projects);
  }
};

export const processPullRequestEvent = async (payload: any) => {
  const repoUrl = payload.repository.html_url.replace(/\/$/, '').replace(/\.git$/, '');
  const projects = await Project.find({ 
    'githubSettings.repoUrl': { $regex: new RegExp(`^${repoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.git)?/?$`, 'i') },
    'githubSettings.isEnabled': true 
  });

  if (!projects.length) return;

  const pr = payload.pull_request;
  const taskIds = extractTaskIds(pr.title);
  if (!taskIds.length) return;

  const link = {
    type: 'pr',
    url: pr.html_url,
    message: pr.title,
    author: pr.user.login,
    authorAvatar: pr.user.avatar_url,
    hash: `#${pr.number}`,
    createdAt: new Date(pr.created_at)
  };

  await linkToTasks(taskIds, link, pr.title, projects);
};

const linkToTasks = async (taskIds: string[], link: any, text: string, projects: any[]) => {
  const projectIds = projects.map(p => p._id);
  
  for (const taskId of taskIds) {
    const task = await Task.findOne({ 
      taskCode: taskId, 
      projectId: { $in: projectIds },
      isActive: true
    });
    if (!task) continue;

    // Avoid duplicate links
    const alreadyLinked = ((task.githubLinks as any[]) || []).some((l: any) => l.url === link.url);
    if (alreadyLinked) continue;

    if (!task.githubLinks) {
      task.set('githubLinks', []);
    }
    (task.githubLinks as any[]).push(link);
    
    // Check for auto-status update
    const project = projects.find(p => String(p._id) === String(task.projectId));
    if (project?.githubSettings?.autoStatusUpdate) {
      const newStatusId = await getStatusFromMessage(text, String(project.organizationId));
      if (newStatusId) {
        task.status = newStatusId;
      }
    }

    await task.save();
  }
};

const getStatusFromMessage = async (message: string, organizationId: string) => {
  const lowerMsg = message.toLowerCase();
  
  // DONE keywords (will move task to DONE status)
  const doneKeywords = [
    'fix', 'fixed', 'fixes', 
    'close', 'closed', 'closes', 
    'resolve', 'resolved', 'resolves',
    'done', 'finish', 'finished', 'completes', 'implement', 'implemented'
  ];

  if (doneKeywords.some(kw => lowerMsg.includes(kw))) {
    const doneStatus = await Status.findOne({ organizationId, name: /done/i });
    return doneStatus?._id;
  }
  
  // IN PROGRESS keywords (will move task to IN PROGRESS status)
  const progressKeywords = [
    'progress', 'start', 'started', 'working', 'feat', 'feature', 'refactor', 'chore'
  ];

  if (progressKeywords.some(kw => lowerMsg.includes(kw))) {
    const inProgressStatus = await Status.findOne({ organizationId, name: /progress/i });
    return inProgressStatus?._id;
  }

  return null;
};
