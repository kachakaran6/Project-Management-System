import express from 'express';
import * as taskController from './task.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// All task operations require VIEW_PROJECT or CREATE_TASK permissions scoped by organization
router.get('/', taskController.getAll);
router.post('/', taskController.create);
router.patch('/:id', taskController.update);
router.post('/:id/assign', taskController.assign);
router.patch('/:id/status', taskController.changeStatus);
router.get('/:id', taskController.getById);
router.delete('/:id', taskController.remove);

export default router;
