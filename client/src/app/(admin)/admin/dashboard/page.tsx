"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ServerCrash, Users, UserCheck } from "lucide-react";
import { Clock3, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminDashboardQuery,
  useAdminPendingRequestsQuery,
  useAnalyticsQuery,
} from "@/features/admin/hooks/use-admin";

const REVIEW_STORAGE_KEY = "admin-approval-workflow-v1";

type StoredReview = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt?: string;
};

function sameDay(value?: string, target = new Date()) {
  if (!value) return false;
  return new Date(value).toDateString() === target.toDateString();
}

export default function AdminDashboardPage() {
  const dashboardQuery = useAdminDashboardQuery();
  const pendingQuery = useAdminPendingRequestsQuery();
  const analyticsQuery = useAnalyticsQuery();
  const snapshot = dashboardQuery.data;
  const analytics = analyticsQuery.data;
  const [reviewHistory, setReviewHistory] = useState<StoredReview[]>([]);

  useEffect(() => {
    const readHistory = () => {
      try {
        const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
        setReviewHistory(raw ? (JSON.parse(raw) as StoredReview[]) : []);
      } catch {
        setReviewHistory([]);
      }
    };

    readHistory();

    const onStorage = (event: StorageEvent) => {
      if (event.key === REVIEW_STORAGE_KEY) {
        readHistory();
      }
    };

    window.addEventListener("storage", onStorage);
    const syncTimer = window.setInterval(readHistory, 4000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(syncTimer);
    };
  }, []);

  const pendingRequestsCount = pendingQuery.data?.length ?? 0;
  const approvedToday = useMemo(
    () =>
      reviewHistory.filter(
        (entry) => entry.status === "APPROVED" && sameDay(entry.reviewedAt),
      ).length,
    [reviewHistory],
  );
  const rejectedToday = useMemo(
    () =>
      reviewHistory.filter(
        (entry) => entry.status === "REJECTED" && sameDay(entry.reviewedAt),
      ).length,
    [reviewHistory],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          Admin Control Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Operational visibility for users, sessions, alerts, and API failures.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">
              {snapshot?.totals.users ?? 0}
            </p>
            <Users className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Active Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">
              {analytics?.counts.activeOrganizations ?? snapshot?.totals.organizations ?? 0}
            </p>
            <UserCheck className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">
              {analytics?.counts.activeUsers ?? 0}
            </p>
            <AlertTriangle className="size-5 text-warning" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Failed API Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">
              {snapshot?.failedRequests.length ?? 0}
            </p>
            <ServerCrash className="size-5 text-destructive" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pending Admin Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{pendingRequestsCount}</p>
            <Clock3 className="size-5 text-warning" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Approved Today
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{approvedToday}</p>
            <UserCheck className="size-5 text-success" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Rejected Today
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{rejectedToday}</p>
            <XCircle className="size-5 text-destructive" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent User Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(snapshot?.recentSignups ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {`${user.firstName} ${user.lastName}`.trim()}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(snapshot?.activeSessions ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {`${user.firstName} ${user.lastName}`.trim()}
                    </TableCell>
                    <TableCell>{user.sessions}</TableCell>
                    <TableCell>
                      {new Date(user.lastSeenAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
