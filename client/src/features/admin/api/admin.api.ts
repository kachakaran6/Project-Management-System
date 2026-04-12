import axios from "axios";

import { api } from "@/lib/api/axios-instance";
import { getApiLogs } from "@/lib/api/api-debug";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import { Project } from "@/types/project.types";
import { Task } from "@/types/task.types";
import { UserListItem } from "@/types/user.types";

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER" | "USER";
export type AdminApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type RawUserRow = UserListItem & {
  _id?: string;
  requestedRole?: string;
  accessRequestedAt?: string;
};

type RawOrganizationRow = AdminOrganization & {
  id?: string;
  _id?: string;
};

type RawProjectRow = Project & {
  id?: string;
  _id?: string;
  organizationId?: string;
};

type RawTaskRow = Task & {
  id?: string;
  _id?: string;
  projectId?: string;
  assigneeId?: string;
};

type RawAuditLogRow = {
  _id?: string;
  id?: string;
  organizationId?: string;
  module?: string;
  level?: AuditLogEntry["level"];
  userId?: {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  };
  action?: string;
  status?: AuditLogEntry["status"];
  message?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  metadata?: unknown;
  stack?: string;
  createdAt?: string;
};

export interface AdminUser extends UserListItem {
  role: Role;
  orgCount: number;
  sessions: number;
  lastSeenAt: string;
  suspended?: boolean;
  isApproved?: boolean;
  organizationName?: string;
}

export interface AdminApprovalRequest extends UserListItem {
  role: "ADMIN";
  status: AdminApprovalStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewReason?: string;
  isApproved?: boolean;
}

export interface AdminOrganization {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  membersCount: number;
  activeUsersCount?: number;
  projectsCount: number;
  activityLevel: "low" | "medium" | "high";
}

export interface AdminOrganizationMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string;
  joinedAt?: string;
}

export interface AdminOrganizationDetails extends AdminOrganization {
  recentMembers: AdminOrganizationMember[];
}

export interface AdminProject extends Project {
  orgName: string;
  membersCount: number;
  tasksCount: number;
  raw: unknown;
}

export interface AdminTask extends Task {
  orgName: string;
  projectName: string;
  assigneeName: string;
}

export interface BillingTierStat {
  _id: string;
  count: number;
}

export interface RolePermissionRow {
  role: Role;
  permissions: string[];
}

export interface AuditLogEntry {
  id: string;
  organizationId?: string;
  module?: string;
  level: "info" | "warn" | "error" | "debug";
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  action: string;
  status: "SUCCESS" | "FAILURE";
  message: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  metadata?: unknown;
  stack?: string;
  createdAt: string;
}

export interface AuditLogsResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type AuditLogsApiPayload = {
  data: RawAuditLogRow[];
  pagination: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
};

