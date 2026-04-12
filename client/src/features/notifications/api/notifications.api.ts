import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";
import { NotificationFilters, NotificationItem, NotificationListResponse } from "@/types/notification.types";

export const notificationApi = {
  list: async (
    filters: NotificationFilters = {},
  ): Promise<ApiResponse<NotificationListResponse>> => {
    const response = await api.get<ApiResponse<NotificationListResponse>>("/notifications", {
      params: filters,
    });

    return response.data;
  },

  unreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const response = await api.get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count");
    return response.data;
  },

  markRead: async (id: string): Promise<ApiResponse<NotificationItem>> => {
    const response = await api.patch<ApiResponse<NotificationItem>>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<ApiResponse<{ matchedCount: number; modifiedCount: number }>> => {
    const response = await api.patch<ApiResponse<{ matchedCount: number; modifiedCount: number }>>("/notifications/read-all");
    return response.data;
  },
};