"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  useToggleOrganizationMutation,
} from "@/features/admin/hooks/use-admin";

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const organizationsQuery = useAdminOrganizationsQuery();
  const toggleMutation = useToggleOrganizationMutation();

  const rows = useMemo(() => {
    const list = organizationsQuery.data ?? [];
    const query = search.trim().toLowerCase();

    if (!query) return list;

    return list.filter((org) =>
      `${org.name} ${org.slug}`.toLowerCase().includes(query),
    );
  }, [organizationsQuery.data, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          Organization Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Activate, deactivate, and audit organizations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by organization name or slug"
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner ID</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((org) => (
                <TableRow key={org._id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.slug}</TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? "success" : "warning"}>
                      {org.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {org.ownerId}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={org.isActive ? "outline" : "secondary"}
                      onClick={() => toggleMutation.mutate(org._id)}
                      disabled={toggleMutation.isPending}
                    >
                      {org.isActive ? "Disable" : "Enable"}
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
