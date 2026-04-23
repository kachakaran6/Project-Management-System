import express from 'express';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.post('/register',        authController.register);
router.post('/login',           authController.login);
router.post('/refresh',         authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password',  authController.resetPassword);
router.get('/verify-email',     authController.verifyEmail);

// ── OTP routes ────────────────────────────────────────────────────────────────
router.post('/send-otp',        authController.sendOtp);
router.post('/verify-otp',      authController.verifyOtp);

// ── Protected routes ──────────────────────────────────────────────────────────
router.post('/logout', requireAuth, authController.logout);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.get('/me',      requireAuth, authController.me);
router.patch('/me',    requireAuth, authController.updateMe);
router.post('/request-organization-access', requireAuth, authController.requestOrganizationAccess);
router.get('/organization-access-status', requireAuth, authController.organizationAccessStatus);

export default router;
