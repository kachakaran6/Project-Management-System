import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as githubService from './github.service.js';
import { AppError } from '../../middlewares/errorHandler.js';
import Project from '../../models/Project.js';
import GithubRepository from '../../models/GithubRepository.js';
import { env } from '../../config/env.js';

/**
 * SECTION 1: Webhook Handler
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  
  const rawBody = req.body;
  const bodyString = rawBody.toString('utf-8');
  const payload = JSON.parse(bodyString);

  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    return res.status(200).send('No repository info in payload');
  }

  // 1. Find the target (Official link or Legacy project)
  const linkedRepo = await GithubRepository.findOne({ fullName: repoFullName });
  const project = await Project.findOne({ 
    $or: [
      { 'githubSettings.repoUrl': { $regex: new RegExp(repoFullName, 'i') } },
      { workspaceId: linkedRepo?.workspaceId },
      { organizationId: linkedRepo?.workspaceId }
    ],
    isActive: true
  });

  if (!linkedRepo && !project) {
    console.warn(`[GitHub Webhook] Received event for untracked repo: ${repoFullName}`);
    return res.status(200).send('Repository not tracked');
  }

  // 2. Verify Signature (only if a secret is configured in either system)
  const secret = linkedRepo?.webhookSecret || project?.githubSettings?.webhookSecret;
  if (secret && signature) {
    if (!githubService.verifySignature(bodyString, signature, secret)) {
      console.error(`[GitHub Webhook] Invalid signature for ${repoFullName}`);
      return res.status(401).send('Invalid signature');
    }
  }

  console.log(`[GitHub Webhook] Processing ${event} event for ${repoFullName}`);

  // 3. Process Events
  switch (event) {
    case 'push':
      await githubService.processPushEvent(payload);
      break;
    case 'create':
      await githubService.processCreateEvent(payload);
      break;
    case 'pull_request':
      await githubService.processPullRequestEvent(payload);
      break;
    case 'ping':
      return res.status(200).send('pong');
  }

  return res.status(200).send('OK');
});

/**
 * SECTION 2: Account Connection
 */
export const connectGithub = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const url = githubService.getConnectUrl(userId);
  return res.status(200).json({ success: true, data: { url } });
});

export const githubCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    throw new AppError('Invalid callback parameters', 400);
  }

  await githubService.handleOAuthCallback(code as string, userId as string);

  // Redirect back to the GitHub settings page in frontend
  return res.redirect(`${env.frontendUrl}/github?connected=success`);
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const account = await githubService.getAccount(userId);
  return res.status(200).json({ success: true, data: account });
});

export const disconnectAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  await githubService.disconnectAccount(userId);
  return res.status(200).json({ success: true, message: 'Account disconnected' });
});

/**
 * SECTION 3: Repository Management
 */
export const getRepositories = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  
  // Check if account exists first without using the 'safe' getter that strips the token
  const account = await githubService.getInternalAccount(userId);
  if (!account) {
    return res.status(200).json({ success: true, data: [] });
  }

  const repos = await githubService.listUserRepositories(userId);
  return res.status(200).json({ success: true, data: repos });
});

export const linkRepository = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { workspaceId, repo } = req.body;

  if (!workspaceId || !repo) {
    throw new AppError('Workspace ID and Repo data are required', 400);
  }

  const linkedRepo = await githubService.linkRepository(userId, workspaceId, repo);
  return res.status(200).json({ success: true, data: linkedRepo });
});

export const getWorkspaceRepositories = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const repos = await githubService.listWorkspaceRepositories(workspaceId);
  return res.status(200).json({ success: true, data: repos });
});

export const unlinkRepository = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const repoId = req.params.repoId as string;
  await githubService.unlinkRepository(userId, repoId);
  return res.status(200).json({ success: true, message: 'Repository unlinked' });
});

/**
 * SECTION 4: Activity Feed
 */
export const getWorkspaceActivity = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const activity = await githubService.getWorkspaceActivity(workspaceId);
  return res.status(200).json({ success: true, data: activity });
});

/**
 * SECTION 5: Legacy Project Settings (Maintained for compatibility)
 */
export const getProjectSettings = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId).select('githubSettings');
  if (!project) throw new AppError('Project not found', 404);
  return res.status(200).json({ success: true, data: project.githubSettings });
});

export const updateProjectSettings = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { repoUrl, webhookSecret, accessToken, autoStatusUpdate, isEnabled } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  project.githubSettings = {
    repoUrl,
    webhookSecret,
    accessToken,
    autoStatusUpdate,
    isEnabled
  };

  await project.save();
  return res.status(200).json({ success: true, data: project.githubSettings });
});

export const getProjectGithubActivity = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);
  return res.status(200).json({ success: true, data: [] });
});

export const getFullGithubActivity = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  
  // Try to find the project first
  const project = await Project.findById(projectId);
  
  if (!project) {
    // If no project found, the ID might be a workspace/org ID
    // We try to fetch activity for this ID directly as a workspace
    const activity = await githubService.getWorkspaceActivity(projectId as string);
    return res.status(200).json({ success: true, data: activity });
  }

  // If project is found, get activity for its parent workspace/organization
  const scopeId = String(project.organizationId || project.workspaceId);
  const activity = await githubService.getWorkspaceActivity(scopeId);
  return res.status(200).json({ success: true, data: activity });
});
