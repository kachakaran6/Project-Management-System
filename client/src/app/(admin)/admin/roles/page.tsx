"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRolePermissionsQuery } from "@/features/admin/hooks/use-admin";

export default function AdminRolesPage() {
  const rolesQuery = useRolePermissionsQuery();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold">
          Role & Permission Matrix
        </h1>
        <p className="text-muted-foreground mt-1">
          Current role policy loaded by the admin control plane.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions by role</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rolesQuery.data ?? []).map((row) => (
                <TableRow key={row.role}>
                  <TableCell className="font-semibold">{row.role}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.permissions.join(", ")}
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
