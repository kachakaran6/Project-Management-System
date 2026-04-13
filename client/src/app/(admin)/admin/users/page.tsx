"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  CircleAlert,
  Crown,
  Eye,
  Hammer,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
  Trash2,
  UserPlus,
  Users,
  UserRound,
  UserRoundCheck,
  UserRoundMinus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Role } from "@/types/user.types";
import {
  useAdminPendingRequestsQuery,
  useAdminTasksQuery,
  useAdminUsersQuery,
  useApproveAdminRequestMutation,
  useBulkUsersMutation,
  useCreateUserMutation,
  useDeleteUserMutation,
  useRejectAdminRequestMutation,
  useResetPasswordMutation,
  useUpdateUserMutation,
  useUpdateUserRoleMutation,
  useAuditLogsQuery,
} from "@/features/admin/hooks/use-admin";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { AdminApprovalRequest, AdminUser, AuditLogEntry } from "@/features/admin/api/admin.api";

const roleOptions: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER", "USER"];
const statusOptions = ["ALL", "ACTIVE", "SUSPENDED", "PENDING_APPROVAL", "INACTIVE"] as const;

type UserStatusFilter = (typeof statusOptions)[number];

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  password: string;
  status: string;
  isActive: boolean;
};

const emptyForm: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  role: "MEMBER",
  password: "",
  status: "ACTIVE",
  isActive: true,
};

function initials(user: AdminUser) {
  return `${user.firstName?.[0] ?? "U"}${user.lastName?.[0] ?? ""}`.toUpperCase();
}

