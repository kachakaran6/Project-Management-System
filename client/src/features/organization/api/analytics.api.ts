import { api } from "@/lib/api/axios-instance";

export interface UserAnalyticsSummary {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    lastLogin?: string;
    createdAt: string;
  };
  stats: {
    tasksCreated: number;
    tasksCompleted: number;
    tasksAssigned: number;
    totalLogins: number;
    avgSessionDurationMinutes: number;
    lastActiveAt: string;
  };
}

export interface UserActivity {
  id: string;
  action: string;
  entityType: string;
  entityName?: string;
  createdAt: string;
  metadata?: any;
}

export interface UserSession {
  id: string;
  loginAt: string;
  lastActiveAt?: string;
  durationMinutes: number;
  device: string;
  deviceType: string;
  ipAddress: string;
  isActive: boolean;
  expiresAt: string;
}

export const getUserAnalyticsSummary = async (userId: string) => {
  const response = await api.get(`/analytics/${userId}/summary`);
  return response.data;
};

export const getUserActivities = async (userId: string, params?: any) => {
  const response = await api.get(`/analytics/${userId}/activities`, { params });
  return response.data;
};

export const getUserSessions = async (userId: string, params?: any) => {
  const response = await api.get(`/analytics/${userId}/sessions`, { params });
  return response.data;
};
