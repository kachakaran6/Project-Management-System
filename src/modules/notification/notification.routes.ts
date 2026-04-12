import express from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as notificationController from './notification.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;