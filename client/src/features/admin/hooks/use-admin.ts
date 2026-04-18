"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminApi,
  RolePermissionRow,
  AdminUser,
  AdminOrganization,
  AdminProject,
  AdminTask,
  AdminOrganizationDetails,
  AdminAnalyticsSummary,
} from "@/features/admin/api/admin.api";

const baseApiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

export const adminQueryKeys = {
  dashboard: ["admin", "dashboard"] as const,
  users: ["admin", "users"] as const,
  approvals: ["admin", "approvals"] as const,
  organizations: ["admin", "organizations"] as const,
  organizationDetails: (orgId: string) =>
    ["admin", "organizations", orgId] as const,
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

export function useAdminPendingRequestsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.approvals,
    queryFn: () => adminApi.getPendingUsers(),
    staleTime: 10_000,
    refetchInterval: 15_000,
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

export function useAdminOrganizationDetailsQuery(orgId?: string) {
  return useQuery<AdminOrganizationDetails>({
    queryKey: orgId ? adminQueryKeys.organizationDetails(orgId) : ["admin", "organizations", "empty"],
    queryFn: () => adminApi.getOrganizationById(orgId as string),
    enabled: Boolean(orgId),
    staleTime: 20_000,
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

export function useAuditLogsQuery(params?: Parameters<typeof adminApi.getAuditLogs>[0]) {
  return useQuery({
    queryKey: [...adminQueryKeys.auditLogs, params],
    queryFn: () => adminApi.getAuditLogs(params),
    refetchInterval: 20_000,
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
  return useQuery<AdminAnalyticsSummary>({
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

export function useApproveAdminRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminApi.approveUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.approvals }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
      ]);
    },
  });
}

export function useRejectAdminRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      adminApi.rejectUser(userId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.approvals }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
      ]);
    },
  });
}

export function useApproveUserMutation() {
  return useApproveAdminRequestMutation();
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

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof adminApi.createUser>[0]) =>
      adminApi.createUser(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
      ]);
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: Parameters<typeof adminApi.updateUser>[1];
    }) => adminApi.updateUser(userId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.approvals }),
      ]);
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
      ]);
    },
  });
}

export function useBulkUsersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof adminApi.bulkUsersAction>[0]) =>
      adminApi.bulkUsersAction(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.approvals }),
      ]);
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
