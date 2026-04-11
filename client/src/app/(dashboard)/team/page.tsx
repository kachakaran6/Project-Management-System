"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useRemoveMemberMutation,
  useTeamMembersQuery,
  useUpdateMemberRoleMutation,
} from "@/features/team/hooks/use-team-query";

const roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER"] as const;

type Role = (typeof roles)[number];

export default function TeamPage() {
  const [search, setSearch] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const membersQuery = useTeamMembersQuery();
  const updateRole = useUpdateMemberRoleMutation();
  const removeMember = useRemoveMemberMutation();
  const { activeOrg } = useAuth();

  const canManage =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = membersQuery.data ?? [];

    if (!term) return all;

    return all.filter((member) =>
      `${member.firstName} ${member.lastName} ${member.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [membersQuery.data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage member roles and organization access.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/team/invite">Invite Member</Link>
          </Button>
        ) : null}
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search members"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 bg-card">Name</TableHead>
            <TableHead className="sticky top-0 bg-card">Email</TableHead>
            <TableHead className="sticky top-0 bg-card">Role</TableHead>
            <TableHead className="sticky top-0 bg-card">Status</TableHead>
            <TableHead className="sticky top-0 bg-card">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {`${member.firstName} ${member.lastName}`.trim()}
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                {canManage ? (
                  <Select
                    value={member.role}
                    onValueChange={async (nextRole: Role) => {
                      try {
                        await updateRole.mutateAsync({
                          memberId: member.id,
                          role: nextRole,
                        });
                        toast.success("Role updated");
                      } catch {
                        toast.error("Role update failed");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{member.role}</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    member.status === "ACTIVE"
                      ? "success"
                      : member.status === "SUSPENDED"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell>
                {canManage ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRemoveId(member.id)}
                  >
                    Remove
                  </Button>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={Boolean(removeId)}
        onOpenChange={(open) => !open && setRemoveId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              This action revokes member access from the current organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMember.isPending || !removeId}
              onClick={async () => {
                if (!removeId) return;
                try {
                  await removeMember.mutateAsync(removeId);
                  setRemoveId(null);
                  toast.success("Member removed");
                } catch {
                  toast.error("Failed to remove member");
                }
              }}
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
