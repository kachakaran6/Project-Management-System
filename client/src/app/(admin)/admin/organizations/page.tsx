"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Eye, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useAdminOrganizationsQuery,
  useDeleteOrganizationMutation,
  useToggleOrganizationMutation,
} from "@/features/admin/hooks/use-admin";
import { cn } from "@/lib/utils";

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "DISABLED"
  >("ALL");
  const organizationsQuery = useAdminOrganizationsQuery();
  const toggleMutation = useToggleOrganizationMutation();
  const deleteMutation = useDeleteOrganizationMutation();

  const rows = useMemo(() => {
    const list = organizationsQuery.data ?? [];
    const query = search.trim().toLowerCase();

    return list.filter((org) => {
      const searchMatch =
        !query || `${org.name} ${org.slug}`.toLowerCase().includes(query);
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? org.isActive : !org.isActive);
      return searchMatch && statusMatch;
    });
  }, [organizationsQuery.data, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Organizations</h1>
        <p className="text-muted-foreground mt-1">
          Platform-wide organization governance and lifecycle controls.
        </p>
      </div>

      <Card className="border-none bg-surface/50 backdrop-blur-sm shadow-sm ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-base">Organization Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization name or slug"
              className="sm:max-w-sm"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as typeof statusFilter)
              }
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Active users</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-65">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-6 w-6 opacity-40" />
                      No organizations found
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {rows.map((org) => (
                <TableRow key={org._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{org.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {org.slug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{org.membersCount}</TableCell>
                  <TableCell>{org.activeUsersCount ?? 0}</TableCell>
                  <TableCell>{org.projectsCount}</TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? "success" : "warning"}>
                      {org.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/organizations/${org._id}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant={org.isActive ? "outline" : "secondary"}
                      onClick={() => toggleMutation.mutate(org._id)}
                      disabled={toggleMutation.isPending}
                    >
                      <Power className="mr-1 h-3.5 w-3.5" />
                      {org.isActive ? "Disable" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className={cn(
                        "h-8",
                        deleteMutation.isPending && "opacity-80",
                      )}
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Delete organization "${org.name}"? This action cannot be undone.`,
                        );
                        if (confirmed) deleteMutation.mutate(org._id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
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
