import { Request, Response, NextFunction } from 'express';
import * as githubService from './github.service.js';
import Project from '../../models/Project.js';
import { AppError } from '../../middlewares/errorHandler.js';

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-sha256-signature'] as string || req.headers['x-hub-signature-256'] as string;
    
    if (!event) {
      return res.status(400).json({ success: false, message: 'Missing GitHub event header' });
    }

    // Body is a Buffer because of express.raw() in routes
    const rawBody = req.body;
    const bodyString = rawBody.toString('utf-8');
    const payload = JSON.parse(bodyString);

    const repoUrl = payload.repository?.html_url?.replace(/\/$/, '').replace(/\.git$/, '');
    
    console.log(`[GITHUB WEBHOOK] Event: ${event}, Normalized Repo: ${repoUrl}`);

    if (!repoUrl) {
      return res.status(400).json({ success: false, message: 'Missing repository URL in payload' });
    }

    // Find all projects that have this repo linked. 
    // We search with regex to handle potential .git or trailing slashes in the database too.
    const projects = await Project.find({ 
      'githubSettings.repoUrl': { $regex: new RegExp(`^${repoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.git)?/?$`, 'i') },
      'githubSettings.isEnabled': true 
    });

    if (!projects.length) {
      console.log(`[GITHUB WEBHOOK] No projects configured for repo: ${repoUrl}`);
      return res.status(200).json({ success: true, message: 'No projects configured for this repository' });
    }

    const secret = projects[0].githubSettings?.webhookSecret;
    if (secret && !githubService.verifySignature(bodyString, signature, secret)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    if (event === 'push') {
      await githubService.processPushEvent(payload);
    } else if (event === 'pull_request') {
      await githubService.processPullRequestEvent(payload);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    next(error);
  }
};

export const getProjectSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).select('githubSettings');
    
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const s = project.githubSettings as any;
    // Never return the raw accessToken — send a boolean flag instead
    res.json({
      success: true,
      data: s ? {
        repoUrl: s.repoUrl,
        webhookSecret: s.webhookSecret,
        autoStatusUpdate: s.autoStatusUpdate,
        isEnabled: s.isEnabled,
        hasAccessToken: !!(s.accessToken),
      } : { isEnabled: false }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { repoUrl, webhookSecret, accessToken, autoStatusUpdate, isEnabled } = (req.body ?? {});

    const updateFields: Record<string, any> = {
      'githubSettings.repoUrl': repoUrl,
      'githubSettings.webhookSecret': webhookSecret,
      'githubSettings.autoStatusUpdate': autoStatusUpdate,
      'githubSettings.isEnabled': isEnabled,
    };
    // Only update token if explicitly provided (don't clear on every save)
    if (accessToken !== undefined) {
      updateFields['githubSettings.accessToken'] = accessToken || null;
    }

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateFields },
      { new: true }
    ).select('githubSettings');

    if (!project) throw new AppError('Project not found', 404);

    // Never return the accessToken to the client
    const safeSettings = {
      repoUrl: project.githubSettings?.repoUrl,
      webhookSecret: project.githubSettings?.webhookSecret,
      autoStatusUpdate: project.githubSettings?.autoStatusUpdate,
      isEnabled: project.githubSettings?.isEnabled,
      hasAccessToken: !!(project as any).githubSettings?.accessToken,
    };

    res.json({ success: true, data: safeSettings });
  } catch (error) {
    next(error);
  }
};

