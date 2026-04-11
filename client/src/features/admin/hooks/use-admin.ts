"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminApi,
  RolePermissionRow,
  AdminUser,
  AdminOrganization,
  AdminProject,
  AdminTask,
} from "@/features/admin/api/admin.api";

const baseApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

export const adminQueryKeys = {
  dashboard: ["admin", "dashboard"] as const,
  users: ["admin", "users"] as const,
  organizations: ["admin", "organizations"] as const,
  projects: ["admin", "projects"] as const,
  tasks: ["admin", "tasks"] as const,
  billing: ["admin", "billing"] as const,
  health: ["admin", "health"] as const,
  roles: ["admin", "roles"] as const,
  auditLogs: ["admin", "audit-logs"] as const,
  apiLogs: ["admin", "api-logs"] as const,
  analytics: ["admin", "analytics"] as const,
};

export function useAdminDashboardQuery() {
  return useQuery({
    queryKey: adminQueryKeys.dashboard,
    queryFn: () => adminApi.getAdminDashboardSnapshot(),
    refetchInterval: 20_000,
  });
}

export function useAdminUsersQuery() {
  return useQuery<AdminUser[]>({
    queryKey: adminQueryKeys.users,
    queryFn: () => adminApi.getUsers(),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useAdminOrganizationsQuery() {
  return useQuery<AdminOrganization[]>({
    queryKey: adminQueryKeys.organizations,
    queryFn: () => adminApi.getOrganizations(),
    staleTime: 20_000,
    refetchInterval: 35_000,
  });
}

export function useAdminProjectsQuery() {
  return useQuery<AdminProject[]>({
    queryKey: adminQueryKeys.projects,
    queryFn: () => adminApi.getProjects(),
    refetchInterval: 30_000,
  });
}

export function useAdminTasksQuery() {
  return useQuery<AdminTask[]>({
    queryKey: adminQueryKeys.tasks,
    queryFn: () => adminApi.getTasks(),
    refetchInterval: 25_000,
  });
}

export function useAdminBillingQuery() {
  return useQuery({
    queryKey: adminQueryKeys.billing,
    queryFn: () => adminApi.getBillingStats(),
    staleTime: 30_000,
  });
}

export function useSystemHealthQuery() {
  return useQuery({
    queryKey: adminQueryKeys.health,
    queryFn: () => adminApi.getSystemHealth(baseApiUrl),
    refetchInterval: 20_000,
  });
}

export function useRolePermissionsQuery() {
  return useQuery<RolePermissionRow[]>({
    queryKey: adminQueryKeys.roles,
    queryFn: () => adminApi.getRolePermissions(),
    staleTime: 60_000,
  });
}

export function useAuditLogsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs,
    queryFn: () => adminApi.getAuditLogs(),
    refetchInterval: 10_000,
  });
}

export function useApiLogsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.apiLogs,
    queryFn: () => adminApi.getApiRequestLogs(),
    refetchInterval: 3_000,
  });
}

export function useAnalyticsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.analytics,
    queryFn: () => adminApi.getAnalytics(),
    refetchInterval: 35_000,
  });
}

export function useToggleOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: string) => adminApi.toggleOrganizationStatus(orgId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.organizations,
      });
    },
  });
}

export function useTransferOwnershipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, ownerId }: { orgId: string; ownerId: string }) =>
      adminApi.transferOrganizationOwnership(orgId, ownerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.organizations,
      });
    },
  });
}

export function useDeleteOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: string) => adminApi.deleteOrganization(orgId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.organizations,
      });
    },
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: RolePermissionRow["role"];
    }) => adminApi.updateUserRole(userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users });
    },
  });
}

export function useSuspendUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, suspend }: { userId: string; suspend: boolean }) =>
      adminApi.suspendUser(userId, suspend),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (userId: string) => adminApi.resetUserPassword(userId),
  });
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      role,
      permissions,
    }: {
      role: RolePermissionRow["role"];
      permissions: string[];
    }) => adminApi.updateRolePermissions(role, permissions),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.roles });
    },
  });
}

export function useBulkTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskIds,
      status,
    }: {
      taskIds: string[];
      status: AdminTask["status"];
    }) => adminApi.bulkUpdateTaskStatus(taskIds, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.tasks });
    },
  });
}

export function useApiTesterMutation() {
  return useMutation({
    mutationFn: (payload: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string;
      headers?: Record<string, string>;
      body?: unknown;
    }) => adminApi.runApiTest(payload),
  });
}
export function useApproveUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminApi.approveUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users });
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard });
    },
  });
}
