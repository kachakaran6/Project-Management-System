import axios from "axios";

import { api } from "@/lib/api/axios-instance";
import { getApiLogs } from "@/lib/api/api-debug";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import { Project } from "@/types/project.types";
import { Task } from "@/types/task.types";
import { UserListItem } from "@/types/user.types";

type Role = "SUPER_ADMIN" | "ADMIN" | "USER";

export interface AdminUser extends UserListItem {
  role: Role;
  orgCount: number;
  sessions: number;
  lastSeenAt: string;
  suspended?: boolean;
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
  projectsCount: number;
  activityLevel: "low" | "medium" | "high";
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
  user: string;
  action: string;
  target: string;
  createdAt: string;
  metadata?: unknown;
}

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

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function deriveRole(candidate: unknown): Role {
  const role = String(candidate ?? "USER").toUpperCase();
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return role;
  }
  return "USER";
}

function mapAdminUsers(users: UserListItem[]): AdminUser[] {
  return users.map((user, index) => ({
    ...user,
    role: deriveRole((user as { role?: unknown }).role),
    orgCount: 0,
    sessions: 0,
    lastSeenAt:
      user.updatedAt ||
      user.createdAt ||
      new Date().toISOString(),
    suspended: user.status === "BANNED",
    isApproved: (user as any).isApproved,
  }));
}

function mapOrganizations(rows: AdminOrganization[]): AdminOrganization[] {
  return rows.map((org) => ({
    ...org,
    membersCount: org.membersCount ?? randomInt(3, 30),
    projectsCount: org.projectsCount ?? randomInt(1, 18),
    activityLevel: org.activityLevel ?? (org.isActive ? "high" : "low"),
  }));
}

function mapProjects(rows: Project[]): AdminProject[] {
  return rows.map((project, index) => ({
    ...project,
    orgName: `Org-${project.organizationId?.slice(0, 6) ?? index + 1}`,
    membersCount: randomInt(2, 14),
    tasksCount: randomInt(3, 60),
    raw: project,
  }));
}

function mapTasks(rows: Task[]): AdminTask[] {
  return rows.map((task, index) => ({
    ...task,
    orgName: `Org-${task.projectId?.slice(0, 6) ?? index + 1}`,
    projectName: `Project-${task.projectId?.slice(0, 5) ?? index + 1}`,
    assigneeName: task.assigneeId
      ? `User-${task.assigneeId.slice(0, 6)}`
      : "Unassigned",
  }));
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
  async getUsers(): Promise<AdminUser[]> {
    const response = await api.get<ApiResponse<UserListItem[]>>("/admin/users");
    return mapAdminUsers(response.data.data ?? []);
  },

  async getOrganizations(): Promise<AdminOrganization[]> {
    try {
      const response = await tryGet<ApiResponse<AdminOrganization[]>>([
        "/admin/orgs",
        "/admin/organizations",
      ]);
      return mapOrganizations(response.data ?? []);
    } catch {
      return [];
    }
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
      const response = await tryGet<ApiResponse<PaginatedResult<Project>>>([
        "/admin/projects?page=1&limit=500",
        "/projects?page=1&limit=500",
      ]);
      return mapProjects(response.data?.items ?? []);
    } catch {
      return [];
    }
  },

  async getTasks(): Promise<AdminTask[]> {
    try {
      const response = await tryGet<ApiResponse<PaginatedResult<Task>>>([
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

  async approveUser(userId: string) {
    const response = await api.patch<ApiResponse<any>>(`/admin/approve/${userId}`);
    return response.data.data;
  },

  async getRolePermissions(): Promise<RolePermissionRow[]> {
    const fallback: RolePermissionRow[] = [
      { role: "SUPER_ADMIN", permissions: ["ALL"] },
      {
        role: "ADMIN",
        permissions: [
          "VIEW_PROJECT",
          "CREATE_TASK",
          "MANAGE_PLATFORM",
        ],
      },
      { role: "USER", permissions: ["VIEW_PROJECT", "CREATE_TASK"] },
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

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const response =
        await api.get<ApiResponse<AuditLogEntry[]>>("/admin/logs");
      return (response.data.data ?? []).map((entry, index) => ({
        id: entry.id ?? `${index}`,
        user: entry.user ?? "system",
        action: entry.action ?? "UNKNOWN_ACTION",
        target: entry.target ?? "unknown",
        createdAt: entry.createdAt ?? new Date().toISOString(),
        metadata: entry.metadata,
      }));
    } catch {
      return getApiLogs()
        .slice(0, 200)
        .map((log) => ({
          id: log.id,
          user: "client",
          action: `${log.type.toUpperCase()}_${log.method}`,
          target: log.url,
          createdAt: log.timestamp,
          metadata: log.payload,
        }));
    }
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
    const statsResponse = await api.get<ApiResponse<any>>("/admin/dashboard");
    const stats = statsResponse.data.data;
    
    const [users, apiLogs] = await Promise.all([
      this.getUsers(),
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
    
    if (stats.pendingAdminRequests > 0) {
      systemAlerts.push({
        id: "pending-admins",
        message: `${stats.pendingAdminRequests} admin requests pending approval.`,
        severity: "info",
      });
    }

    return {
      totals: {
        users: stats.totalUsers,
        organizations: 0, // Org system deprecated in simplified flow
        projects: stats.totalProjects,
        tasks: stats.totalTasks,
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

  async getAnalytics(): Promise<AnalyticsPoint[]> {
    const [users, orgs, tasks] = await Promise.all([
      this.getUsers(),
      this.getOrganizations(),
      this.getTasks(),
    ]);

    return [
      {
        label: "W1",
        users: Math.max(0, users.length - 7),
        organizations: Math.max(0, orgs.length - 2),
        tasks: Math.max(0, tasks.length - 16),
      },
      {
        label: "W2",
        users: Math.max(0, users.length - 4),
        organizations: Math.max(0, orgs.length - 1),
        tasks: Math.max(0, tasks.length - 8),
      },
      {
        label: "W3",
        users: Math.max(0, users.length - 2),
        organizations: orgs.length,
        tasks: Math.max(0, tasks.length - 3),
      },
      {
        label: "W4",
        users: users.length,
        organizations: orgs.length,
        tasks: tasks.length,
      },
    ];
  },
};