export const getFullGithubActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const page      = Math.max(1, parseInt(req.query.page     as string, 10) || 1);
    const perPage   = Math.min(100, Math.max(1, parseInt(req.query.per_page as string, 10) || 30));
    const typeFilter = (req.query.type as string) || 'all';

    // Fetch project (token no longer has select:false — excluded in response instead)
    const project = await Project.findById(projectId).lean() as any;

    if (!project) throw new AppError('Project not found', 404);
    if (!project.githubSettings?.isEnabled || !project.githubSettings?.repoUrl) {
      return res.json({
        success: true,
        data: { items: [], meta: { total: 0, page, perPage, hasMore: false }, connected: false }
      });
    }

    // Parse owner/repo from repoUrl
    const clean = project.githubSettings.repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
    const match = clean.match(/github\.com[/:]([^/]+)\/([^/]+)$/);
    if (!match) throw new AppError('Invalid GitHub repository URL format', 400);
    const [, owner, repo] = match;

    const token: string | undefined = project.githubSettings.accessToken;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'PMS-Orbit/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    // Helper: fetch from GitHub API using built-in fetch (Node 18+)
    const fetchGitHub = async (url: string): Promise<any[]> => {
      try {
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          console.warn(`[GitHub API] ${resp.status} ${resp.statusText} → ${url} | body: ${body.slice(0, 200)}`);
          return [];
        }
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn(`[GitHub API] fetch error for ${url}:`, err);
        return [];
      }
    };

    // Fetch task codes for cross-referencing
    const Task = (await import('../../models/Task.js')).default;
    const tasks = await Task.find(
      { projectId, isActive: true, taskCode: { $exists: true, $ne: null } },
      { _id: 1, taskCode: 1 }
    ).lean();
    const taskCodeMap: Record<string, string> = {};
    for (const t of tasks) {
      if ((t as any).taskCode) taskCodeMap[(t as any).taskCode.toUpperCase()] = String((t as any)._id);
    }

    const extractTaskCode = (text: string): { taskCode: string; taskId: string } | null => {
      const m = text?.match(/([A-Z][A-Z0-9]+-\d+)/gi);
      if (!m) return null;
      for (const code of m) {
        const id = taskCodeMap[code.toUpperCase()];
        if (id) return { taskCode: code.toUpperCase(), taskId: id };
      }
      return null;
    };

    const base = `https://api.github.com/repos/${owner}/${repo}`;
    const items: any[] = [];

    // ── COMMITS ──
    if (typeFilter === 'all' || typeFilter === 'commit') {
      const commits = await fetchGitHub(`${base}/commits?page=${page}&per_page=${perPage}`);
      for (const c of commits) {
        const msg: string = c.commit?.message?.split('\n')[0] || '';
        const linked = extractTaskCode(msg);
        items.push({
          id: c.sha,
          type: 'commit',
          title: msg,
          description: c.commit?.message || '',
          author: c.commit?.author?.name || c.author?.login || 'Unknown',
          authorAvatar: c.author?.avatar_url,
          authorProfile: c.author?.html_url,
          url: c.html_url,
          hash: c.sha?.slice(0, 7),
          createdAt: c.commit?.author?.date || new Date().toISOString(),
          taskCode: linked?.taskCode ?? null,
          taskId: linked?.taskId ?? null,
        });
      }
    }

    // ── PULL REQUESTS ──
    if (typeFilter === 'all' || typeFilter === 'pr') {
      const prs = await fetchGitHub(`${base}/pulls?state=all&page=${page}&per_page=${perPage}&sort=updated&direction=desc`);
      for (const pr of prs) {
        const linked = extractTaskCode(`${pr.title} ${pr.body || ''}`);
        items.push({
          id: `pr-${pr.number}`,
          type: 'pr',
          prState: pr.merged_at ? 'merged' : pr.state,
          title: pr.title,
          description: pr.body?.split('\n')[0] || '',
          author: pr.user?.login || 'Unknown',
          authorAvatar: pr.user?.avatar_url,
          authorProfile: pr.user?.html_url,
          url: pr.html_url,
          prNumber: pr.number,
          createdAt: pr.created_at,
          taskCode: linked?.taskCode ?? null,
          taskId: linked?.taskId ?? null,
        });
      }
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: {
        items,
        meta: { total: items.length, page, perPage, hasMore: items.length === perPage },
        connected: true,
        repoInfo: { owner, repo },
      }
    });
  } catch (error) {
    next(error);
  }
};

// Legacy: task-linked activity (webhook-driven githubLinks on tasks)
export const getProjectGithubActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page  as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip  = (page - 1) * limit;

    const project = await Project.findById(projectId).select('_id');
    if (!project) throw new AppError('Project not found', 404);

    const Task = (await import('../../models/Task.js')).default;
    const tasks = await Task.find(
      { projectId, 'githubLinks.0': { $exists: true }, isActive: true },
      { _id: 1, title: 1, taskCode: 1, githubLinks: 1 }
    ).lean();

    const allActivity: any[] = [];
    for (const task of tasks) {
      const links: any[] = (task as any).githubLinks || [];
      for (const link of links) {
        allActivity.push({
          taskId: String((task as any)._id),
          taskCode: (task as any).taskCode || null,
          taskTitle: (task as any).title,
          type: link.type,
          url: link.url,
          message: link.message,
          author: link.author,
          authorAvatar: link.authorAvatar,
          hash: link.hash,
          createdAt: link.createdAt,
        });
      }
    }

    allActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = allActivity.length;
    const paged = allActivity.slice(skip, skip + limit);

    res.json({
      success: true,
      data: { items: paged, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
    });
  } catch (error) {
    next(error);
  }
};
