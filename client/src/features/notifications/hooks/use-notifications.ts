"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import { notificationApi } from "@/features/notifications/api/notifications.api";
import { useAuthStore } from "@/store/auth-store";
import { NotificationFilters, NotificationItem } from "@/types/notification.types";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (filters: NotificationFilters) => ["notifications", filters] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

function mergeById(current: NotificationItem[] = [], incoming: NotificationItem[] = []) {
  const map = new Map<string, NotificationItem>();

  for (const item of [...incoming, ...current]) {
    map.set(item._id, item);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function getSocketUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  return baseUrl.replace(/\/api\/v1\/?$/, "");
}

export function useNotificationCenter(filters: NotificationFilters = {}) {
  const queryClient = useQueryClient();
  const { accessToken, activeOrgId, isAuthenticated, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const shownJoinToastIdsRef = useRef<Set<string>>(new Set());

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.list(filters),
    queryFn: () => notificationApi.list(filters),
    enabled: isAuthenticated,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationQueryKeys.unreadCount,
    queryFn: () => notificationApi.unreadCount(),
    enabled: isAuthenticated,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: async (_, notificationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount }),
      ]);
      queryClient.setQueryData(notificationQueryKeys.list(filters), (current: any) => {
        if (!current?.data?.items) return current;
        return {
          ...current,
          data: {
            ...current.data,
            items: current.data.items.map((item: NotificationItem) =>
              item._id === notificationId ? { ...item, isRead: true } : item,
            ),
          },
        };
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount }),
      ]);
    },
  });

  const userContextRef = useRef({ userId: user?.id, orgId: activeOrgId });

  useEffect(() => {
    userContextRef.current = { userId: user?.id, orgId: activeOrgId };
  }, [user?.id, activeOrgId]);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      auth: { token: accessToken },
      query: activeOrgId ? { organizationId: activeOrgId } : undefined,
    });

    socketRef.current = socket;

    const handleNotification = (incoming: NotificationItem | NotificationItem[]) => {
      const payload = Array.isArray(incoming) ? incoming : [incoming];
      const { userId: currentUserIdRaw } = userContextRef.current;
      const currentUserId = currentUserIdRaw ? String(currentUserIdRaw) : null;
      
      const filteredPayload = currentUserId
        ? payload.filter((item) => String(item.recipientId) === currentUserId)
        : payload;

      if (filteredPayload.length === 0) {
        return;
      }

      queryClient.setQueryData(notificationQueryKeys.list(filters), (current: any) => {
        if (!current?.data) return current;
        return {
          ...current,
          data: {
            ...current.data,
            items: mergeById(current.data.items, filteredPayload),
          },
        };
      });

      queryClient.setQueryData(notificationQueryKeys.unreadCount, (current: any) => {
        const unreadFromPayload = filteredPayload.filter((item) => !item.isRead).length;
        if (!current?.data) {
          return current;
        }
        return {
          ...current,
          data: {
            unreadCount: current.data.unreadCount + unreadFromPayload,
          },
        };
      });

      filteredPayload.forEach((item) => {
        if (item.type !== "NEW_MEMBER_JOINED" || item.isRead) {
          return;
        }

        if (shownJoinToastIdsRef.current.has(item._id)) {
          return;
        }

        shownJoinToastIdsRef.current.add(item._id);

        const joinedUserName =
          typeof item.metadata?.joinedUserName === "string" && item.metadata.joinedUserName.trim().length > 0
            ? item.metadata.joinedUserName.trim()
            : null;

        const toastMessage = joinedUserName
          ? `🎉 ${joinedUserName} joined your organization`
          : `🎉 ${item.message}`;

        toast.success(toastMessage, { duration: 4000 });
      });
    };

    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("notification:new", handleNotification);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, activeOrgId, filtersKey, isAuthenticated, queryClient]);

  return useMemo(
    () => ({
      notifications: notificationsQuery.data?.data.items ?? [],
      unreadCount: unreadCountQuery.data?.data.unreadCount ?? notificationsQuery.data?.data.meta.unreadCount ?? 0,
      totalItems: notificationsQuery.data?.data.meta.totalItems ?? 0,
      isLoading: notificationsQuery.isLoading,
      isFetching: notificationsQuery.isFetching,
      markRead: markReadMutation.mutateAsync,
      markAllRead: markAllReadMutation.mutateAsync,
      refetch: async () => {
        await Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
      },
    }),
    [markAllReadMutation.mutateAsync, markReadMutation.mutateAsync, notificationsQuery, unreadCountQuery],
  );
}