"use client";

import Link from "@/lib/next-link";
import { useParams } from "@/lib/next-navigation";
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Users,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminOrganizationDetailsQuery } from "@/features/admin/hooks/use-admin";

export default function AdminOrganizationDetailsPage() {
  const params = useParams<{ organizationId: string }>();
  const organizationId = params?.organizationId;
  const detailsQuery = useAdminOrganizationDetailsQuery(organizationId);
  const details = detailsQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-3">
            <Link href="/admin/organizations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to organizations
            </Link>
          </Button>
          <h1 className="font-heading text-3xl font-semibold">
            Organization Details
          </h1>
          <p className="text-muted-foreground mt-1">
            Full visibility into organization health, members, and activity
            footprint.
          </p>
        </div>
      </div>

      {details ? (
        <>
          <Card className="border-none bg-surface/50 backdrop-blur-sm shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="text-lg">{details.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                title="Created"
                value={new Date(details.createdAt).toLocaleDateString()}
                icon={Building2}
              />
              <Metric
                title="Total Members"
                value={String(details.membersCount)}
                icon={Users}
              />
              <Metric
                title="Active Users"
                value={String(details.activeUsersCount ?? 0)}
                icon={UserCheck}
              />
              <Metric
                title="Projects"
                value={String(details.projectsCount)}
                icon={FolderKanban}
              />
              <div className="sm:col-span-2 lg:col-span-4">
                <Badge variant={details.isActive ? "success" : "warning"}>
                  {details.isActive
                    ? "Active organization"
                    : "Disabled organization"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.recentMembers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {details.recentMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {[member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unknown User"}
                      </TableCell>
                      <TableCell>{member.email || "-"}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === "ACTIVE" ? "success" : "secondary"
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {detailsQuery.isLoading
              ? "Loading organization details..."
              : "Organization not found."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

