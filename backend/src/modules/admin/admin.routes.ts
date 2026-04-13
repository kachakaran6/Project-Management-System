import express from 'express';
import * as adminController from './admin.controller.js';
import { requireAuth, requireSuperAdmin, requireRole } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Both Super Admin and Admin can access, but service handles fine-grained RBAC
router.use(requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Users Management
router.get('/users', adminController.listUsers);
router.post('/users', requireSuperAdmin, adminController.createUserInfo);
router.patch('/users/:userId', adminController.updateUserInfo);
router.delete('/users/:userId', adminController.deleteUserInfo);
router.post('/users/bulk', adminController.bulkUsersAction);

// Admin Approval
router.get('/pending-users', adminController.getPendingAdmins);
router.patch('/approve/:userId', adminController.approveAdmin);

// Projects & Tasks (Global)
router.get('/projects', adminController.listProjects);
router.get('/tasks', adminController.listTasks);

// Organizations (Platform-level)
router.get('/organizations', adminController.listOrganizations);
router.get('/organizations/:organizationId', adminController.getOrganizationDetails);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// System Logs
router.get('/logs', adminController.listLogs);

export default router;
