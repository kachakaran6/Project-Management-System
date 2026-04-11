"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminUsersQuery,
  useUpdateUserRoleMutation,
  useApproveUserMutation,
} from "@/features/admin/hooks/use-admin";
import { toast } from "sonner";

const roles = ["SUPER_ADMIN", "ADMIN", "USER"] as const;

type Role = (typeof roles)[number];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const usersQuery = useAdminUsersQuery();
  const updateRole = useUpdateUserRoleMutation();
  const approveUser = useApproveUserMutation();

  const handleApprove = async (userId: string) => {
    try {
      await approveUser.mutateAsync(userId);
      toast.success("User approved successfully");
    } catch (error) {
      toast.error("Failed to approve user");
    }
  };

  const rows = useMemo(() => {
    const allUsers = usersQuery.data ?? [];
    const query = search.trim().toLowerCase();

    if (!query) return allUsers;

    return allUsers.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`
        .toLowerCase()
        .includes(query),
    );
  }, [usersQuery.data, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Search users and manage platform-wide access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin Approval</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[180px]">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {`${user.firstName} ${user.lastName}`.trim()}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "BANNED" ? "destructive" : "default"
                      }
                    >
                      {user.status === "BANNED" ? "Banned" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.isApproved ? "success" : "warning" as any}>
                          {user.isApproved ? "Approved" : "Pending Approval"}
                        </Badge>
                        {!user.isApproved && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs"
                            onClick={() => handleApprove(user.id)}
                            loading={approveUser.isPending}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role as Role}
                      onValueChange={(nextRole: Role) => {
                        updateRole.mutate({ userId: user.id, role: nextRole });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