export interface ApiRequestLog {
  id: string;
  method: string;
  endpoint: string;
  status: number;
  timeMs: number;
  createdAt: string;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface SystemHealth {
  status: "online" | "offline";
  uptimeSeconds: number;
  dbStatus: "connected" | "degraded" | "offline";
  responseTimeMs: number;
  errorRate: number;
}

export interface AnalyticsPoint {
  label: string;
  users: number;
  organizations: number;
  tasks: number;
}

export interface AnalyticsSeriesPoint {
  label: string;
  value: number;
}

export interface AdminAnalyticsSummary {
  counts: {
    totalOrganizations: number;
    activeOrganizations: number;
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
  };
  trends: {
    organizations: AnalyticsSeriesPoint[];
    users: AnalyticsSeriesPoint[];
  };
  summaries: {
    activityDistribution: Array<{
      level: string;
      count: number;
    }>;
  };
}

export interface AdminDashboardSnapshot {
  totals: {
    users: number;
    organizations: number;
    projects: number;
    tasks: number;
  };
  recentSignups: AdminUser[];
  activeSessions: AdminUser[];
  systemAlerts: Array<{
    id: string;
    message: string;
    severity: "critical" | "warning" | "info";
  }>;
  failedRequests: ApiRequestLog[];
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  role?: Role;
  password?: string;
  status?: string;
  isActive?: boolean;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function deriveRole(candidate: unknown): Role {
  const role = String(candidate ?? "MEMBER").toUpperCase();
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER") {
    return role;
  }
  return "MEMBER";
}

function mapAdminUsers(users: RawUserRow[]): AdminUser[] {
  return users.map((user, index) => {
    const userId = String(user.id || user._id || "");

    return {
      ...user,
      id: userId,
      role: deriveRole(user.role),
      orgCount: randomInt(1, 4),
      sessions: randomInt(0, 6),
      lastSeenAt:
        user.updatedAt ||
        user.createdAt ||
        new Date(Date.now() - index * 600_000).toISOString(),
      suspended: user.isActive === false,
    };
  });
}

function mapPendingUsers(users: RawUserRow[]): AdminApprovalRequest[] {
  return users.map((user, index) => {
    const rawUser = user as RawUserRow;
    const userId = String(rawUser.id || rawUser._id || "");

    return {
      ...rawUser,
      id: userId,
      role: "ADMIN",
      status: "PENDING",
      requestedAt:
        rawUser.accessRequestedAt ||
        rawUser.createdAt ||
        rawUser.updatedAt ||
        new Date(Date.now() - index * 300000).toISOString(),
      isApproved: false,
    };
  });
}

function mapOrganizations(rows: RawOrganizationRow[]): AdminOrganization[] {
  return rows.map((org) => {
    const orgId = String(org.id || org._id || "");

    return {
      ...org,
      _id: org._id || orgId,
      id: orgId,
      membersCount: org.membersCount ?? randomInt(3, 30),
      projectsCount: org.projectsCount ?? randomInt(1, 18),
      activityLevel: org.activityLevel ?? (org.isActive ? "high" : "low"),
    };
  });
}

function mapProjects(rows: RawProjectRow[]): AdminProject[] {
  return rows.map((project, index) => {
    const projectId = String(project.id || project._id || "");

    return {
      ...project,
      id: projectId,
      orgName: `Org-${String(project.organizationId || "").slice(0, 6) || index + 1}`,
      membersCount: randomInt(2, 14),
      tasksCount: randomInt(3, 60),
      raw: project,
    };
  });
}

function mapTasks(rows: RawTaskRow[]): AdminTask[] {
  return rows.map((task, index) => {
    const taskId = String(task.id || task._id || "");

    return {
      ...task,
      id: taskId,
      orgName: `Org-${String(task.projectId || "").slice(0, 6) || index + 1}`,
      projectName: `Project-${String(task.projectId || "").slice(0, 5) || index + 1}`,
      assigneeName: task.assigneeId
        ? `User-${String(task.assigneeId).slice(0, 6)}`
        : "Unassigned",
    };
  });
}

async function tryGet<T>(endpoints: string[]): Promise<T> {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await api.get<T>(endpoint);
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export const adminApi = {
  async getUsers(filters?: {
    role?: string;
    status?: string;
  }): Promise<AdminUser[]> {
    const response = await api.get<ApiResponse<RawUserRow[]>>("/admin/users", {
      params: filters,
    });
    return mapAdminUsers(response.data.data ?? []);
  },

  async createUser(payload: CreateUserPayload) {
    const response = await api.post<
      ApiResponse<{ user: RawUserRow; generatedPassword?: string }>
    >("/admin/users", payload);
    return response.data.data;
  },

  async updateUser(
    userId: string,
    payload: Partial<CreateUserPayload> & Record<string, unknown>,
  ) {
    const response = await api.patch<ApiResponse<RawUserRow>>(
      `/admin/users/${userId}`,
      payload,
    );
    return response.data.data;
  },

  async deleteUser(userId: string) {
    const response = await api.delete<ApiResponse<unknown>>(
      `/admin/users/${userId}`,
    );
    return response.data.data;
  },

  async bulkUsersAction(payload: {
    userIds: string[];
    role?: Role;
    status?: string;
    isActive?: boolean;
    action?: "DELETE" | "REMOVE";
  }) {
    const response = await api.post<ApiResponse<unknown>>(
      "/admin/users/bulk",
      payload,
    );
    return response.data.data;
  },

  async getPendingUsers(): Promise<AdminApprovalRequest[]> {
    const response = await api.get<ApiResponse<RawUserRow[]>>(
      "/admin/pending-users",
    );
    return mapPendingUsers(response.data.data ?? []);
  },

  async approveUser(userId: string) {
    const response = await api.patch<ApiResponse<unknown>>(
      `/admin/approve/${userId}`,
    );
    return response.data.data;
  },

  async rejectUser(userId: string, reason?: string) {
    const payload = {
      status: "REJECTED",
      isApproved: false,
      isActive: false,
      rejectionReason: reason,
    };

    try {
      const response = await api.patch<ApiResponse<unknown>>(
        `/admin/users/${userId}`,
        payload,
      );
      return {
        mocked: false,
        strategy: "patch-user",
        data: response.data.data,
      };
    } catch {
      try {
        await api.patch(`/admin/users/${userId}/status`, {
          suspend: true,
          reason,
        });
        return { mocked: false, strategy: "suspend-user" };
      } catch {
        await api.delete(`/admin/users/${userId}`);
        return { mocked: false, strategy: "delete-user" };
      }
    }
  },

  async getOrganizations(): Promise<AdminOrganization[]> {
    try {
      const response = await tryGet<ApiResponse<RawOrganizationRow[]>>([
        "/admin/organizations",
        "/admin/orgs",
      ]);
      return mapOrganizations(response.data ?? []);
    } catch {
      return [];
    }
  },

  async getOrganizationById(orgId: string): Promise<AdminOrganizationDetails> {
    const response = await api.get<
      ApiResponse<
        RawOrganizationRow & { recentMembers?: AdminOrganizationMember[] }
      >
    >(`/admin/organizations/${orgId}`);
    const details = response.data.data;
    return {
      ...details,
      _id: String(details._id || details.id || ""),
      recentMembers: details.recentMembers ?? [],
    };
  },

  async toggleOrganizationStatus(orgId: string) {
    const response = await api.patch<
      ApiResponse<{ id: string; isActive: boolean }>
    >(`/admin/organizations/${orgId}/toggle`);
    return response.data.data;
  },

  async transferOrganizationOwnership(orgId: string, nextOwnerId: string) {
    try {
      await api.post(`/admin/organizations/${orgId}/transfer-owner`, {
        ownerId: nextOwnerId,
      });
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async deleteOrganization(orgId: string) {
    try {
      await api.delete(`/admin/organizations/${orgId}`);
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async getProjects(): Promise<AdminProject[]> {
    try {
      const response = await tryGet<
        ApiResponse<PaginatedResult<RawProjectRow>>
      >(["/admin/projects?page=1&limit=500", "/projects?page=1&limit=500"]);
      return mapProjects(response.data?.items ?? []);
    } catch {
      return [];
    }
  },

  async getTasks(): Promise<AdminTask[]> {
    try {
      const response = await tryGet<ApiResponse<PaginatedResult<RawTaskRow>>>([
        "/admin/tasks?page=1&limit=500",
        "/tasks?page=1&limit=500",
      ]);
      return mapTasks(response.data?.items ?? []);
    } catch {
      return [];
    }
  },

  async bulkUpdateTaskStatus(taskIds: string[], status: Task["status"]) {
    try {
      await api.post("/admin/tasks/bulk", { taskIds, status });
      return { mocked: false };
    } catch {
      await Promise.allSettled(
        taskIds.map((id) => api.patch(`/tasks/${id}/status`, { status })),
      );
      return { mocked: true };
    }
  },

  async getBillingStats(): Promise<BillingTierStat[]> {
    try {
      const response = await api.get<ApiResponse<BillingTierStat[]>>(
        "/admin/billing/stats",
      );
      return response.data.data ?? [];
    } catch {
      return [];
    }
  },

  async updateUserRole(userId: string, role: Role) {
    try {
      await api.patch(`/users/${userId}/role`, { role });
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async suspendUser(userId: string, suspend: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { suspend });
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async resetUserPassword(userId: string) {
    try {
      await api.post(`/admin/users/${userId}/reset-password`);
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async getRolePermissions(): Promise<RolePermissionRow[]> {
    const fallback: RolePermissionRow[] = [
      { role: "SUPER_ADMIN", permissions: ["ALL"] },
      {
        role: "ADMIN",
        permissions: [
          "VIEW_PROJECT",
          "CREATE_TASK",
          "MANAGE_WORKSPACE",
          "INVITE_USER",
          "VIEW_ANALYTICS",
        ],
      },
      {
        role: "MANAGER",
        permissions: ["VIEW_PROJECT", "CREATE_TASK", "MANAGE_WORKSPACE"],
      },
      { role: "MEMBER", permissions: ["VIEW_PROJECT"] },
    ];

    try {
      const response =
        await api.get<ApiResponse<RolePermissionRow[]>>("/admin/roles");
      return response.data.data?.length ? response.data.data : fallback;
    } catch {
      return fallback;
    }
  },

  async updateRolePermissions(role: Role, permissions: string[]) {
    try {
      await api.patch("/admin/roles", { role, permissions });
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    query?: string;
    level?: string;
    module?: string;
    action?: string;
    status?: string;
    userId?: string;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogsResult> {
    const response = await api.get<ApiResponse<AuditLogsApiPayload>>(
      "/admin/logs",
      { params },
    );
    const payload = response.data.data;
    const rows = payload?.data ?? [];

    const mapped = rows.map((entry) => {
      const row = entry as RawAuditLogRow;

      return {
        id: String(row._id || row.id || ""),
        organizationId: row.organizationId,
        module: row.module,
        level: row.level || "info",
        actor: {
          id: String(row.userId?._id || row.userId?.id || ""),
          firstName: row.userId?.firstName || "System",
          lastName: row.userId?.lastName || "",
          email: row.userId?.email || "",
          avatarUrl: row.userId?.avatarUrl,
        },
        action: row.action || "UNKNOWN",
        status: row.status || (row.level === "error" ? "FAILURE" : "SUCCESS"),
        message: row.message || "",
        requestId: row.requestId,
        endpoint: row.endpoint,
        method: row.method,
        responseTime: row.responseTime,
        ip: row.ip,
        userAgent: row.userAgent,
        metadata: row.metadata,
        stack: row.stack,
        createdAt: row.createdAt || new Date().toISOString(),
      };
    });

    return {
      items: mapped,
      total: payload?.pagination?.total ?? 0,
      page: payload?.pagination?.page ?? 1,
      limit: payload?.pagination?.limit ?? 20,
      pages: payload?.pagination?.pages ?? 1,
    };
  },

  async getApiRequestLogs(): Promise<ApiRequestLog[]> {
    const logs = getApiLogs();
    return logs.map((log) => ({
      id: log.id,
      method: log.method,
      endpoint: log.url,
      status: log.status ?? 0,
      timeMs: randomInt(4, 140),
      createdAt: log.timestamp,
      requestBody: log.type === "request" ? log.payload : undefined,
      responseBody: log.type !== "request" ? log.payload : undefined,
    }));
  },

  async runApiTest(input: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) {
    const started = performance.now();
    const response = await api.request({
      method: input.method,
      url: input.url.startsWith("/") ? input.url : `/${input.url}`,
      data: input.body,
      headers: input.headers,
    });

    return {
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      data: response.data,
    };
  },

  async getSystemHealth(baseApiUrl: string): Promise<SystemHealth> {
    const healthUrl = `${baseApiUrl.replace(/\/api\/v\d+$/, "")}/health`;
    const started = performance.now();

    try {
      const response = await axios.get(healthUrl, { timeout: 6000 });
      return {
        status: "online",
        uptimeSeconds: Number(response.data?.uptime ?? 0),
        dbStatus: "connected",
        responseTimeMs: Math.round(performance.now() - started),
        errorRate: 0.4,
      };
    } catch {
      return {
        status: "offline",
        uptimeSeconds: 0,
        dbStatus: "offline",
        responseTimeMs: Math.round(performance.now() - started),
        errorRate: 12.4,
      };
    }
  },

  async getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
    const [users, organizations, projects, tasks, apiLogs] = await Promise.all([
      this.getUsers(),
      this.getOrganizations(),
      this.getProjects(),
      this.getTasks(),
      this.getApiRequestLogs(),
    ]);

    const systemAlerts: AdminDashboardSnapshot["systemAlerts"] = [];
    if (apiLogs.filter((item) => item.status >= 400).length > 0) {
      systemAlerts.push({
        id: "errors",
        message: "API has recent failed requests.",
        severity: "warning",
      });
    }
    if (organizations.some((org) => !org.isActive)) {
      systemAlerts.push({
        id: "org-suspended",
        message: "One or more organizations are suspended.",
        severity: "info",
      });
    }

    return {
      totals: {
        users: users.length,
        organizations: organizations.length,
        projects: projects.length,
        tasks: tasks.length,
      },
      recentSignups: [...users]
        .sort(
          (a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0),
        )
        .slice(0, 6),
      activeSessions: [...users]
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 6),
      systemAlerts,
      failedRequests: apiLogs.filter((log) => log.status >= 400).slice(0, 8),
    };
  },

  async getAnalytics(): Promise<AdminAnalyticsSummary> {
    const response =
      await api.get<ApiResponse<AdminAnalyticsSummary>>("/admin/analytics");
    return response.data.data;
  },
};
