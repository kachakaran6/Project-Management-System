"use client";

import { useMemo, useState } from "react";
import { useParams } from "@/lib/next-navigation";
import { toast } from "sonner";
import {
  Copy,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/features/auth/hooks/use-auth";
import { type Role } from "@/types/organization.types";
import {
  organizationMembersApi,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
} from "@/features/organization/api/organization-members.api";
import {
  useInviteOrganizationMemberMutation,
  useOrganizationMembersQuery,
  useRemoveOrganizationMemberMutation,
  useResendOrganizationInviteMutation,
  useRevokeOrganizationInviteMutation,
  useUpdateOrganizationMemberRoleMutation,
} from "@/features/organization/hooks/use-organization-members";

function initials(firstName?: string, lastName?: string) {
  return (
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U"
  );
}

function formatCountdown(expiresAt: string) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours <= 0 && minutes <= 0) return "Expired";
  if (hours <= 0) return `${minutes}m remaining`;
  return `${hours}h ${minutes}m remaining`;
}

function statusBadge(
  status:
    | OrganizationInviteRecord["status"]
    | OrganizationMemberRecord["status"],
) {
  if (status === "ACCEPTED" || status === "ACTIVE") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
        Active
      </Badge>
    );
  }
  if (status === "PENDING") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        Invited
      </Badge>
    );
  }
  return <Badge variant="outline">Expired</Badge>;
}

function roleLabel(role: string) {
  return role === "ADMIN" ? "Admin" : "Member";
}

export default function OrganizationMembersPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { activeOrg, user } = useAuth();

  const { data, isLoading } = useOrganizationMembersQuery(orgId);
  const inviteMutation = useInviteOrganizationMemberMutation(orgId);
  const updateRoleMutation = useUpdateOrganizationMemberRoleMutation(orgId);
  const removeMemberMutation = useRemoveOrganizationMemberMutation(orgId);
  const resendInviteMutation = useResendOrganizationInviteMutation(orgId);
  const revokeInviteMutation = useRevokeOrganizationInviteMutation(orgId);

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState("");

  const currentOrg = activeOrg?.id === orgId ? activeOrg : null;
  const canManage =
    currentOrg?.role === "ADMIN" || currentOrg?.role === "SUPER_ADMIN";

  const members = data?.data.members ?? [];
  const invites = data?.data.invites ?? [];

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => {
      const haystack =
        `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [members, search]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required.");
      return;
    }

    try {
      const response = await inviteMutation.mutateAsync({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const token = response.data.token;
      const link = `${window.location.origin}/invite/${token}`;
      setGeneratedInviteLink(link);
      await navigator.clipboard.writeText(link);
      toast.success("Invite sent and link copied.");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
    } catch {
      toast.error("Failed to send invite.");
    }
  };

  const handleCopy = async (invite: OrganizationInviteRecord) => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(invite.id);
    toast.success("Invite link copied.");
    setTimeout(
      () =>
        setCopiedLink((current) => (current === invite.id ? null : current)),
      1500,
    );
  };

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only organization admins can manage members.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">
            Organization Members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage roles, invitations, and access for{" "}
            {currentOrg?.name ?? "this organization"}.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Invite Member
        </Button>
      </div>

      {generatedInviteLink ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">Invite link generated</p>
              <p className="text-xs text-muted-foreground break-all">
                {generatedInviteLink}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(generatedInviteLink)}
            >
              <Copy className="mr-2 size-4" />
              Copy Link
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members by name or email"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-muted/40" />
              <div className="h-12 rounded-lg bg-muted/40" />
              <div className="h-12 rounded-lg bg-muted/40" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>
                              {initials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Member since{" "}
                              {member.joinedAt
                                ? new Date(member.joinedAt).toLocaleDateString()
                                : "recently"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          disabled={
                            updateRoleMutation.isPending ||
                            member.id === user?.id
                          }
                          onValueChange={(value) =>
                            updateRoleMutation.mutate({
                              userId: member.id,
                              role: value as Role,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[110px] bg-background/50 border-white/5 text-[11px] font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{statusBadge(member.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={member.id === user?.id}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Invites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(invite.role)} •{" "}
                    {formatCountdown(invite.expiresAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    {statusBadge(invite.status)}
                    <Badge variant="outline" className="text-xs">
                      Token: {invite.token.slice(0, 8)}…
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(invite)}
                  >
                    <Copy className="mr-2 size-4" />
                    {copiedLink === invite.id ? "Copied" : "Copy Link"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resendInviteMutation.mutate(invite.id)}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Resend
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                  >
                    <UserX className="mr-2 size-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Send a secure invite link by email or copy it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Initial Role
              </label>
              <Select
                value={inviteRole}
                onValueChange={(value) =>
                  setInviteRole(value as "ADMIN" | "MEMBER")
                }
              >
                <SelectTrigger className="h-10 bg-background/50 border-white/5">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={inviteMutation.isPending}>
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

