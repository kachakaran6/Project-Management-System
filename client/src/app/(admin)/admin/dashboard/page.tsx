"use client";

import { AlertTriangle, ServerCrash, Users, UserCheck } from "lucide-react";

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
import { useAdminDashboardQuery } from "@/features/admin/hooks/use-admin";

export default function AdminDashboardPage() {
  const dashboardQuery = useAdminDashboardQuery();
  const snapshot = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Admin Control Center</h1>
        <p className="text-muted-foreground mt-1">
          Operational visibility for users, sessions, alerts, and API failures.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{snapshot?.totals.users ?? 0}</p>
            <Users className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Admins</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">
              {snapshot?.systemAlerts.find(a => a.id === "pending-admins") ? snapshot?.systemAlerts.find(a => a.id === "pending-admins")?.message.split(" ")[0] : 0}
            </p>
            <UserCheck className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{snapshot?.systemAlerts.length ?? 0}</p>
            <AlertTriangle className="size-5 text-warning" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Failed API Requests</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-semibold">{snapshot?.failedRequests.length ?? 0}</p>
            <ServerCrash className="size-5 text-destructive" />
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
                {(snapshot?.recentSignups ?? []).map((user: any) => (
                  <TableRow key={user.id || user._id}>
                    <TableCell>{`${user.firstName} ${user.lastName}`.trim()}</TableCell>
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
                {(snapshot?.activeSessions ?? []).map((user: any) => (
                  <TableRow key={user.id || user._id}>
                    <TableCell>{`${user.firstName} ${user.lastName}`.trim()}</TableCell>
                    <TableCell>{user.sessions}</TableCell>
                    <TableCell>{new Date(user.lastSeenAt).toLocaleString()}</TableCell>
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
