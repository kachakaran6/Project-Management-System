"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MoreHorizontal,
  UserPlus,
  Search,
  Filter,
  Trash2,
  ShieldAlert,
  UserMinus,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  UserCog,
  ChevronRight,
  Loader2,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

import { PermissionModal } from "@/features/team/components/permission-modal";
import {
  useTeamMembersQuery,
  useUpdateMemberRoleMutation,
  useUpdateMemberStatusMutation,
  useRemoveMemberMutation,
  useBulkActionMutation,
  useInviteMemberMutation,
} from "@/features/team/hooks/use-team-query";
import { TeamMember, TeamRole } from "@/features/team/api/team.api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";
import { PageHeader, FilterBar } from "@/components/layout/page-header";

const ROLES: TeamRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER"];

export default function TeamPage() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedMemberForPermissions, setSelectedMemberForPermissions] = useState<TeamMember | null>(null);

  // ─── API Hooks ──────────────────────────────────────────────────────────────
  const { data: members = [], isLoading, refetch: refetchMembers } = useTeamMembersQuery();
  const updateRole = useUpdateMemberRoleMutation();
  const updateStatus = useUpdateMemberStatusMutation();
  const removeMember = useRemoveMemberMutation();
  const bulkAction = useBulkActionMutation();
  const inviteMember = useInviteMemberMutation();
  const { user: currentUser, activeOrg } = useAuth();

  const userRole = (activeOrg?.role || currentUser?.role || "MEMBER") as TeamRole;
  const isOwner = userRole === "OWNER";
  const isAdmin = userRole === "ADMIN" || isOwner;

  // ─── Derived Data ──────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || m.role === roleFilter;
      const matchStatus = statusFilter === "ALL" || m.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleStatus = async (user: TeamMember) => {
    const nextStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await updateStatus.mutateAsync({ memberId: user.id, status: nextStatus });
      toast.success(`User ${nextStatus === "ACTIVE" ? "activated" : "disabled"}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleRoleChange = async (memberId: string, role: TeamRole) => {
    try {
      await updateRole.mutateAsync({ memberId, role });
      toast.success("Role updated successfully");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await removeMember.mutateAsync(userId);
      setConfirmDeleteId(null);
      toast.success("User deleted successfully");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleOpenPermissionModal = (user: TeamMember) => {
    setSelectedMemberForPermissions(user);
    setPermissionModalOpen(true);
  };

  const handlePermissionsUpdated = () => {
    refetchMembers();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const canManageUser = (target: TeamMember) => {
    if (isOwner) return true;
    if (isAdmin) {
      return target.role !== "OWNER";
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your organization's members, roles, and access controls."
        actions={
          isAdmin ? (
            <Button size="sm" className="h-9 px-4 font-medium gap-2" onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="size-4" />
              Invite Member
            </Button>
          ) : undefined
        }
      />

      <FilterBar>
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search members…"
            className="h-9 pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-sm gap-2 border-dashed">
                Bulk Actions ({selectedIds.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Modify Selected</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => bulkAction.mutate({ userIds: selectedIds, status: "ACTIVE" })}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Activate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkAction.mutate({ userIds: selectedIds, status: "DISABLED" })}>
                <XCircle className="mr-2 h-4 w-4 text-gray-500" /> Disable
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive font-medium focus:bg-destructive/10"
                onClick={() => bulkAction.mutate({ userIds: selectedIds, action: "REMOVE" })}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </FilterBar>

      {/* ─── Table ─────────────────────────────────────────────────────────── */}
      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-xl border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedIds.includes(user.id)}
                      onCheckedChange={() => toggleSelect(user.id)}
                    />
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="bg-primary/5 text-primary">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManageUser(user) && user.id !== currentUser?.id ? (
                      <Select
                        defaultValue={user.role}
                        onValueChange={(val) => handleRoleChange(user.id, val as TeamRole)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs border-none bg-transparent hover:bg-muted font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter(r => isOwner || r !== 'OWNER').map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {r.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="font-medium text-[10px] uppercase tracking-wider px-2">
                        {user.role.replace("_", " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.status === "ACTIVE"}
                        onCheckedChange={() => handleToggleStatus(user)}
                        disabled={!canManageUser(user) || user.id === currentUser?.id}
                      />
                      <Badge
                        variant={user.status === "ACTIVE" ? "success" : "outline"}
                        className={cn(
                          "text-[10px] font-bold px-1.5 h-4",
                          user.status === "DISABLED" && "bg-gray-100 text-gray-400"
                        )}
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                          <Eye className="mr-2 h-4 w-4 text-blue-500" />
                          View Profile
                        </DropdownMenuItem>
                        {(isOwner || isAdmin) && (
                          <DropdownMenuItem onClick={() => handleOpenPermissionModal(user)}>
                            <UserCog className="mr-2 h-4 w-4 text-orange-500" />
                            Manage Permissions
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                          {user.status === "ACTIVE" ? (
                            <><XCircle className="mr-2 h-4 w-4 text-gray-500" /> Disable User</>
                          ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Activate User</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDeleteId(user.id)}>
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 lg:hidden">
        {filteredUsers.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground">No members found</div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="bg-card border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 border shadow-sm">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground truncate">{user.firstName} {user.lastName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Role</span>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold">{user.role}</Badge>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Status</span>
                  <Badge variant={user.status === "ACTIVE" ? "success" : "outline"} className="text-[10px] uppercase font-bold">{user.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t">
                 <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>View</Button>
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="secondary" size="sm">Actions</Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenPermissionModal(user)}>Permissions</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDeleteId(user.id)}>Remove</DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Invitation Modal ─────────────────────────────────────────────── */}
      <InviteModal open={isInviteOpen} onOpenChange={setIsInviteOpen} onInvite={(payload) => inviteMember.mutateAsync(payload)} />

      {/* ─── Permission Modal ─────────────────────────────────────────────── */}
      {selectedMemberForPermissions && (
        <PermissionModal
          isOpen={permissionModalOpen}
          onClose={() => {
            setPermissionModalOpen(false);
            setSelectedMemberForPermissions(null);
          }}
          memberId={selectedMemberForPermissions.id}
          memberName={`${selectedMemberForPermissions.firstName} ${selectedMemberForPermissions.lastName}`}
          memberRole={selectedMemberForPermissions.role}
          onPermissionsUpdated={handlePermissionsUpdated}
        />
      )}

      {/* ─── User Details Sheet ───────────────────────────────────────────── */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="text-left border-b pb-6">
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>
              Detailed view of the team member activity and profile.
            </SheetDescription>
          </SheetHeader>
          {selectedUser && (
            <div className="py-6 space-y-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Avatar className="h-24 w-24 border-4 border-muted shadow-lg">
                  <AvatarImage src={selectedUser.avatarUrl} />
                  <AvatarFallback className="text-4xl">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p className="text-muted-foreground flex items-center gap-1 justify-center">
                    <Mail className="h-3 w-3" /> {selectedUser.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedUser.role}</Badge>
                  <Badge variant={selectedUser.status === "ACTIVE" ? "success" : "outline"}>{selectedUser.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Joined</p>
                  <p className="text-lg font-semibold mt-1">Jan 20, 2024</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Tasks Done</p>
                  <p className="text-lg font-semibold mt-1">128</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold px-1">Recent Activity</h4>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 text-sm p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Updated project "PMS Orbit"</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Security Confirmation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this user from the organization? This action will immediately revoke their access tokens and clear their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>
              Confim Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteModal({ open, onOpenChange, onInvite }: { open: boolean; onOpenChange: (o: boolean) => void, onInvite: (p: any) => Promise<any> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("MEMBER");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return toast.error("Please enter an email");
    setLoading(true);
    try {
      await onInvite({ email, role });
      toast.success("Invitation sent successfully");
      onOpenChange(false);
      setEmail("");
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to send invitation";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Initial Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrator</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
