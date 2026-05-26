import express from 'express';
import * as githubController from './github.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public webhook endpoint — raw body required for HMAC signature verification
router.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), githubController.handleWebhook);

// OAuth callback is public but needs to verify 'state'
router.get('/callback', githubController.githubCallback);

// Protected endpoints
router.use(requireAuth);
router.use(express.json({ limit: '500kb' }));

// Account Management
router.get('/connect', githubController.connectGithub);
router.get('/account', githubController.getAccount);
router.delete('/account', githubController.disconnectAccount);

// Repository Management
router.get('/repos', githubController.getRepositories);
router.post('/repos/link', githubController.linkRepository);
router.get('/workspace-repos/:workspaceId', githubController.getWorkspaceRepositories);
router.delete('/repos/:repoId', githubController.unlinkRepository);

// Activity Feed
router.get('/workspace-activity/:workspaceId', githubController.getWorkspaceActivity);

// Legacy/Project endpoints
router.get('/settings/:projectId', githubController.getProjectSettings);
router.put('/settings/:projectId', githubController.updateProjectSettings);
router.get('/activity/:projectId', githubController.getProjectGithubActivity);
router.get('/full-activity/:projectId', githubController.getFullGithubActivity);

// Proxy endpoints for GitHub API
router.get('/repos/:owner/:repo/branches', githubController.getRepoBranches);
router.get('/repos/:owner/:repo/commits', githubController.getRepoCommits);
router.get('/repos/:owner/:repo/pulls', githubController.getRepoPullRequests);
router.get('/repos/:owner/:repo/pulls/:pullNumber', githubController.getRepoPullRequestDetail);
router.post('/repos/:owner/:repo/pulls/:pullNumber/reviews', githubController.createRepoPullRequestReview);
router.put('/repos/:owner/:repo/pulls/:pullNumber/merge', githubController.mergeRepoPullRequest);
router.get('/repos/:owner/:repo/issues', githubController.getRepoIssues);
router.get('/repos/:owner/:repo/git/trees/:sha', githubController.getRepoFileTree);
router.get('/repos/:owner/:repo/contents/*', githubController.getRepoFileContent);
router.get('/profile/:username', githubController.getProfileAnalytics);

export default router;
