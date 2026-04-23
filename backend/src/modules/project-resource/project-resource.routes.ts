import { Router } from 'express';
import * as resourceController from './project-resource.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

// All resource routes are protected
router.use(requireAuth);

router.get('/:projectId/resources', resourceController.getResources);
router.post('/:projectId/resources', resourceController.createResource);

router.get('/:projectId/resources/:resourceId', resourceController.getResourceById);
router.patch('/:projectId/resources/:resourceId', resourceController.updateResource);
router.delete('/:projectId/resources/:resourceId', resourceController.deleteResource);

export default router;
