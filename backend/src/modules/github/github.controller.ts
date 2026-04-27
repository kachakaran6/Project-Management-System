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

    res.json({
      success: true,
      data: project.githubSettings || { isEnabled: false }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { repoUrl, webhookSecret, autoStatusUpdate, isEnabled } = req.body;

    const project = await Project.findByIdAndUpdate(
      projectId,
      {
        $set: {
          'githubSettings.repoUrl': repoUrl,
          'githubSettings.webhookSecret': webhookSecret,
          'githubSettings.autoStatusUpdate': autoStatusUpdate,
          'githubSettings.isEnabled': isEnabled
        }
      },
      { new: true }
    ).select('githubSettings');

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.json({
      success: true,
      data: project.githubSettings
    });
  } catch (error) {
    next(error);
  }
};
