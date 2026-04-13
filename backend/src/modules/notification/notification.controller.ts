import { Request, Response } from 'express';
import { successResponse } from '../../utils/apiResponse.js';
import * as notificationService from './notification.service.js';
import { AppError } from '../../middlewares/errorHandler.js';

export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';

  const orgId = (req.organizationId as string) || null;
  const data = await notificationService.listNotifications(req.user.id, orgId, {
    page,
    limit,
    unreadOnly,
  });

  return successResponse(res, data, 'Notifications retrieved.');
};

export const unreadCount = async (req: Request, res: Response) => {
  const orgId = (req.organizationId as string) || null;
  const unreadCountValue = await notificationService.getUnreadCount(req.user.id, orgId);
  return successResponse(res, { unreadCount: unreadCountValue }, 'Unread notification count retrieved.');
};

export const markRead = async (req: Request, res: Response) => {
  const notificationId = req.params.id as string;
  const orgId = (req.organizationId as string) || null;
  const notification = await notificationService.markNotificationRead(req.user.id, orgId, notificationId);
  return successResponse(res, notification, 'Notification marked as read.');
};

export const markAllRead = async (req: Request, res: Response) => {
  const orgId = (req.organizationId as string) || null;
  const result = await notificationService.markAllNotificationsRead(req.user.id, orgId);
  return successResponse(res, result, 'All notifications marked as read.');
};