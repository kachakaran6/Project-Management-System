import Notification from '../../models/Notification.js';
import { AppError } from '../../middlewares/errorHandler.js';

type ListOptions = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export const listNotifications = async (recipientId: string, organizationId: string | null, options: ListOptions = {}) => {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { recipientId };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  if (options.unreadOnly) {
    query.isRead = false;
  }

  const [items, totalItems, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({
      recipientId,
      ...(organizationId ? { organizationId } : {}),
      isRead: false,
    }),
  ]);

  return {
    items,
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      hasNextPage: page * limit < totalItems,
      hasPreviousPage: page > 1,
      unreadCount,
    },
  };
};

export const getUnreadCount = async (recipientId: string, organizationId: string | null) => {
  return Notification.countDocuments({
    recipientId,
    ...(organizationId ? { organizationId } : {}),
    isRead: false,
  });
};

export const markNotificationRead = async (recipientId: string, organizationId: string | null, notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipientId,
      ...(organizationId ? { organizationId } : {}),
    },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found.', 404);
  }

  return notification;
};

export const markAllNotificationsRead = async (recipientId: string, organizationId: string | null) => {
  const result = await Notification.updateMany(
    {
      recipientId,
      ...(organizationId ? { organizationId } : {}),
      isRead: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};