function normalizeStatus(user: AdminUser) {
  if (user.isApproved === false || user.status === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (user.isActive === false || user.status === "SUSPENDED") return "SUSPENDED";
  if (user.status === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

function statusTone(status: UserStatusFilter | string) {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "SUSPENDED":
    case "INACTIVE":
      return "destructive";
    case "PENDING_APPROVAL":
      return "secondary";
    default:
      return "outline";
  }
}

function roleIcon(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return <Crown className="size-4" />;
    case "ADMIN":
      return <ShieldCheck className="size-4" />;
    case "MANAGER":
      return <Shield className="size-4" />;
    case "MEMBER":
      return <UserRound className="size-4" />;
    default:
      return <UserRound className="size-4" />;
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function UserFormDialog({
  open,
  title,
  description,
  submitLabel,
  initialValue,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  initialValue: UserFormState;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: UserFormState) => void;
}) {
  const [formState, setFormState] = useState<UserFormState>(initialValue);

  useEffect(() => {
    if (open) {
      setFormState(initialValue);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={formState.firstName}
              onChange={(event) =>
                setFormState((current) => ({ ...current, firstName: event.target.value }))
              }
              placeholder="Taylor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={formState.lastName}
              onChange={(event) =>
                setFormState((current) => ({ ...current, lastName: event.target.value }))
              }
              placeholder="Jordan"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="taylor@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formState.role}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, role: value as Role }))
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formState.status}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, status: value }))
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.filter((status) => status !== "ALL").map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              value={formState.password}
              onChange={(event) =>
                setFormState((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Leave blank to auto-generate"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Active account</p>
              <p className="text-xs text-muted-foreground">
                Turning this off suspends the login session.
              </p>
            </div>
            <Switch
              checked={formState.isActive}
              onCheckedChange={(checked) =>
                setFormState((current) => ({ ...current, isActive: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={() => onSubmit(formState)}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { user, activeOrg } = useAuth();

  const resolvedRole =
    user?.role === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : activeOrg?.role ?? user?.role;
  const isSuperAdmin = resolvedRole === "SUPER_ADMIN";

  if (!isSuperAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Super Admin access required</AlertTitle>
        <AlertDescription>
          This users control panel is only available to SUPER_ADMIN accounts.
        </AlertDescription>
      </Alert>
    );
  }

  const usersQuery = useAdminUsersQuery();
  const pendingQuery = useAdminPendingRequestsQuery();
  const tasksQuery = useAdminTasksQuery();
  const auditLogsQuery = useAuditLogsQuery();

  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();
  const bulkUsersMutation = useBulkUsersMutation();
  const resetPasswordMutation = useResetPasswordMutation();
  const approveRequestMutation = useApproveAdminRequestMutation();
  const rejectRequestMutation = useRejectAdminRequestMutation();
  const updateRoleMutation = useUpdateUserRoleMutation();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [bulkRole, setBulkRole] = useState<Role>("ADMIN");
  const [notice, setNotice] = useState<string | null>(null);

  const users = usersQuery.data ?? [];
  const pendingRequests = pendingQuery.data ?? [];
  const auditLogs: AuditLogEntry[] = auditLogsQuery.data?.items ?? [];
  const tasks = tasksQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        [user.firstName, user.lastName, user.email, user.organizationName, user.role]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" || normalizeStatus(user) === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.isActive !== false).length;
    const suspendedUsers = users.filter((user) => user.isActive === false).length;
    const pendingAdmins = pendingRequests.length;

    return [
      {
        label: "Total users",
        value: totalUsers,
        icon: <Users className="size-5" />,
        tone: "bg-primary/10 text-primary",
      },
      {
        label: "Active accounts",
        value: activeUsers,
        icon: <CheckCircle2 className="size-5" />,
        tone: "bg-emerald-500/10 text-emerald-600",
      },
      {
        label: "Suspended",
        value: suspendedUsers,
        icon: <ShieldAlert className="size-5" />,
        tone: "bg-amber-500/10 text-amber-600",
      },
      {
        label: "Pending admin requests",
        value: pendingAdmins,
        icon: <CircleAlert className="size-5" />,
        tone: "bg-rose-500/10 text-rose-600",
      },
    ];
  }, [pendingRequests.length, users]);

  useEffect(() => {
    if (selectedUserIds.length === 0) {
      setBulkRole("ADMIN");
    }
  }, [selectedUserIds.length]);

  useEffect(() => {
    if (notice) {
      const timeout = window.setTimeout(() => setNotice(null), 3500);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [notice]);

  function toggleSelected(userId: string, checked: boolean) {
    setSelectedUserIds((current) =>
      checked ? [...current, userId] : current.filter((id) => id !== userId),
    );
  }

  function clearSelection() {
    setSelectedUserIds([]);
  }

  function openDetails(userId: string) {
    setDrawerUserId(userId);
  }

  function prepareCreateForm(): UserFormState {
    return { ...emptyForm };
  }

  function prepareEditForm(user: AdminUser): UserFormState {
    return {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      role: user.role ?? "MEMBER",
      password: "",
      status: normalizeStatus(user),
      isActive: user.isActive !== false,
    };
  }

  async function submitCreateUser(value: UserFormState) {
    await createUserMutation.mutateAsync({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      role: value.role,
      password: value.password.trim() || undefined,
      status: value.status,
      isActive: value.isActive,
    });

    setCreateOpen(false);
    setNotice(`Created ${value.email.trim()}.`);
  }

  async function submitEditUser(value: UserFormState) {
    if (!editUser) return;

    await updateUserMutation.mutateAsync({
      userId: editUser.id,
      payload: {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        role: value.role,
        status: value.status,
        isActive: value.isActive,
        ...(value.password.trim() ? { password: value.password.trim() } : {}),
      },
    });

    setEditUser(null);
    setNotice(`Updated ${value.email.trim()}.`);
  }

  async function toggleUserStatus(user: AdminUser, nextActive: boolean) {
    await updateUserMutation.mutateAsync({
      userId: user.id,
      payload: {
        isActive: nextActive,
        status: nextActive ? "ACTIVE" : "SUSPENDED",
      },
    });
  }

  async function changeUserRole(user: AdminUser, role: Role) {
    await updateRoleMutation.mutateAsync({ userId: user.id, role });
    setNotice(`Changed ${user.email} to ${role}.`);
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    await deleteUserMutation.mutateAsync(user.id);
    setSelectedUserIds((current) => current.filter((id) => id !== user.id));
    setNotice(`Deleted ${user.email}.`);
  }

  async function bulkSuspendUsers(nextActive: boolean) {
    await bulkUsersMutation.mutateAsync({
      userIds: selectedUserIds,
      isActive: nextActive,
      status: nextActive ? "ACTIVE" : "SUSPENDED",
    });
    clearSelection();
    setNotice(nextActive ? "Activated selected users." : "Suspended selected users.");
  }

  async function bulkDeleteUsers() {
    if (!window.confirm(`Delete ${selectedUserIds.length} selected users?`)) return;
    await bulkUsersMutation.mutateAsync({ userIds: selectedUserIds, action: "DELETE" });
    clearSelection();
    setNotice("Deleted selected users.");
  }

  async function resetUserPassword(userId: string) {
    await resetPasswordMutation.mutateAsync(userId);
    setNotice("Password reset requested.");
  }

  const selectedUser = useMemo(
    () => users.find((user) => user.id === drawerUserId) ?? null,
    [drawerUserId, users],
  );

  const selectedUserAuditLogs = useMemo(() => {
    if (!selectedUser) return [];
    return auditLogs.filter((entry) => entry.actor.id === selectedUser.id);
  }, [auditLogs, selectedUser]);

  const selectedUserTasks = useMemo(() => {
    if (!selectedUser) return [];
    return tasks.filter(
      (task) => task.assigneeId === selectedUser.id || task.creatorId === selectedUser.id,
    );
  }, [selectedUser, tasks]);

  const pendingAdminRows = useMemo(() => {
    return pendingRequests.slice(0, 6);
  }, [pendingRequests]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-[0_18px_70px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.18),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-white/80">
              <ShieldCheck className="size-4" />
              Super Admin Control Panel
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Global user management for the platform.
            </h1>
            <p className="max-w-2xl text-sm text-white/70 sm:text-base">
              Review every account, approve admin requests, change access levels, suspend risky users,
              and keep the entire platform visible from one screen.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <UserPlus className="size-4" />
              Create user
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => usersQuery.refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="border-border/80 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
              </div>
              <div className={cn("rounded-2xl p-3", item.tone)}>{item.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader className="gap-4 border-b border-border/60">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Users</CardTitle>
                  <CardDescription>
                    Search, filter, select, and execute bulk actions across the global user directory.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | "ALL")}>
                    <SelectTrigger className="w-42.5">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All roles</SelectItem>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as UserStatusFilter)}>
                    <SelectTrigger className="w-45">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status === "ALL" ? "All status" : status.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, email, role, or organization"
                    className="pl-9"
                  />
                </div>
                <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                  <UserPlus className="size-4" />
                  New user
                </Button>
                <Button variant="outline" onClick={() => clearSelection()} disabled={!selectedUserIds.length}>
                  Clear selection
                </Button>
              </div>
            </CardHeader>

            {selectedUserIds.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-3">
                <p className="text-sm text-muted-foreground">
                  {selectedUserIds.length} user{selectedUserIds.length > 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={bulkRole} onValueChange={(value) => setBulkRole(value as Role)}>
                    <SelectTrigger className="w-42.5">
                      <SelectValue placeholder="Bulk role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={() => bulkUsersMutation.mutate({ userIds: selectedUserIds, role: bulkRole })}>
                    <ArrowRightLeft className="size-4" />
                    Apply role
                  </Button>
                  <Button variant="secondary" onClick={() => bulkSuspendUsers(false)}>
                    <ShieldAlert className="size-4" />
                    Suspend
                  </Button>
                  <Button variant="secondary" onClick={() => bulkSuspendUsers(true)}>
                    <ShieldCheck className="size-4" />
                    Activate
                  </Button>
                  <Button variant="destructive" onClick={bulkDeleteUsers}>
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : null}

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-230 text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4"> </th>
                      <th className="px-5 py-4">User</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Organization</th>
                      <th className="px-5 py-4">Sessions</th>
                      <th className="px-5 py-4">Last seen</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersQuery.isLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="border-t border-border/60">
                          <td className="px-5 py-4" colSpan={8}>
                            <Skeleton className="h-12 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : filteredUsers.length ? (
                      filteredUsers.map((user) => {
                        const status = normalizeStatus(user);
                        const selected = selectedUserIds.includes(user.id);

                        return (
                          <tr
                            key={user.id}
                            className={cn(
                              "border-t border-border/60 transition-colors hover:bg-muted/30",
                              selected && "bg-primary/5",
                            )}
                          >
                            <td className="px-5 py-4 align-middle">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => toggleSelected(user.id, Boolean(checked))}
                              />
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-10">
                                  <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                                  <AvatarFallback>{initials(user)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground">
                                      {`${user.firstName} ${user.lastName}`.trim() || "Unnamed user"}
                                    </p>
                                    {user.role === "SUPER_ADMIN" ? <Crown className="size-4 text-amber-500" /> : null}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                  {user.organizationName ? (
                                    <p className="text-xs text-muted-foreground">{user.organizationName}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <Select
                                value={user.role}
                                onValueChange={(value) => changeUserRole(user, value as Role)}
                              >
                                <SelectTrigger className="w-37.5">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptions.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      <span className="flex items-center gap-2">
                                        {roleIcon(role)}
                                        {role}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <Badge variant={statusTone(status)}>
                                {status.replaceAll("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-5 py-4 align-middle text-muted-foreground">
                              {user.organizationName || "—"}
                            </td>
                            <td className="px-5 py-4 align-middle text-muted-foreground">{user.sessions}</td>
                            <td className="px-5 py-4 align-middle text-muted-foreground">
                              {formatDate(user.lastSeenAt)}
                            </td>
                            <td className="px-5 py-4 align-middle text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Open user actions">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDetails(user.id)}>
                                    <Eye className="mr-2 size-4" />
                                    View details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditUser(user)}>
                                    <SquarePen className="mr-2 size-4" />
                                    Edit user
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => resetUserPassword(user.id)}>
                                    <Hammer className="mr-2 size-4" />
                                    Reset password
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => toggleUserStatus(user, ! (user.isActive !== false))}
                                  >
                                    {user.isActive === false ? (
                                      <ShieldCheck className="mr-2 size-4" />
                                    ) : (
                                      <UserRoundMinus className="mr-2 size-4" />
                                    )}
                                    {user.isActive === false ? "Activate" : "Suspend"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => deleteUser(user)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-t border-border/60">
                        <td className="px-5 py-16 text-center text-muted-foreground" colSpan={8}>
                          No users match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Pending admin requests
              </CardTitle>
              <CardDescription>Review requesters who want admin access before they appear in the platform queue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAdminRows.length ? (
                pendingAdminRows.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{`${request.firstName} ${request.lastName}`.trim()}</p>
                        <p className="text-sm text-muted-foreground">{request.email}</p>
                        <Badge variant="secondary" className="mt-2">
                          Requested {formatDate(request.requestedAt)}
                        </Badge>
                      </div>
                      <Badge variant="outline">ADMIN</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveRequestMutation.mutate(request.id)}
                        loading={approveRequestMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => rejectRequestMutation.mutate({ userId: request.id, reason: "Rejected from users console" })}
                        loading={rejectRequestMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No pending admin requests.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" />
                Recent system activity
              </CardTitle>
              <CardDescription>
                Latest account-level actions from the audit stream.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditLogs.slice(0, 5).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{entry.action}</p>
                    <Badge variant={entry.status === "SUCCESS" ? "default" : "destructive"}>
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.message || "No message recorded."}</p>
                </div>
              ))}
              {auditLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No activity has been captured yet.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Drawer open={Boolean(selectedUser)} onOpenChange={(open) => !open && setDrawerUserId(null)}>
        <DrawerContent side="right" className="max-w-xl overflow-y-auto">
          {selectedUser ? (
            <div className="space-y-6">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-3">
                  <Avatar className="size-11">
                    <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.email} />
                    <AvatarFallback>{initials(selectedUser)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{`${selectedUser.firstName} ${selectedUser.lastName}`.trim() || selectedUser.email}</p>
                    <p className="text-sm font-normal text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </DrawerTitle>
              </DrawerHeader>

              <div className="space-y-6 pt-2">
                <section className="space-y-4">
                  <h3 className="text-base font-semibold">Overview</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Role" value={selectedUser.role} />
                    <InfoTile label="Status" value={normalizeStatus(selectedUser).replaceAll("_", " ")} />
                    <InfoTile label="Organization" value={selectedUser.organizationName || "None"} />
                    <InfoTile label="Sessions" value={String(selectedUser.sessions)} />
                    <InfoTile label="Last seen" value={formatDate(selectedUser.lastSeenAt)} />
                    <InfoTile label="Created" value={formatDate(selectedUser.createdAt)} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setEditUser(selectedUser)}>
                      <SquarePen className="size-4" />
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => resetUserPassword(selectedUser.id)}>
                      <Hammer className="size-4" />
                      Reset password
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => toggleUserStatus(selectedUser, !(selectedUser.isActive !== false))}
                    >
                      {selectedUser.isActive === false ? <UserRoundCheck className="size-4" /> : <UserRoundMinus className="size-4" />}
                      {selectedUser.isActive === false ? "Activate" : "Suspend"}
                    </Button>
                    <Button variant="destructive" onClick={() => deleteUser(selectedUser)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold">Activity</h3>
                  {selectedUserAuditLogs.length ? (
                    selectedUserAuditLogs.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{entry.action}</p>
                          <Badge variant={entry.status === "SUCCESS" ? "default" : "destructive"}>
                            {entry.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{entry.message}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      No activity entries found for this user.
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold">Tasks</h3>
                  {selectedUserTasks.length ? (
                    selectedUserTasks.slice(0, 8).map((task) => (
                      <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{task.title}</p>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{task.description || "No description."}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      No related tasks were found.
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      <UserFormDialog
        open={createOpen}
        title="Create user"
        description="Provision a new account directly from the super-admin console."
        submitLabel="Create user"
        initialValue={prepareCreateForm()}
        loading={createUserMutation.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={submitCreateUser}
      />

      <UserFormDialog
        open={Boolean(editUser)}
        title="Edit user"
        description="Update account identity, role, and access state."
        submitLabel="Save changes"
        initialValue={editUser ? prepareEditForm(editUser) : prepareCreateForm()}
        loading={updateUserMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
        onSubmit={submitEditUser}
      />
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
