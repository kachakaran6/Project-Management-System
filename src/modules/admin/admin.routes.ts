import express from 'express';
import * as adminController from './admin.controller.js';
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Users Management
router.get('/users', adminController.listUsers);
router.patch('/users/:userId', adminController.updateUserInfo);
router.delete('/users/:userId', adminController.deleteUserInfo);

// Admin Approval
router.get('/pending-users', adminController.getPendingAdmins);
router.patch('/approve/:userId', adminController.approveAdmin);

// Projects & Tasks (Global)
router.get('/projects', adminController.listProjects);
router.get('/tasks', adminController.listTasks);

// System Logs
router.get('/logs', adminController.listLogs);

export default router;
