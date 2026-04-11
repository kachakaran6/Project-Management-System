import express from 'express';
import * as projectController from './project.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// Anyone in current organization can view projects (given VIEW_PROJECT permission check if needed)
router.get('/', projectController.getAll);
router.post('/', projectController.create);
router.patch('/:id', projectController.update);
router.post('/:id/archive', projectController.archive);
router.get('/:id', projectController.getById);
router.delete('/:id', projectController.remove);

export default router;
